import { db } from "./db";
import {
  patients,
  metrics,
  observations,
  observationComponents,
  goals,
  goalTargets,
  type Patient,
  type Metric,
  type Observation,
  type Goal,
  type CreateMeasurementRequest,
  type UpsertGoalRequest,
  type ObservationWithComponents,
  type GoalWithTargets,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { UnauthorizedError } from "./errors";

export interface IStorage {
  // Patient Registry
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  createPatient(patient: Partial<Patient>): Promise<Patient>;
  getMetrics(): Promise<Metric[]>;
  getMetric(code: string): Promise<Metric | undefined>;
  seedMetrics(metricsList: Metric[]): Promise<void>;

  // Measurements (with userId for ownership verification)
  createMeasurement(
    data: CreateMeasurementRequest,
    patientId: number,
    userId: string
  ): Promise<{ observationId: number; count: number }>;
  getLatestObservation(
    patientId: number,
    userId: string
  ): Promise<ObservationWithComponents | undefined>;
  getObservations(
    patientId: number,
    from?: string,
    to?: string,
    userId?: string
  ): Promise<ObservationWithComponents[]>;
  getMetricTimeseries(
    patientId: number,
    metricCode: string,
    from?: string,
    to?: string,
    userId?: string
  ): Promise<{ date: string; value: number }[]>;

  // Goals (with userId for ownership verification)
  getGoal(
    patientId: number,
    month: string,
    userId: string
  ): Promise<GoalWithTargets | undefined>;
  upsertGoal(
    data: UpsertGoalRequest,
    patientId: number,
    userId: string
  ): Promise<Goal>;

  // Progress Helper (with userId for ownership verification)
  getLatestMetricValueInMonth(
    patientId: number,
    metricCode: string,
    monthStart: string,
    monthEnd: string,
    userId: string
  ): Promise<number | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Helper to verify patient ownership
  private async verifyOwnership(
    patientId: number,
    userId: string
  ): Promise<Patient> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId));
    if (!patient) {
      throw new UnauthorizedError("Patient not found");
    }
    if (patient.userId !== userId) {
      throw new UnauthorizedError(
        "Access denied: patient does not belong to user"
      );
    }
    return patient;
  }

  // === PATIENT & METRICS ===
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id));
    return patient;
  }

  async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, userId));
    return patient;
  }

  async createPatient(data: Partial<Patient>): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values({
        userId: data.userId!,
        displayName: data.displayName || "User",
        heightCm: data.heightCm,
      })
      .returning();
    return patient;
  }

  async getMetrics(): Promise<Metric[]> {
    return await db.select().from(metrics);
  }

  async getMetric(code: string): Promise<Metric | undefined> {
    const [metric] = await db
      .select()
      .from(metrics)
      .where(eq(metrics.code, code));
    return metric;
  }

  async seedMetrics(metricsList: Metric[]): Promise<void> {
    for (const m of metricsList) {
      await db
        .insert(metrics)
        .values(m)
        .onConflictDoUpdate({ target: metrics.code, set: m });
    }
  }

  // === MEASUREMENTS ===
  async createMeasurement(
    data: CreateMeasurementRequest,
    patientId: number,
    userId: string
  ): Promise<{ observationId: number; count: number }> {
    // Verify ownership before creating measurement
    await this.verifyOwnership(patientId, userId);

    return await db.transaction(async (tx) => {
      const [observation] = await tx
        .insert(observations)
        .values({
          patientId,
          effectiveAt: data.date ? new Date(data.date) : new Date(), // Use timestamp
          note: data.note,
          status: "final",
          category: "vital-signs",
        })
        .returning();

      let count = 0;
      for (const code of Object.keys(data.metrics)) {
        const val = data.metrics[code];
        const metric = await tx
          .select()
          .from(metrics)
          .where(eq(metrics.code, code))
          .limit(1);
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

  async getLatestObservation(
    patientId: number,
    userId: string
  ): Promise<ObservationWithComponents | undefined> {
    // Verify ownership before fetching
    await this.verifyOwnership(patientId, userId);

    const [latestObs] = await db
      .select()
      .from(observations)
      .where(eq(observations.patientId, patientId))
      .orderBy(desc(observations.effectiveAt), desc(observations.issuedAt))
      .limit(1);

    if (!latestObs) return undefined;

    const components = await db.query.observationComponents.findMany({
      where: eq(observationComponents.observationId, latestObs.id),
      with: { metric: true },
    });

    return { ...latestObs, components };
  }

  async getObservations(
    patientId: number,
    from?: string,
    to?: string,
    userId?: string
  ): Promise<ObservationWithComponents[]> {
    // Verify ownership if userId provided
    if (userId) {
      await this.verifyOwnership(patientId, userId);
    }

    const conditions = [eq(observations.patientId, patientId)];
    if (from) conditions.push(gte(observations.effectiveAt, new Date(from)));
    if (to) conditions.push(lte(observations.effectiveAt, new Date(to)));

    const obsList = await db.query.observations.findMany({
      where: and(...conditions),
      orderBy: [desc(observations.effectiveAt)],
      with: {
        components: {
          with: { metric: true },
        },
      },
    });
    return obsList;
  }

  async getMetricTimeseries(
    patientId: number,
    metricCode: string,
    from?: string,
    to?: string,
    userId?: string
  ): Promise<{ date: string; value: number }[]> {
    // Verify ownership if userId provided
    if (userId) {
      await this.verifyOwnership(patientId, userId);
    }

    const conditions = [
      eq(observations.patientId, patientId),
      eq(observationComponents.metricCode, metricCode),
    ];
    if (from) conditions.push(gte(observations.effectiveAt, new Date(from)));
    if (to) conditions.push(lte(observations.effectiveAt, new Date(to)));

    const results = await db
      .select({
        date: observations.effectiveAt,
        value: observationComponents.value,
      })
      .from(observationComponents)
      .innerJoin(
        observations,
        eq(observations.id, observationComponents.observationId)
      )
      .where(and(...conditions))
      .orderBy(observations.effectiveAt);

    return results.map((r) => ({ ...r, date: r.date.toISOString() }));
  }

  // === GOALS ===
  async getGoal(
    patientId: number,
    month: string,
    userId: string
  ): Promise<GoalWithTargets | undefined> {
    // Verify ownership before fetching goal
    await this.verifyOwnership(patientId, userId);

    const monthStart = `${month}-01`;
    const [goal] = await db.query.goals.findMany({
      where: and(
        eq(goals.patientId, patientId),
        eq(goals.monthStart, monthStart)
      ),
      limit: 1,
      with: { targets: { with: { metric: true } } },
    });
    return goal;
  }

  async upsertGoal(
    data: UpsertGoalRequest,
    patientId: number,
    userId: string
  ): Promise<Goal> {
    // Verify ownership before upserting goal
    await this.verifyOwnership(patientId, userId);

    return await db.transaction(async (tx) => {
      const monthStart = `${data.month}-01`;
      const dateObj = new Date(data.month);
      const monthEnd = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        0
      )
        .toISOString()
        .split("T")[0];

      let [goal] = await tx
        .select()
        .from(goals)
        .where(
          and(eq(goals.patientId, patientId), eq(goals.monthStart, monthStart))
        );

      if (!goal) {
        [goal] = await tx
          .insert(goals)
          .values({
            patientId,
            monthStart,
            monthEnd,
            lifecycleStatus: "active",
          })
          .returning();
      }

      await tx.delete(goalTargets).where(eq(goalTargets.goalId, goal.id));

      for (const t of data.targets) {
        const [metric] = await tx
          .select()
          .from(metrics)
          .where(eq(metrics.code, t.metricCode));
        if (!metric) continue;
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

  async getLatestMetricValueInMonth(
    patientId: number,
    metricCode: string,
    monthStart: string,
    monthEnd: string,
    userId: string
  ): Promise<number | undefined> {
    // Verify ownership before fetching metric value
    await this.verifyOwnership(patientId, userId);

    const [result] = await db
      .select({ value: observationComponents.value })
      .from(observationComponents)
      .innerJoin(
        observations,
        eq(observations.id, observationComponents.observationId)
      )
      .where(
        and(
          eq(observations.patientId, patientId),
          eq(observationComponents.metricCode, metricCode),
          gte(observations.effectiveAt, new Date(monthStart)),
          lte(observations.effectiveAt, new Date(monthEnd))
        )
      )
      .orderBy(desc(observations.effectiveAt), desc(observations.issuedAt))
      .limit(1);
    return result?.value;
  }
}

export const storage = new DatabaseStorage();
