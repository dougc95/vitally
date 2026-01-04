import { db } from "./db";
import { 
  patients, metrics, observations, observationComponents, goals, goalTargets,
  type Patient, type Metric, type Observation, type Goal,
  type CreateMeasurementRequest, type UpsertGoalRequest,
  type ObservationWithComponents, type GoalWithTargets
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Bootstrap / Registry
  getPatient(): Promise<Patient | undefined>;
  createPatient(patient: Partial<Patient>): Promise<Patient>;
  getMetrics(): Promise<Metric[]>;
  getMetric(code: string): Promise<Metric | undefined>;
  seedMetrics(metricsList: Metric[]): Promise<void>;

  // Measurements
  createMeasurement(data: CreateMeasurementRequest, patientId: number): Promise<{ observationId: number, count: number }>;
  getLatestObservation(patientId: number): Promise<ObservationWithComponents | undefined>;
  getObservations(patientId: number, from?: string, to?: string): Promise<ObservationWithComponents[]>;
  getMetricTimeseries(patientId: number, metricCode: string, from?: string, to?: string): Promise<{ date: string, value: number }[]>;

  // Goals
  getGoal(patientId: number, month: string): Promise<GoalWithTargets | undefined>;
  upsertGoal(data: UpsertGoalRequest, patientId: number): Promise<Goal>;
  
  // Progress Helper
  getLatestMetricValueInMonth(patientId: number, metricCode: string, monthStart: string, monthEnd: string): Promise<number | undefined>;
}

