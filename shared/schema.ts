import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  real,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

import { users } from "./models/auth";
export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .references(() => users.id)
    .unique(), // Link to Replit Auth user
  displayName: text("display_name").notNull(),
  heightCm: integer("height_cm"),
  gender: text("gender"), // 'male', 'female', 'other', 'unknown'
  dateOfBirth: date("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const metrics = pgTable("metrics", {
  code: text("code").primaryKey(), // e.g., 'weight', 'waist'
  displayName: text("display_name").notNull(),
  unit: text("unit_ucum").notNull(), // UCUM units
  kind: text("kind").notNull(), // 'weight', 'circumference', 'derived'
  defaultDirection: text("default_direction").default("maintain"), // 'increase', 'decrease', 'maintain'
  defaultTolerance: real("default_tolerance").default(0),
});

export const observations = pgTable("observations", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  status: text("status").default("final").notNull(),
  category: text("category").default("vital-signs"),
  // Main code for the observation panel/session
  code: text("code").default("body-metrics-panel"),
  effectiveAt: timestamp("effective_at").defaultNow().notNull(), // Replaced effectiveDate with effectiveAt
  issuedAt: timestamp("issued_at").defaultNow(),
  note: text("note"),
  sessionTag: text("session_tag"), // e.g., morning, evening, post_workout
  source: text("source").default("manual"), // e.g., manual, device
});

export const observationComponents = pgTable("observation_components", {
  id: serial("id").primaryKey(),
  observationId: integer("observation_id")
    .references(() => observations.id)
    .notNull(),
  metricCode: text("metric_code")
    .references(() => metrics.code)
    .notNull(),
  value: real("value_numeric").notNull(),
  unit: text("unit_ucum").notNull(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  lifecycleStatus: text("lifecycle_status").default("active").notNull(),
  monthStart: date("month_start").notNull(), // YYYY-MM-01
  monthEnd: date("month_end").notNull(), // YYYY-MM-LastDay
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const goalTargets = pgTable("goal_targets", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id")
    .references(() => goals.id)
    .notNull(),
  metricCode: text("metric_code")
    .references(() => metrics.code)
    .notNull(),
  targetValue: real("target_value").notNull(),
  unit: text("unit_ucum").notNull(),
  direction: text("direction").default("maintain"),
  tolerance: real("tolerance").default(0),
});

// === HABIT TRACKING TABLES ===

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  title: text("title").notNull(),
  color: text("color").notNull(), // HSL color string
  icon: text("icon"), // Optional icon identifier
  startDate: date("start_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const habitEntries = pgTable("habit_entries", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id")
    .references(() => habits.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(), // YYYY-MM-DD
  completed: boolean("completed").default(true).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calculations = pgTable("calculations", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  sex: text("sex", { enum: ["male", "female"] }).notNull(),
  weightKg: real("weight_kg").notNull(),
  heightCm: real("height_cm").notNull(),
  bodyFatPct: real("body_fat_pct").notNull(),
  activityLevel: text("activity_level", {
    enum: ["sedentary", "light", "moderate", "high", "very_high"],
  }).notNull(),
  activityFactor: real("activity_factor").notNull(),
  goalType: text("goal_type", { enum: ["cut", "maintain", "bulk"] }).notNull(),
  goalAdjustmentKcal: integer("goal_adjustment_kcal").notNull(),
  proteinFactor: real("protein_factor").notNull(),
  fatGPerKg: real("fat_g_per_kg").notNull(),
  useFFMWhenHighBF: boolean("use_ffm_when_high_bf").default(true),
  proteinFactorFFM: real("protein_factor_ffm").default(2.2),
  bfThresholdPct: real("bf_threshold_pct").default(20),
  results: text("results").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const observationsRelations = relations(
  observations,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [observations.patientId],
      references: [patients.id],
    }),
    components: many(observationComponents),
  })
);

export const observationComponentsRelations = relations(
  observationComponents,
  ({ one }) => ({
    observation: one(observations, {
      fields: [observationComponents.observationId],
      references: [observations.id],
    }),
    metric: one(metrics, {
      fields: [observationComponents.metricCode],
      references: [metrics.code],
    }),
  })
);

export const goalsRelations = relations(goals, ({ one, many }) => ({
  patient: one(patients, {
    fields: [goals.patientId],
    references: [patients.id],
  }),
  targets: many(goalTargets),
}));

export const goalTargetsRelations = relations(goalTargets, ({ one }) => ({
  goal: one(goals, {
    fields: [goalTargets.goalId],
    references: [goals.id],
  }),
  metric: one(metrics, {
    fields: [goalTargets.metricCode],
    references: [metrics.code],
  }),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  patient: one(patients, {
    fields: [habits.patientId],
    references: [patients.id],
  }),
  entries: many(habitEntries),
}));

