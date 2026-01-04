import { pgTable, text, serial, integer, boolean, timestamp, date, numeric, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  heightCm: integer("height_cm"),
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
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  status: text("status").default("final").notNull(),
  category: text("category").default("vital-signs"),
  // Main code for the observation panel/session
  code: text("code").default("body-metrics-panel"), 
  effectiveDate: date("effective_date").notNull(), // The date of measurement
  issuedAt: timestamp("issued_at").defaultNow(),
  note: text("note"),
});

export const observationComponents = pgTable("observation_components", {
  id: serial("id").primaryKey(),
  observationId: integer("observation_id").references(() => observations.id).notNull(),
  metricCode: text("metric_code").references(() => metrics.code).notNull(),
  value: real("value_numeric").notNull(),
  unit: text("unit_ucum").notNull(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  lifecycleStatus: text("lifecycle_status").default("active").notNull(),
  monthStart: date("month_start").notNull(), // YYYY-MM-01
  monthEnd: date("month_end").notNull(), // YYYY-MM-LastDay
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const goalTargets = pgTable("goal_targets", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").references(() => goals.id).notNull(),
  metricCode: text("metric_code").references(() => metrics.code).notNull(),
  targetValue: real("target_value").notNull(),
  unit: text("unit_ucum").notNull(),
  direction: text("direction").default("maintain"),
  tolerance: real("tolerance").default(0),
});

// === RELATIONS ===

export const observationsRelations = relations(observations, ({ one, many }) => ({
  patient: one(patients, {
    fields: [observations.patientId],
    references: [patients.id],
  }),
  components: many(observationComponents),
}));

export const observationComponentsRelations = relations(observationComponents, ({ one }) => ({
  observation: one(observations, {
    fields: [observationComponents.observationId],
    references: [observations.id],
  }),
  metric: one(metrics, {
    fields: [observationComponents.metricCode],
    references: [metrics.code],
  }),
}));

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

// === BASE SCHEMAS ===

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true });
export const insertMetricSchema = createInsertSchema(metrics);
export const insertObservationSchema = createInsertSchema(observations).omit({ id: true, issuedAt: true });
export const insertObservationComponentSchema = createInsertSchema(observationComponents).omit({ id: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, createdAt: true });
export const insertGoalTargetSchema = createInsertSchema(goalTargets).omit({ id: true });

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
  targets: z.array(z.object({
    metricCode: z.string(),
    targetValue: z.number(),
    direction: z.enum(["increase", "decrease", "maintain"]).optional(),
    tolerance: z.number().optional(),
  })),
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
