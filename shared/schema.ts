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
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

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

export const friendshipStatusValues = [
  "pending",
  "accepted",
  "declined",
  "blocked",
] as const;

export const habitActivityEventTypeValues = [
  "habit_completed",
  "habit_uncompleted",
  "habit_created",
] as const;

export const friendshipStatusEnum = z.enum(friendshipStatusValues);
export const habitActivityEventTypeEnum = z.enum(habitActivityEventTypeValues);

export const friendships = pgTable(
  "friendships",
  {
    id: serial("id").primaryKey(),
    requesterPatientId: integer("requester_patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    addresseePatientId: integer("addressee_patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status", { enum: friendshipStatusValues })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    respondedAt: timestamp("responded_at"),
  },
  (table) => ({
    requesterAddresseeUnique: uniqueIndex(
      "friendships_requester_addressee_unique",
    ).on(table.requesterPatientId, table.addresseePatientId),
    requesterStatusIdx: index("friendships_requester_status_idx").on(
      table.requesterPatientId,
      table.status,
    ),
    addresseeStatusIdx: index("friendships_addressee_status_idx").on(
      table.addresseePatientId,
      table.status,
    ),
    noSelfFriendshipChk: check(
      "friendships_no_self_chk",
      sql`${table.requesterPatientId} <> ${table.addresseePatientId}`,
    ),
  }),
);

export const habitActivityEvents = pgTable(
  "habit_activity_events",
  {
    id: serial("id").primaryKey(),
    actorPatientId: integer("actor_patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    habitId: integer("habit_id")
      .references(() => habits.id, { onDelete: "cascade" })
      .notNull(),
    habitEntryId: integer("habit_entry_id").references(() => habitEntries.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type", {
      enum: habitActivityEventTypeValues,
    }).notNull(),
    eventDate: date("event_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("habit_activity_events_created_at_idx").on(
      table.createdAt,
    ),
    actorCreatedAtIdx: index("habit_activity_events_actor_created_at_idx").on(
      table.actorPatientId,
      table.createdAt,
    ),
  }),
);

export const socialPrivacySettings = pgTable("social_privacy_settings", {
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .primaryKey(),
  shareHabitActivity: boolean("share_habit_activity").default(true).notNull(),
  showHabitName: boolean("show_habit_name").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

// === NUTRITION TRACKING TABLES ===

export const nutritionGoals = pgTable("nutrition_goals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull()
    .unique(),
  calories: integer("calories").notNull().default(2000),
  protein: integer("protein").notNull().default(150),
  carbs: integer("carbs").notNull().default(200),
  fat: integer("fat").notNull().default(65),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  imageUrl: text("image_url"),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mealItems = pgTable("meal_items", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id")
    .references(() => meals.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: text("unit").notNull().default("serving"),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  carbs: integer("carbs").notNull(),
  fat: integer("fat").notNull(),
});

// === INGREDIENTS & RECIPES TABLES ===

export const ingredientCategoryEnum = z.enum([
  "produce",
  "protein",
  "dairy",
  "grains",
  "pantry",
  "spices",
  "frozen",
  "beverages",
  "other",
]);

export const cuisineModeEnum = z.enum([
  "surprise",
  "asian",
  "mediterranean",
  "mexican",
  "italian",
  "american",
  "indian",
  "healthy",
  "quick",
  "keto",
  "vegetarian",
  "vegan",
]);

export const userIngredients = pgTable("user_ingredients", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  name: text("name").notNull(),
  quantity: real("quantity").default(1),
  unit: text("unit").default("unit"),
  category: text("category").default("other"),
  imageUrl: text("image_url"),
  expiresAt: date("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedRecipes = pgTable("saved_recipes", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  cuisineMode: text("cuisine_mode"),
  ingredients: text("ingredients").notNull(), // JSON string array
  instructions: text("instructions").notNull(), // JSON string array
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes
  servings: integer("servings").default(2),
  difficulty: text("difficulty").default("medium"),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fat: integer("fat"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recipeHistory = pgTable("recipe_history", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  recipeId: integer("recipe_id").references(() => savedRecipes.id, {
    onDelete: "cascade",
  }),
  generatedRecipe: text("generated_recipe"), // JSON for non-saved recipes
  cuisineMode: text("cuisine_mode"),
  wasCooked: boolean("was_cooked").default(false),
  rating: integer("rating"), // 1-5
  generatedAt: timestamp("generated_at").defaultNow(),
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
  }),
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
  }),
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

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(patients, {
    fields: [friendships.requesterPatientId],
    references: [patients.id],
    relationName: "friendshipRequester",
  }),
  addressee: one(patients, {
    fields: [friendships.addresseePatientId],
    references: [patients.id],
    relationName: "friendshipAddressee",
  }),
}));