export const habitEntriesRelations = relations(habitEntries, ({ one }) => ({
  habit: one(habits, {
    fields: [habitEntries.habitId],
    references: [habits.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});
export const insertMetricSchema = createInsertSchema(metrics);
export const insertObservationSchema = createInsertSchema(observations).omit({
  id: true,
  issuedAt: true,
});
export const insertObservationComponentSchema = createInsertSchema(
  observationComponents
).omit({ id: true });
export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});
export const insertGoalTargetSchema = createInsertSchema(goalTargets).omit({
  id: true,
});

// === CALCULATOR CONSTANTS & SCHEMAS ===

export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
} as const;

export const activityLevelEnum = z.enum([
  "sedentary",
  "light",
  "moderate",
  "high",
  "very_high",
]);
export const sexEnum = z.enum(["male", "female"]);
export const goalTypeEnum = z.enum(["cut", "maintain", "bulk"]);

export const macroCalcInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().min(10).max(90),
  sex: sexEnum,
  weightKg: z.coerce.number().min(30).max(250),
  heightCm: z.coerce.number().min(120).max(230),
  bodyFatPct: z.coerce.number().min(3).max(60),
  activityLevel: activityLevelEnum,
  activityFactor: z.coerce.number().min(1.0),
  goalType: goalTypeEnum,
  goalAdjustmentKcal: z.coerce.number(),
  proteinFactor: z.coerce.number().min(1.6).max(2.4),
  fatGPerKg: z.coerce.number().default(1.0),
  bfThresholdPct: z.coerce.number().default(20),
  useFFMWhenHighBF: z.boolean().default(true),
  proteinFactorFFM: z.coerce.number().default(2.2),
});

export type MacroCalcInput = z.infer<typeof macroCalcInputSchema>;

export const insertCalculationSchema = createInsertSchema(calculations).omit({
  id: true,
  createdAt: true,
  patientId: true,
});

// Habit schemas
export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  patientId: true,
});

export const insertHabitEntrySchema = createInsertSchema(habitEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertCalculation = z.infer<typeof insertCalculationSchema>;
export type Calculation = typeof calculations.$inferSelect;

// === EXPLICIT API CONTRACT TYPES ===

export type Patient = typeof patients.$inferSelect;
export type Metric = typeof metrics.$inferSelect;
export type Observation = typeof observations.$inferSelect;
export type ObservationComponent = typeof observationComponents.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalTarget = typeof goalTargets.$inferSelect;

// Composite types for API responses
export type ObservationWithComponents = Observation & {
  components: (ObservationComponent & { metric: Metric })[];
};

export type GoalWithTargets = Goal & {
  targets: (GoalTarget & { metric: Metric })[];
};

// Request types
export const createMeasurementSchema = z.object({
  patientId: z.number().optional(), // For MVP single user, can be optional/inferred
  date: z.string(), // YYYY-MM-DD
  note: z.string().optional(),
  metrics: z.record(z.string(), z.number()), // metric_code: value
});

export type CreateMeasurementRequest = z.infer<typeof createMeasurementSchema>;

export const upsertGoalSchema = z.object({
  patientId: z.number().optional(),
  month: z.string(), // YYYY-MM
  targets: z.array(
    z.object({
      metricCode: z.string(),
      targetValue: z.number(),
      direction: z.enum(["increase", "decrease", "maintain"]).optional(),
      tolerance: z.number().optional(),
    })
  ),
});

export type UpsertGoalRequest = z.infer<typeof upsertGoalSchema>;

export type MetricsRegistryResponse = Metric[];

export type ProgressResponse = {
  metric: Metric;
  currentValue: number | null;
  targetValue: number | null;
  status: "on-track" | "off-track" | "no-data" | "no-target";
  delta: number | null;
}[];

export type BootstrapResponse = {
  patient: Patient;
  metrics: Metric[];
};

// === HABIT TYPES ===

export type Habit = typeof habits.$inferSelect;
export type HabitEntry = typeof habitEntries.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type InsertHabitEntry = z.infer<typeof insertHabitEntrySchema>;

export type HabitWithEntries = Habit & {
  entries: HabitEntry[];
  completedDates: string[]; // Derived from entries for convenience
};

// Habit API schemas
export const createHabitSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  color: z.string().min(1, "Color is required"),
  icon: z.string().optional(),
});

export const updateHabitSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const toggleHabitEntrySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
});

export type CreateHabitRequest = z.infer<typeof createHabitSchema>;
export type UpdateHabitRequest = z.infer<typeof updateHabitSchema>;
export type ToggleHabitEntryRequest = z.infer<typeof toggleHabitEntrySchema>;

export const HABIT_COLORS = [
  { name: "Mint", value: "hsl(173 58% 39%)" },
  { name: "Coral", value: "hsl(12 76% 61%)" },
  { name: "Navy", value: "hsl(197 37% 24%)" },
  { name: "Yellow", value: "hsl(43 74% 66%)" },
  { name: "Purple", value: "hsl(262 83% 58%)" },
  { name: "Pink", value: "hsl(340 75% 55%)" },
] as const;
