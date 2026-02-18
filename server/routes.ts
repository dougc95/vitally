import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Metric } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./auth";
import { uploadMiddleware } from "./middleware/upload";
import {
  createImportPreview,
  processImport,
} from "./services/import-processor";
import {
  exportPatientFHIR,
  exportObservationsFHIR,
  exportGoalsFHIR,
  exportFullBundleFHIR,
} from "./services/export-fhir";

// Seed Data
const DEFAULT_METRICS: Metric[] = [
  // Weights
  {
    code: "weight",
    displayName: "Weight",
    unit: "kg",
    kind: "weight",
    defaultDirection: "decrease",
    defaultTolerance: 0.5,
  },

  // Circumferences
  {
    code: "waist",
    displayName: "Waist",
    unit: "cm",
    kind: "circumference",
    defaultDirection: "decrease",
    defaultTolerance: 0.5,
  },
  {
    code: "hips",
    displayName: "Hips",
    unit: "cm",
    kind: "circumference",
    defaultDirection: "decrease",
    defaultTolerance: 0.5,
  },
  {
    code: "chest",
    displayName: "Chest",
    unit: "cm",
    kind: "circumference",
    defaultDirection: "increase",
    defaultTolerance: 0.5,
  },
  {
    code: "shoulders",
    displayName: "Shoulders",
    unit: "cm",
    kind: "circumference",
    defaultDirection: "increase",
    defaultTolerance: 0.5,
  },
  {
    code: "thigh_r",
    displayName: "Thigh (R)",
    unit: "cm",
    kind: "circumference",
    defaultDirection: "increase",
    defaultTolerance: 0.5,
  },
  {
    code: "thigh_l",
    displayName: "Thigh (L)",
    unit: "cm",
    kind: "circumference",
    defaultDirection: "increase",
    defaultTolerance: 0.5,
  },
  {
    code: "bicep_r",
    displayName: "Bicep (R)",
    unit: "cm",
    kind: "circumference",
    defaultDirection: "increase",
    defaultTolerance: 0.5,
  },
  {
    code: "bicep_l",
    displayName: "Bicep (L)",
    unit: "cm",
    kind: "circumference",
    defaultDirection: "increase",
    defaultTolerance: 0.5,
  },

  // Body Fat
  {
    code: "body_fat",
    displayName: "Body Fat %",
    unit: "%",
    kind: "composition",
    defaultDirection: "decrease",
    defaultTolerance: 0.5,
  },
];

