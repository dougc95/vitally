import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Metric } from "@shared/schema";

// Seed Data
const DEFAULT_METRICS: Metric[] = [
  // Weights
  { code: "weight", displayName: "Weight", unit: "kg", kind: "weight", defaultDirection: "decrease", defaultTolerance: 0.5 },
  
  // Circumferences
  { code: "waist", displayName: "Waist", unit: "cm", kind: "circumference", defaultDirection: "decrease", defaultTolerance: 0.5 },
  { code: "hips", displayName: "Hips", unit: "cm", kind: "circumference", defaultDirection: "decrease", defaultTolerance: 0.5 },
  { code: "chest", displayName: "Chest", unit: "cm", kind: "circumference", defaultDirection: "increase", defaultTolerance: 0.5 },
  { code: "shoulders", displayName: "Shoulders", unit: "cm", kind: "circumference", defaultDirection: "increase", defaultTolerance: 0.5 },
  { code: "thigh_r", displayName: "Thigh (R)", unit: "cm", kind: "circumference", defaultDirection: "increase", defaultTolerance: 0.5 },
  { code: "thigh_l", displayName: "Thigh (L)", unit: "cm", kind: "circumference", defaultDirection: "increase", defaultTolerance: 0.5 },
  { code: "bicep_r", displayName: "Bicep (R)", unit: "cm", kind: "circumference", defaultDirection: "increase", defaultTolerance: 0.5 },
  { code: "bicep_l", displayName: "Bicep (L)", unit: "cm", kind: "circumference", defaultDirection: "increase", defaultTolerance: 0.5 },
  
  // Ratios (Derived - stored as values for MVP simplicity, or just computed on fly. 
  // For MVP we won't store ratios, we'll compute them in frontend or "progress" endpoint if needed.
  // Including them here just in case we want to allow manual tracking or target setting.)
  { code: "body_fat", displayName: "Body Fat %", unit: "%", kind: "composition", defaultDirection: "decrease", defaultTolerance: 0.5 },
];

async function seedDatabase() {
  // Ensure Patient exists
  const patient = await storage.getPatient();
  if (!patient) {
    await storage.createPatient({ displayName: "Me", heightCm: 175 });
    console.log("Seeded default patient");
  }

  // Ensure Metrics exist
  await storage.seedMetrics(DEFAULT_METRICS);
  console.log("Seeded metrics registry");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Initial seed
  await seedDatabase();

  // Helper to get patient ID (MVP single user)
  async function getPatientId() {
    const patient = await storage.getPatient();
    return patient!.id;
  }

  // --- API ROUTES ---

  app.get(api.bootstrap.get.path, async (_req, res) => {
    const patient = await storage.getPatient();
    const metrics = await storage.getMetrics();
    res.json({ patient: patient!, metrics });
  });

  app.post(api.measurements.create.path, async (req, res) => {
    try {
      const input = api.measurements.create.input.parse(req.body);
      const patientId = await getPatientId();
      
      // Validate metric codes
      const validMetrics = await storage.getMetrics();
      const validCodes = new Set(validMetrics.map(m => m.code));
      
      for (const code of Object.keys(input.metrics)) {
        if (!validCodes.has(code)) {
           return res.status(400).json({ message: `Unknown metric code: ${code}` });
        }
      }

      const result = await storage.createMeasurement(input, patientId);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(api.measurements.latest.path, async (_req, res) => {
    const patientId = await getPatientId();
    const latest = await storage.getLatestObservation(patientId);
    res.json(latest || null); // Return null if no data
  });

  app.get(api.measurements.list.path, async (req, res) => {
    const patientId = await getPatientId();
    const { from, to } = req.query as { from?: string, to?: string };
    const list = await storage.getObservations(patientId, from, to);
    res.json(list);
  });

  app.get(api.metrics.timeseries.path, async (req, res) => {
    const patientId = await getPatientId();
    const { code } = req.params;
    const { from, to } = req.query as { from?: string, to?: string };
    
    // Validate code
    const metric = await storage.getMetric(code);
    if (!metric) return res.status(404).json({ message: "Metric not found" });

    const data = await storage.getMetricTimeseries(patientId, code, from, to);
    res.json(data);
  });

  app.get(api.goals.get.path, async (req, res) => {
    const patientId = await getPatientId();
    const month = req.query.month as string;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const goal = await storage.getGoal(patientId, month);
    res.json(goal || null);
  });

  app.put(api.goals.upsert.path, async (req, res) => {
    try {
      const input = api.goals.upsert.input.parse(req.body);
      const patientId = await getPatientId();
      const goal = await storage.upsertGoal(input, patientId);
      res.json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.goals.progress.path, async (req, res) => {
    const patientId = await getPatientId();
    const month = req.query.month as string;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const monthStart = `${month}-01`;
    // Simple end of month calc
    const d = new Date(month);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const monthEnd = `${month}-${lastDay}`;

    // 1. Get Goal and Targets
    const goal = await storage.getGoal(patientId, month);
    
    // 2. Get all metrics to list even those without targets? 
    // PRD: "Progress computation: For each goal metric..." 
    // We will list all metrics that have targets, OR all metrics in registry?
    // Let's stick to showing progress for things that HAVE targets for now, 
    // or maybe common metrics. PRD says "Goals page: target input + table of progress".
    // Let's return the list of targets with their statuses.
    
    if (!goal) {
      return res.json([]);
    }

    const report = [];
    for (const target of goal.targets) {
      // Get latest value in this month
      const currentVal = await storage.getLatestMetricValueInMonth(patientId, target.metricCode, monthStart, monthEnd);
      
      let status: "on-track" | "off-track" | "no-data" | "no-target" = "no-data";
      let delta: number | null = null;

      if (currentVal !== undefined && currentVal !== null) {
        delta = currentVal - target.targetValue;
        const absDelta = Math.abs(delta);
        const tolerance = target.tolerance || 0;

        // Direction logic
        // If direction = increase, we want current >= target (or close to it)
        // If direction = decrease, we want current <= target
        // If direction = maintain, we want current within target +/- tolerance

        if (target.direction === "maintain") {
           status = absDelta <= tolerance ? "on-track" : "off-track";
        } else if (target.direction === "increase") {
           // On track if we met or exceeded target, OR if we are within tolerance below it?
           // Usually "increase" means we want to reach at least X. 
           // If current >= target, great.
           if (currentVal >= target.targetValue - tolerance) status = "on-track";
           else status = "off-track";
        } else if (target.direction === "decrease") {
           // We want to be at or below target
           if (currentVal <= target.targetValue + tolerance) status = "on-track";
           else status = "off-track";
        }
      }

      report.push({
        metricCode: target.metricCode,
        metricName: target.metric.displayName,
        currentValue: currentVal || null,
        targetValue: target.targetValue,
        unit: target.unit,
        status,
        delta: delta,
        direction: target.direction || undefined
      });
    }

    res.json(report);
  });

  return httpServer;
}
