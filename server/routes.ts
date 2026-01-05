import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Metric } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

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
  
  // Body Fat
  { code: "body_fat", displayName: "Body Fat %", unit: "%", kind: "composition", defaultDirection: "decrease", defaultTolerance: 0.5 },
];

async function seedMetrics() {
  // Ensure Metrics exist
  await storage.seedMetrics(DEFAULT_METRICS);
  console.log("Seeded metrics registry");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Auth FIRST
  await setupAuth(app);
  registerAuthRoutes(app);

  // Initial seed for metrics (independent of users)
  await seedMetrics();

  // Helper to get or create patient for logged in user
  async function getOrCreatePatient(req: any) {
    const userId = req.user.claims.sub;
    let patient = await storage.getPatientByUserId(userId);
    if (!patient) {
      patient = await storage.createPatient({ 
        userId,
        displayName: req.user.claims.first_name || "User",
        heightCm: 175 // Default
      });
    }
    return patient;
  }

  // --- API ROUTES ---

  app.get(api.bootstrap.get.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const metrics = await storage.getMetrics();
    res.json({ patient, metrics });
  });

  app.post(api.measurements.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.measurements.create.input.parse(req.body);
      const patient = await getOrCreatePatient(req);
      
      // Validate metric codes
      const validMetrics = await storage.getMetrics();
      const validCodes = new Set(validMetrics.map(m => m.code));
      
      for (const code of Object.keys(input.metrics)) {
        if (!validCodes.has(code)) {
           return res.status(400).json({ message: `Unknown metric code: ${code}` });
        }
      }

      const result = await storage.createMeasurement(input, patient.id);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(api.measurements.latest.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const latest = await storage.getLatestObservation(patient.id);
    res.json(latest || null);
  });

  app.get(api.measurements.list.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const { from, to } = req.query as { from?: string, to?: string };
    const list = await storage.getObservations(patient.id, from, to);
    res.json(list);
  });

  app.get(api.metrics.timeseries.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const { code } = req.params;
    const { from, to } = req.query as { from?: string, to?: string };
    
    const metric = await storage.getMetric(code);
    if (!metric) return res.status(404).json({ message: "Metric not found" });

    const data = await storage.getMetricTimeseries(patient.id, code, from, to);
    res.json(data);
  });

  app.get(api.goals.get.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const month = req.query.month as string;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const goal = await storage.getGoal(patient.id, month);
    res.json(goal || null);
  });

  app.put(api.goals.upsert.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.goals.upsert.input.parse(req.body);
      const patient = await getOrCreatePatient(req);
      const goal = await storage.upsertGoal(input, patient.id);
      res.json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.goals.progress.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const month = req.query.month as string;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const monthStart = `${month}-01`;
    const d = new Date(month);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const monthEnd = `${month}-${lastDay}`;

    const goal = await storage.getGoal(patient.id, month);
    if (!goal) return res.json([]);

    const report = [];
    for (const target of goal.targets) {
      const currentVal = await storage.getLatestMetricValueInMonth(patient.id, target.metricCode, monthStart, monthEnd);
      
      let status: "on-track" | "off-track" | "no-data" | "no-target" = "no-data";
      let delta: number | null = null;

      if (currentVal !== undefined && currentVal !== null) {
        delta = currentVal - target.targetValue;
        const absDelta = Math.abs(delta);
        const tolerance = target.tolerance || 0;

        if (target.direction === "maintain") {
           status = absDelta <= tolerance ? "on-track" : "off-track";
        } else if (target.direction === "increase") {
           if (currentVal >= target.targetValue - tolerance) status = "on-track";
           else status = "off-track";
        } else if (target.direction === "decrease") {
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