export class DatabaseStorage implements IStorage {
  // === PATIENT & METRICS ===
  async getPatient(): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).limit(1);
    return patient;
  }

  async createPatient(data: Partial<Patient>): Promise<Patient> {
    const [patient] = await db.insert(patients).values({
      displayName: data.displayName || "User", 
      heightCm: data.heightCm
    }).returning();
    return patient;
  }

  async getMetrics(): Promise<Metric[]> {
    return await db.select().from(metrics);
  }

  async getMetric(code: string): Promise<Metric | undefined> {
    const [metric] = await db.select().from(metrics).where(eq(metrics.code, code));
    return metric;
  }

  async seedMetrics(metricsList: Metric[]): Promise<void> {
    // Upsert metrics
    for (const m of metricsList) {
      await db.insert(metrics).values(m)
        .onConflictDoUpdate({ target: metrics.code, set: m });
    }
  }

  // === MEASUREMENTS ===
  async createMeasurement(data: CreateMeasurementRequest, patientId: number): Promise<{ observationId: number, count: number }> {
    return await db.transaction(async (tx) => {
      // 1. Create Observation
      const [observation] = await tx.insert(observations).values({
        patientId,
        effectiveDate: data.date,
        note: data.note,
        status: "final",
        category: "vital-signs",
      }).returning();

      // 2. Create Components
      let count = 0;
      const metricCodes = Object.keys(data.metrics);
      
      for (const code of metricCodes) {
        const val = data.metrics[code];
        // Get unit from registry (assumed seeded)
        // In a real app we might cache this or join, but single user MVP is fine to query or assume
        // We'll trust the registry has it or default to empty string if missing (should be validated upstream)
        const metric = await tx.select().from(metrics).where(eq(metrics.code, code)).limit(1);
        const unit = metric[0]?.unit || "";

        await tx.insert(observationComponents).values({
          observationId: observation.id,
          metricCode: code,
          value: val,
          unit: unit,
        });
        count++;
      }

      return { observationId: observation.id, count };
    });
  }

  async getLatestObservation(patientId: number): Promise<ObservationWithComponents | undefined> {
    // Find latest effective date
    const [latestObs] = await db.select()
      .from(observations)
      .where(eq(observations.patientId, patientId))
      .orderBy(desc(observations.effectiveDate), desc(observations.issuedAt))
      .limit(1);

    if (!latestObs) return undefined;

    const components = await db.query.observationComponents.findMany({
      where: eq(observationComponents.observationId, latestObs.id),
      with: { metric: true }
    });

    return { ...latestObs, components };
  }

  async getObservations(patientId: number, from?: string, to?: string): Promise<ObservationWithComponents[]> {
    const conditions = [eq(observations.patientId, patientId)];
    if (from) conditions.push(gte(observations.effectiveDate, from));
    if (to) conditions.push(lte(observations.effectiveDate, to));

    const obsList = await db.query.observations.findMany({
      where: and(...conditions),
      orderBy: [desc(observations.effectiveDate)],
      with: {
        components: {
          with: { metric: true }
        }
      }
    });
    return obsList;
  }

  async getMetricTimeseries(patientId: number, metricCode: string, from?: string, to?: string): Promise<{ date: string, value: number }[]> {
    // Join observation_components -> observations
    const conditions = [
      eq(observations.patientId, patientId),
      eq(observationComponents.metricCode, metricCode)
    ];
    if (from) conditions.push(gte(observations.effectiveDate, from));
    if (to) conditions.push(lte(observations.effectiveDate, to));

    const results = await db.select({
      date: observations.effectiveDate,
      value: observationComponents.value
    })
    .from(observationComponents)
    .innerJoin(observations, eq(observations.id, observationComponents.observationId))
    .where(and(...conditions))
    .orderBy(observations.effectiveDate);

    // Convert date to string if needed (Drizzle returns string for date type usually)
    return results.map(r => ({ ...r, date: r.date.toString() }));
  }

  // === GOALS ===
  async getGoal(patientId: number, month: string): Promise<GoalWithTargets | undefined> {
    // Month is YYYY-MM. We store monthStart and monthEnd.
    const monthStart = `${month}-01`;
    
    const [goal] = await db.query.goals.findMany({
      where: and(
        eq(goals.patientId, patientId),
        eq(goals.monthStart, monthStart)
      ),
      limit: 1,
      with: {
        targets: {
          with: { metric: true }
        }
      }
    });

    return goal;
  }

  async upsertGoal(data: UpsertGoalRequest, patientId: number): Promise<Goal> {
    return await db.transaction(async (tx) => {
      const monthStart = `${data.month}-01`;
      // Simple logic: assume end of month (not strictly critical for MVP query logic but good for data)
      const dateObj = new Date(data.month);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1; // 1-12
      // Last day of month
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${data.month}-${lastDay}`;

      // Check existing
      let [goal] = await tx.select().from(goals).where(and(
        eq(goals.patientId, patientId),
        eq(goals.monthStart, monthStart)
      ));

      if (!goal) {
        [goal] = await tx.insert(goals).values({
          patientId,
          monthStart,
          monthEnd,
          lifecycleStatus: "active"
        }).returning();
      }

      // Handle Targets: Delete all existing for this goal and re-insert (simple replacement strategy)
      await tx.delete(goalTargets).where(eq(goalTargets.goalId, goal.id));

      for (const t of data.targets) {
         // Get unit
         const [metric] = await tx.select().from(metrics).where(eq(metrics.code, t.metricCode));
         if (!metric) continue; // Skip unknown metrics

         await tx.insert(goalTargets).values({
           goalId: goal.id,
           metricCode: t.metricCode,
           targetValue: t.targetValue,
           unit: metric.unit,
           direction: t.direction || metric.defaultDirection,
           tolerance: t.tolerance || metric.defaultTolerance,
         });
      }

      return goal;
    });
  }

  async getLatestMetricValueInMonth(patientId: number, metricCode: string, monthStart: string, monthEnd: string): Promise<number | undefined> {
    // Get the latest value strictly within this month
    const [result] = await db.select({
      value: observationComponents.value
    })
    .from(observationComponents)
    .innerJoin(observations, eq(observations.id, observationComponents.observationId))
    .where(and(
      eq(observations.patientId, patientId),
      eq(observationComponents.metricCode, metricCode),
      gte(observations.effectiveDate, monthStart),
      lte(observations.effectiveDate, monthEnd)
    ))
    .orderBy(desc(observations.effectiveDate), desc(observations.issuedAt))
    .limit(1);

    return result?.value;
  }
}

export const storage = new DatabaseStorage();