export const habitActivityEventsRelations = relations(
  habitActivityEvents,
  ({ one }) => ({
    actor: one(patients, {
      fields: [habitActivityEvents.actorPatientId],
      references: [patients.id],
    }),
    habit: one(habits, {
      fields: [habitActivityEvents.habitId],
      references: [habits.id],
    }),
    habitEntry: one(habitEntries, {
      fields: [habitActivityEvents.habitEntryId],
      references: [habitEntries.id],
    }),
  }),
);

export const socialPrivacySettingsRelations = relations(
  socialPrivacySettings,
  ({ one }) => ({
    patient: one(patients, {
      fields: [socialPrivacySettings.patientId],
      references: [patients.id],
    }),
  }),
);

export const nutritionGoalsRelations = relations(nutritionGoals, ({ one }) => ({
  patient: one(patients, {
    fields: [nutritionGoals.patientId],
    references: [patients.id],
  }),
}));

export const mealsRelations = relations(meals, ({ one, many }) => ({
  patient: one(patients, {
    fields: [meals.patientId],
    references: [patients.id],
  }),
  items: many(mealItems),
}));

export const mealItemsRelations = relations(mealItems, ({ one }) => ({
  meal: one(meals, {
    fields: [mealItems.mealId],
    references: [meals.id],
  }),
}));

export const userIngredientsRelations = relations(
  userIngredients,
  ({ one }) => ({
    patient: one(patients, {
      fields: [userIngredients.patientId],
      references: [patients.id],
    }),
  }),
);

export const savedRecipesRelations = relations(
  savedRecipes,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [savedRecipes.patientId],
      references: [patients.id],
    }),
    history: many(recipeHistory),
  }),
);