async function seedMetrics() {
  // Ensure Metrics exist
  await storage.seedMetrics(DEFAULT_METRICS);
  console.log("Seeded metrics registry");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Setup Auth FIRST
  await setupAuth(app);
  registerAuthRoutes(app);

  // Initial seed for metrics (independent of users)
  await seedMetrics();

  // Helper to get or create patient for logged in user
  async function getOrCreatePatient(req: any) {
    const userId = req.user.id;
    return await storage.getOrCreatePatient({
      userId,
      displayName: req.user.firstName || req.user.email || "User",
      heightCm: 175, // Default
    });
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
      const validCodes = new Set(validMetrics.map((m) => m.code));

      for (const code of Object.keys(input.metrics)) {
        if (!validCodes.has(code)) {
          return res
            .status(400)
            .json({ message: `Unknown metric code: ${code}` });
        }
      }

      const result = await storage.createMeasurement(
        input,
        patient.id,
        req.user!.id,
      );
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get(api.measurements.latest.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const latest = await storage.getLatestObservation(patient.id, req.user!.id);
    res.json(latest || null);
  });

  app.get(api.measurements.list.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const { from, to } = req.query as { from?: string; to?: string };
    const list = await storage.getObservations(
      patient.id,
      from,
      to,
      req.user!.id,
    );
    res.json(list);
  });

  app.get(api.metrics.timeseries.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const { code } = req.params;
    const { from, to } = req.query as { from?: string; to?: string };

    const metric = await storage.getMetric(code);
    if (!metric) return res.status(404).json({ message: "Metric not found" });

    const data = await storage.getMetricTimeseries(
      patient.id,
      code,
      from,
      to,
      req.user!.id,
    );
    res.json(data);
  });

  app.get(api.goals.get.path, isAuthenticated, async (req, res) => {
    const patient = await getOrCreatePatient(req);
    const month = req.query.month as string;
    if (!month) return res.status(400).json({ message: "Month is required" });

    const goal = await storage.getGoal(patient.id, month, req.user!.id);
    res.json(goal || null);
  });

  app.put(api.goals.upsert.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.goals.upsert.input.parse(req.body);
      const patient = await getOrCreatePatient(req);
      const goal = await storage.upsertGoal(input, patient.id, req.user!.id);
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
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const monthEnd = `${month}-${lastDay}`;

    const goal = await storage.getGoal(patient.id, month, req.user!.id);
    if (!goal) return res.json([]);

    const report = [];
    for (const target of goal.targets) {
      const currentVal = await storage.getLatestMetricValueInMonth(
        patient.id,
        target.metricCode,
        monthStart,
        monthEnd,
        req.user!.id,
      );

      let status: "on-track" | "off-track" | "no-data" | "no-target" =
        "no-data";
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
        currentValue: currentVal ?? null,
        targetValue: target.targetValue,
        unit: target.unit,
        status,
        delta: delta,
        direction: target.direction || undefined,
      });
    }

    res.json(report);
  });

  // --- IMPORT ROUTES ---

  app.post(
    api.import.preview.path,
    isAuthenticated,
    uploadMiddleware.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const preview = await createImportPreview(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname,
          req.file.size,
        );
        res.json(preview);
      } catch (err: any) {
        res
          .status(400)
          .json({ message: err.message || "Failed to process file" });
      }
    },
  );

  app.post(api.import.confirm.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.import.confirm.input.parse(req.body);
      const patient = await getOrCreatePatient(req);

      // Verify patient ownership is implicitly handled by getOrCreatePatient returning the user's patient
      // But strict ownership check?
      const result = await processImport(
        patient.id,
        input.rows,
        input.mergeStrategy,
      );
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.import.template.path, isAuthenticated, async (req, res) => {
    const csvContent =
      "Date,Metric,Value,Unit,Note\n2025-01-01,weight,75.5,kg,Morning weigh-in";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="import_template.csv"',
    );
    res.send(csvContent);
  });

  // --- EXPORT ROUTES ---

  app.get(api.export.fhir.patient.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      // Verify ownership? getOrCreatePatient handles it.
      const data = await exportPatientFHIR(patient.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(
    api.export.fhir.observations.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const patient = await getOrCreatePatient(req);
        const { from, to } = req.query as { from?: string; to?: string };
        const data = await exportObservationsFHIR(patient.id, from, to);
        res.json(data);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    },
  );

  app.get(api.export.fhir.goals.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const { from, to } = req.query as { from?: string; to?: string };
      const data = await exportGoalsFHIR(patient.id, from, to);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(api.export.fhir.bundle.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const { from, to } = req.query as { from?: string; to?: string };
      const data = await exportFullBundleFHIR(patient.id, from, to);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === CALCULATIONS ===
  app.get(api.calculations.list.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const userId = req.user!.id;
      const calculations = await storage.getCalculations(patient.id, userId);
      res.json(calculations);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.calculations.create.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const userId = req.user!.id;
      const input = api.calculations.create.input.parse(req.body);
      const calculation = await storage.createCalculation(
        input,
        patient.id,
        userId,
      );
      res.status(201).json(calculation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // === HABITS ===
  app.get(api.habits.list.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const habits = await storage.getHabits(patient.id, req.user!.id);
      res.json(habits);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get(api.habits.get.path, isAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id, 10);
      if (isNaN(habitId)) {
        return res.status(400).json({ message: "Invalid habit ID" });
      }
      const habit = await storage.getHabit(habitId, req.user!.id);
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.json(habit);
    } catch (err: any) {
      if (
        err.message?.includes("not found") ||
        err.message?.includes("Access denied")
      ) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.habits.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.habits.create.input.parse(req.body);
      const patient = await getOrCreatePatient(req);
      const habit = await storage.createHabit(input, patient.id, req.user!.id);
      res.status(201).json(habit);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.put(api.habits.update.path, isAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id, 10);
      if (isNaN(habitId)) {
        return res.status(400).json({ message: "Invalid habit ID" });
      }
      const input = api.habits.update.input.parse(req.body);
      const habit = await storage.updateHabit(habitId, input, req.user!.id);
      res.json(habit);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      if (
        err.message?.includes("not found") ||
        err.message?.includes("Access denied")
      ) {
        return res.status(404).json({ message: "Habit not found" });
      }
      throw err;
    }
  });

  app.delete(api.habits.delete.path, isAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id, 10);
      if (isNaN(habitId)) {
        return res.status(400).json({ message: "Invalid habit ID" });
      }
      await storage.deleteHabit(habitId, req.user!.id);
      res.status(204).send();
    } catch (err: any) {
      if (
        err.message?.includes("not found") ||
        err.message?.includes("Access denied")
      ) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.post(api.habits.toggleEntry.path, isAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id, 10);
      if (isNaN(habitId)) {
        return res.status(400).json({ message: "Invalid habit ID" });
      }
      const input = api.habits.toggleEntry.input.parse(req.body);
      const result = await storage.toggleHabitEntry(
        habitId,
        input.date,
        req.user!.id,
      );
      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      if (
        err.message?.includes("not found") ||
        err.message?.includes("Access denied")
      ) {
        return res.status(404).json({ message: "Habit not found" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  // === SOCIAL ===
  app.post(
    api.social.friends.requests.create.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const input = api.social.friends.requests.create.input.parse(req.body);
        const patient = await getOrCreatePatient(req);
        const request = await storage.createFriendRequest(
          patient.id,
          input.email,
          req.user!.id,
        );
        res.status(201).json(request);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }

        if (err.message?.includes("not found")) {
          return res.status(404).json({ message: err.message });
        }

        if (
          err.message?.includes("already") ||
          err.message?.includes("cannot") ||
          err.message?.includes("blocked")
        ) {
          return res.status(400).json({ message: err.message });
        }

        res.status(500).json({ message: err.message });
      }
    },
  );

  app.get(
    api.social.friends.requests.list.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const patient = await getOrCreatePatient(req);
        const requests = await storage.getFriendRequests(
          patient.id,
          req.user!.id,
        );
        res.json(requests);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    },
  );

  app.post(
    api.social.friends.requests.accept.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
          return res.status(400).json({ message: "Invalid request ID" });
        }

        const patient = await getOrCreatePatient(req);
        const request = await storage.acceptFriendRequest(
          requestId,
          patient.id,
          req.user!.id,
        );
        res.json(request);
      } catch (err: any) {
        if (
          err.message?.includes("not found") ||
          err.message?.includes("Access denied")
        ) {
          return res.status(404).json({ message: err.message });
        }

        if (err.message?.includes("pending")) {
          return res.status(400).json({ message: err.message });
        }

        res.status(500).json({ message: err.message });
      }
    },
  );

  app.post(
    api.social.friends.requests.decline.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
          return res.status(400).json({ message: "Invalid request ID" });
        }

        const patient = await getOrCreatePatient(req);
        const request = await storage.declineFriendRequest(
          requestId,
          patient.id,
          req.user!.id,
        );
        res.json(request);
      } catch (err: any) {
        if (
          err.message?.includes("not found") ||
          err.message?.includes("Access denied")
        ) {
          return res.status(404).json({ message: err.message });
        }

        if (err.message?.includes("pending")) {
          return res.status(400).json({ message: err.message });
        }

        res.status(500).json({ message: err.message });
      }
    },
  );

  app.post(
    api.social.friends.requests.block.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
          return res.status(400).json({ message: "Invalid request ID" });
        }

        const patient = await getOrCreatePatient(req);
        const request = await storage.blockFriendRequest(
          requestId,
          patient.id,
          req.user!.id,
        );
        res.json(request);
      } catch (err: any) {
        if (
          err.message?.includes("not found") ||
          err.message?.includes("Access denied")
        ) {
          return res.status(404).json({ message: err.message });
        }

        res.status(500).json({ message: err.message });
      }
    },
  );

  app.get(api.social.friends.list.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const friends = await storage.listFriends(patient.id, req.user!.id);
      res.json(friends);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete(
    api.social.friends.remove.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const friendPatientId = parseInt(req.params.friendPatientId, 10);
        if (isNaN(friendPatientId)) {
          return res.status(400).json({ message: "Invalid friend patient ID" });
        }

        const patient = await getOrCreatePatient(req);
        await storage.removeFriend(patient.id, friendPatientId, req.user!.id);
        res.status(204).send();
      } catch (err: any) {
        if (err.message?.includes("not found")) {
          return res.status(404).json({ message: err.message });
        }
        res.status(500).json({ message: err.message });
      }
    },
  );

  app.get(api.social.feed.list.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const input = api.social.feed.list.input
        ? api.social.feed.list.input.parse(req.query)
        : undefined;

      const feed = await storage.getFriendFeed(
        patient.id,
        req.user!.id,
        input?.cursor,
        input?.limit,
      );
      res.json(feed);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.get(api.social.privacy.get.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const settings = await storage.getSocialPrivacySettings(
        patient.id,
        req.user!.id,
      );
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put(api.social.privacy.update.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const input = api.social.privacy.update.input.parse(req.body);
      const settings = await storage.updateSocialPrivacySettings(
        patient.id,
        input,
        req.user!.id,
      );
      res.json(settings);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }

      if (err.message?.includes("Access denied")) {
        return res.status(403).json({ message: err.message });
      }

      res.status(500).json({ message: err.message });
    }
  });

  // === NUTRITION ===
  app.get(api.nutrition.goals.get.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      let goal = await storage.getNutritionGoal(patient.id, req.user!.id);

      if (!goal) {
        // Create default goals
        goal = await storage.upsertNutritionGoal(
          patient.id,
          { calories: 2000, protein: 150, carbs: 200, fat: 65 },
          req.user!.id,
        );
      }

      res.json(goal);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post(
    api.nutrition.goals.update.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const input = api.nutrition.goals.update.input.parse(req.body);
        const patient = await getOrCreatePatient(req);
        const goal = await storage.upsertNutritionGoal(
          patient.id,
          input,
          req.user!.id,
        );
        res.json(goal);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        res.status(500).json({ message: err.message });
      }
    },
  );

  app.get(api.nutrition.meals.list.path, isAuthenticated, async (req, res) => {
    try {
      const patient = await getOrCreatePatient(req);
      const date =
        (req.query.date as string) || new Date().toISOString().split("T")[0];
      const mealsList = await storage.getMeals(patient.id, date, req.user!.id);
      res.json(mealsList);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post(
    api.nutrition.meals.create.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const input = api.nutrition.meals.create.input.parse(req.body);
        const patient = await getOrCreatePatient(req);
        const meal = await storage.createMeal(patient.id, input, req.user!.id);
        res.status(201).json(meal);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join("."),
          });
        }
        res.status(500).json({ message: err.message });
      }
    },
  );

  app.delete(
    api.nutrition.meals.delete.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const mealId = parseInt(req.params.id, 10);
        if (isNaN(mealId)) {
          return res.status(400).json({ message: "Invalid meal ID" });
        }
        await storage.deleteMeal(mealId, req.user!.id);
        res.status(204).send();
      } catch (err: any) {
        if (
          err.message?.includes("not found") ||
          err.message?.includes("Access denied")
        ) {
          return res.status(404).json({ message: "Meal not found" });
        }
        res.status(500).json({ message: err.message });
      }
    },
  );

  app.post(
    api.nutrition.analysis.analyze.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const { imageUrl, provider: requestedProvider } = req.body;
        if (!imageUrl) {
          return res.status(400).json({ message: "Image URL required" });
        }

        const { getAIProvider, getDefaultProvider } =
          await import("./services/ai-providers");

        const providerType = requestedProvider || getDefaultProvider();
        const provider = getAIProvider(providerType);

        if (!provider.isConfigured()) {
          return res.status(500).json({
            message: `${providerType.toUpperCase()} API key not configured`,
          });
        }

        const result = await provider.analyzeImage(imageUrl);
        res.json(result);
      } catch (err: any) {
        console.error("AI Analysis Error:", err);
        res
          .status(500)
          .json({ message: err.message || "Failed to analyze image" });
      }
    },
  );

  // === INGREDIENTS ROUTES ===

  app.get(
    api.nutrition.ingredients.list.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const patient = await getOrCreatePatient(req);
        const ingredients = await storage.getIngredients(
          patient.id,
          req.user!.id,
        );
        res.json(ingredients);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    },
  );

  app.post(
    api.nutrition.ingredients.add.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const patient = await getOrCreatePatient(req);
        const ingredient = await storage.addIngredient(
          patient.id,
          req.body,
          req.user!.id,
        );
        res.status(201).json(ingredient);
      } catch (err: any) {
        res.status(400).json({ message: err.message });
      }
    },
  );

  app.post(
    api.nutrition.ingredients.addBulk.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const patient = await getOrCreatePatient(req);
        const { ingredients } = req.body;
        const result = await storage.addIngredients(
          patient.id,
          ingredients,
          req.user!.id,
        );
        res.status(201).json(result);
      } catch (err: any) {
        res.status(400).json({ message: err.message });
      }
    },
  );

  app.delete(
    api.nutrition.ingredients.delete.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const ingredientId = parseInt(req.params.id, 10);
        if (isNaN(ingredientId)) {
          return res.status(400).json({ message: "Invalid ingredient ID" });
        }
        await storage.deleteIngredient(ingredientId, req.user!.id);
        res.status(204).send();
      } catch (err: any) {
        if (err.message.includes("not found")) {
          res.status(404).json({ message: err.message });
        } else {
          res.status(500).json({ message: err.message });
        }
      }
    },
  );

  app.post(
    api.nutrition.ingredients.scan.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const { imageUrl, provider: requestedProvider } = req.body;
        if (!imageUrl) {
          return res.status(400).json({ message: "Image URL required" });
        }

        const { getAIProvider, getDefaultProvider } =
          await import("./services/ai-providers");

        const providerType = requestedProvider || getDefaultProvider();
        const provider = getAIProvider(providerType);

        if (!provider.isConfigured()) {
          return res.status(500).json({
            message: `${providerType.toUpperCase()} API key not configured`,
          });
        }

        const result = await provider.scanIngredients(imageUrl);
        res.json(result);
      } catch (err: any) {
        console.error("Ingredient Scan Error:", err);
        res
          .status(500)
          .json({ message: err.message || "Failed to scan ingredients" });
      }
    },
  );

  // === RECIPES ROUTES ===

  app.post(
    api.nutrition.recipes.suggest.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const {
          cuisineMode,
          provider: requestedProvider,
          maxRecipes,
          dietaryRestrictions,
        } = req.body;

        // Get user's current ingredients
        const patient = await getOrCreatePatient(req);
        const ingredients = await storage.getIngredients(
          patient.id,
          req.user!.id,
        );

        const { getAIProvider, getDefaultProvider } =
          await import("./services/ai-providers");

        const providerType = requestedProvider || getDefaultProvider();
        const provider = getAIProvider(providerType);

        if (!provider.isConfigured()) {
          return res.status(500).json({
            message: `${providerType.toUpperCase()} API key not configured`,
          });
        }

        const result = await provider.suggestRecipes(
          ingredients.map((i) => i.name),
          cuisineMode || "surprise",
          maxRecipes || 3,
          dietaryRestrictions,
        );
        res.json(result);
      } catch (err: any) {
        console.error("Recipe Suggestion Error:", err);
        res
          .status(500)
          .json({ message: err.message || "Failed to suggest recipes" });
      }
    },
  );

  app.get(
    api.nutrition.recipes.saved.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const patient = await getOrCreatePatient(req);
        const recipes = await storage.getSavedRecipes(patient.id, req.user!.id);
        res.json(recipes);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    },
  );

  app.post(
    api.nutrition.recipes.save.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const patient = await getOrCreatePatient(req);
        const recipe = await storage.saveRecipe(
          patient.id,
          req.body,
          req.user!.id,
        );
        res.status(201).json(recipe);
      } catch (err: any) {
        res.status(400).json({ message: err.message });
      }
    },
  );

  app.delete(
    api.nutrition.recipes.delete.path,
    isAuthenticated,
    async (req, res) => {
      try {
        const recipeId = parseInt(req.params.id, 10);
        if (isNaN(recipeId)) {
          return res.status(400).json({ message: "Invalid recipe ID" });
        }
        await storage.deleteRecipe(recipeId, req.user!.id);
        res.status(204).send();
      } catch (err: any) {
        if (err.message.includes("not found")) {
          res.status(404).json({ message: err.message });
        } else {
          res.status(500).json({ message: err.message });
        }
      }
    },
  );

  return httpServer;
}