export const recipeHistoryRelations = relations(recipeHistory, ({ one }) => ({
  patient: one(patients, {
    fields: [recipeHistory.patientId],
    references: [patients.id],
  }),
  recipe: one(savedRecipes, {
    fields: [recipeHistory.recipeId],
    references: [savedRecipes.id],
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
  observationComponents,
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

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
});

export const insertHabitActivityEventSchema = createInsertSchema(
  habitActivityEvents,
).omit({
  id: true,
  createdAt: true,
});

export const insertSocialPrivacySettingsSchema = createInsertSchema(
  socialPrivacySettings,
).omit({
  updatedAt: true,
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
    }),
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
export type Friendship = typeof friendships.$inferSelect;
export type HabitActivityEvent = typeof habitActivityEvents.$inferSelect;
export type SocialPrivacySettings = typeof socialPrivacySettings.$inferSelect;
export type FriendshipStatus = z.infer<typeof friendshipStatusEnum>;
export type HabitActivityEventType = z.infer<typeof habitActivityEventTypeEnum>;

export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type InsertHabitActivityEvent = z.infer<
  typeof insertHabitActivityEventSchema
>;
export type InsertSocialPrivacySettings = z.infer<
  typeof insertSocialPrivacySettingsSchema
>;

export type SocialProfile = {
  patientId: number;
  displayName: string;
  profileImageUrl: string | null;
};

export type FriendshipWithProfiles = Friendship & {
  requester: SocialProfile;
  addressee: SocialProfile;
};

export type FriendRequestsResponse = {
  incoming: FriendshipWithProfiles[];
  outgoing: FriendshipWithProfiles[];
};

export type FriendFeedItem = {
  id: number;
  actor: SocialProfile;
  eventType: HabitActivityEventType;
  habit: {
    id: number;
    title?: string;
  };
  eventDate?: string;
  createdAt: string;
};

export type FriendFeedResponse = {
  items: FriendFeedItem[];
  nextCursor: string | null;
};

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

export const sendFriendRequestSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const socialFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateSocialPrivacySettingsSchema = z
  .object({
    shareHabitActivity: z.boolean().optional(),
    showHabitName: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.shareHabitActivity !== undefined || data.showHabitName !== undefined,
    {
      message: "At least one field is required",
    },
  );

export type CreateHabitRequest = z.infer<typeof createHabitSchema>;
export type UpdateHabitRequest = z.infer<typeof updateHabitSchema>;
export type ToggleHabitEntryRequest = z.infer<typeof toggleHabitEntrySchema>;
export type SendFriendRequestRequest = z.infer<typeof sendFriendRequestSchema>;
export type SocialFeedQueryRequest = z.infer<typeof socialFeedQuerySchema>;
export type UpdateSocialPrivacySettingsRequest = z.infer<
  typeof updateSocialPrivacySettingsSchema
>;

export const HABIT_COLORS = [
  { name: "Mint", value: "hsl(173 58% 39%)" },
  { name: "Coral", value: "hsl(12 76% 61%)" },
  { name: "Navy", value: "hsl(197 37% 24%)" },
  { name: "Yellow", value: "hsl(43 74% 66%)" },
  { name: "Purple", value: "hsl(262 83% 58%)" },
  { name: "Pink", value: "hsl(340 75% 55%)" },
] as const;

// === NUTRITION TYPES & SCHEMAS ===

export type NutritionGoal = typeof nutritionGoals.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type MealItem = typeof mealItems.$inferSelect;

export const insertNutritionGoalSchema = createInsertSchema(
  nutritionGoals,
).omit({
  id: true,
  updatedAt: true,
  patientId: true,
});

export const insertMealSchema = createInsertSchema(meals).omit({
  id: true,
  createdAt: true,
  patientId: true,
});

export const insertMealItemSchema = createInsertSchema(mealItems).omit({
  id: true,
});

export type InsertNutritionGoal = z.infer<typeof insertNutritionGoalSchema>;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type InsertMealItem = z.infer<typeof insertMealItemSchema>;

export type MealWithItems = Meal & {
  items: MealItem[];
};

export type CreateMealRequest = {
  mealType: string;
  date: string;
  imageUrl?: string | null;
  items: Omit<InsertMealItem, "mealId">[];
};

export type AnalyzeImageResponse = {
  foods: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
    quantity: number;
    unit: string;
  }[];
};

export const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export const updateNutritionGoalSchema = z.object({
  calories: z.number().min(500).max(10000).optional(),
  protein: z.number().min(0).max(500).optional(),
  carbs: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(500).optional(),
});

export const createMealSchema = z.object({
  mealType: mealTypeEnum,
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  imageUrl: z.string().nullable().optional(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().default(1),
      unit: z.string().default("serving"),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    }),
  ),
});

export type UpdateNutritionGoalRequest = z.infer<
  typeof updateNutritionGoalSchema
>;
export type CreateMealSchemaRequest = z.infer<typeof createMealSchema>;

// === INGREDIENTS & RECIPES TYPES & SCHEMAS ===

export type UserIngredient = typeof userIngredients.$inferSelect;
export type SavedRecipe = typeof savedRecipes.$inferSelect;
export type RecipeHistory = typeof recipeHistory.$inferSelect;

export type IngredientCategory = z.infer<typeof ingredientCategoryEnum>;
export type CuisineMode = z.infer<typeof cuisineModeEnum>;

export const insertIngredientSchema = createInsertSchema(userIngredients).omit({
  id: true,
  createdAt: true,
  patientId: true,
});

export const insertSavedRecipeSchema = createInsertSchema(savedRecipes).omit({
  id: true,
  createdAt: true,
  patientId: true,
});

export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type InsertSavedRecipe = z.infer<typeof insertSavedRecipeSchema>;

export const addIngredientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.number().optional().default(1),
  unit: z.string().optional().default("unit"),
  category: ingredientCategoryEnum.optional().default("other"),
  expiresAt: z.string().optional(),
});

export const addIngredientsSchema = z.object({
  ingredients: z.array(addIngredientSchema),
});

export const scanIngredientsSchema = z.object({
  imageUrl: z.string(),
  provider: z.enum(["openai", "gemini"]).optional(),
});

export const suggestRecipesSchema = z.object({
  cuisineMode: cuisineModeEnum.optional().default("surprise"),
  provider: z.enum(["openai", "gemini"]).optional(),
  maxRecipes: z.number().optional().default(3),
  dietaryRestrictions: z.array(z.string()).optional(),
});

export const saveRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  cuisineMode: z.string().optional(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  prepTime: z.number().optional(),
  cookTime: z.number().optional(),
  servings: z.number().optional().default(2),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
});

export type AddIngredientRequest = z.infer<typeof addIngredientSchema>;
export type AddIngredientsRequest = z.infer<typeof addIngredientsSchema>;
export type ScanIngredientsRequest = z.infer<typeof scanIngredientsSchema>;
export type SuggestRecipesRequest = z.infer<typeof suggestRecipesSchema>;
export type SaveRecipeRequest = z.infer<typeof saveRecipeSchema>;

export type ScannedIngredient = {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  confidence: number;
};

export type ScanIngredientsResponse = {
  ingredients: ScannedIngredient[];
};

export type RecipeSuggestion = {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type SuggestRecipesResponse = {
  recipes: RecipeSuggestion[];
};
