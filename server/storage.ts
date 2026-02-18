import { db } from "./db";
import {
  patients,
  metrics,
  observations,
  observationComponents,
  goals,
  goalTargets,
  calculations,
  habits,
  habitEntries,
  friendships,
  habitActivityEvents,
  socialPrivacySettings,
  nutritionGoals,
  meals,
  mealItems,
  userIngredients,
  savedRecipes,
  users,
  type User,
  type Patient,
  type Metric,
  type Observation,
  type Goal,
  type Calculation,
  type InsertCalculation,
  type CreateMeasurementRequest,
  type UpsertGoalRequest,
  type ObservationWithComponents,
  type GoalWithTargets,
  type Habit,
  type HabitEntry,
  type HabitWithEntries,
  type Friendship,
  type FriendshipWithProfiles,
  type SocialProfile,
  type FriendRequestsResponse,
  type FriendFeedResponse,
  type HabitActivityEventType,
  type UpdateSocialPrivacySettingsRequest,
  type SocialPrivacySettings,
  type CreateHabitRequest,
  type UpdateHabitRequest,
  type NutritionGoal,
  type MealWithItems,
  type CreateMealRequest,
  type UpdateNutritionGoalRequest,
  type UserIngredient,
  type SavedRecipe,
  type AddIngredientRequest,
  type SaveRecipeRequest,
} from "@shared/schema";
import { ImportRow, ImportResult } from "@shared/types/import-export";
import { eq, and, or, desc, gte, lte, lt, inArray, isNull } from "drizzle-orm";
import { UnauthorizedError } from "./errors";

export interface IStorage {
  // Patient Registry
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  getUser(id: string): Promise<User | undefined>;
  createPatient(patient: Partial<Patient>): Promise<Patient>;
  getOrCreatePatient(data: Partial<Patient>): Promise<Patient>;
  getMetrics(): Promise<Metric[]>;
  getMetric(code: string): Promise<Metric | undefined>;
  seedMetrics(metricsList: Metric[]): Promise<void>;

  // Measurements (with userId for ownership verification)
  createMeasurement(
    data: CreateMeasurementRequest,
    patientId: number,
    userId: string,
  ): Promise<{ observationId: number; count: number }>;
  getLatestObservation(
    patientId: number,
    userId: string,
  ): Promise<ObservationWithComponents | undefined>;
  getObservations(
    patientId: number,
    from?: string,
    to?: string,
    userId?: string,
  ): Promise<ObservationWithComponents[]>;
  getMetricTimeseries(
    patientId: number,
    metricCode: string,
    from?: string,
    to?: string,
    userId?: string,
  ): Promise<{ date: string; value: number }[]>;

  // Goals (with userId for ownership verification)
  getGoal(
    patientId: number,
    month: string,
    userId: string,
  ): Promise<GoalWithTargets | undefined>;
  upsertGoal(
    data: UpsertGoalRequest,
    patientId: number,
    userId: string,
  ): Promise<Goal>;

  // Progress Helper (with userId for ownership verification)
  getLatestMetricValueInMonth(
    patientId: number,
    metricCode: string,
    monthStart: string,
    monthEnd: string,
    userId: string,
  ): Promise<number | undefined>;

  // Import
  importMeasurements(
    patientId: number,
    rows: ImportRow[],
    strategy: "skip" | "overwrite",
  ): Promise<ImportResult>;

  // Calculations
  getCalculations(patientId: number, userId: string): Promise<Calculation[]>;
  createCalculation(
    data: Omit<InsertCalculation, "patientId">,
    patientId: number,
    userId: string,
  ): Promise<Calculation>;

  // Habits
  getHabits(patientId: number, userId: string): Promise<HabitWithEntries[]>;
  getHabit(
    habitId: number,
    userId: string,
  ): Promise<HabitWithEntries | undefined>;
  createHabit(
    data: CreateHabitRequest,
    patientId: number,
    userId: string,
  ): Promise<Habit>;
  updateHabit(
    habitId: number,
    data: UpdateHabitRequest,
    userId: string,
  ): Promise<Habit>;
  deleteHabit(habitId: number, userId: string): Promise<void>;
  toggleHabitEntry(
    habitId: number,
    date: string,
    userId: string,
  ): Promise<{ completed: boolean }>;

  // Social
  createFriendRequest(
    patientId: number,
    email: string,
    userId: string,
  ): Promise<FriendshipWithProfiles>;
  getFriendRequests(
    patientId: number,
    userId: string,
  ): Promise<FriendRequestsResponse>;
  acceptFriendRequest(
    requestId: number,
    patientId: number,
    userId: string,
  ): Promise<FriendshipWithProfiles>;
  declineFriendRequest(
    requestId: number,
    patientId: number,
    userId: string,
  ): Promise<FriendshipWithProfiles>;
  blockFriendRequest(
    requestId: number,
    patientId: number,
    userId: string,
  ): Promise<FriendshipWithProfiles>;
  listFriends(patientId: number, userId: string): Promise<SocialProfile[]>;
  removeFriend(
    patientId: number,
    friendPatientId: number,
    userId: string,
  ): Promise<void>;
  getFriendFeed(
    patientId: number,
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<FriendFeedResponse>;
  getSocialPrivacySettings(
    patientId: number,
    userId: string,
  ): Promise<SocialPrivacySettings>;
  updateSocialPrivacySettings(
    patientId: number,
    data: UpdateSocialPrivacySettingsRequest,
    userId: string,
  ): Promise<SocialPrivacySettings>;
  createHabitActivityEvent(
    actorPatientId: number,
    habitId: number,
    habitEntryId: number | null,
    eventType: HabitActivityEventType,
    eventDate?: string,
  ): Promise<void>;

  // Nutrition
  getNutritionGoal(
    patientId: number,
    userId: string,
  ): Promise<NutritionGoal | undefined>;
  upsertNutritionGoal(
    patientId: number,
    data: UpdateNutritionGoalRequest,
    userId: string,
  ): Promise<NutritionGoal>;
  getMeals(
    patientId: number,
    date: string,
    userId: string,
  ): Promise<MealWithItems[]>;
  createMeal(
    patientId: number,
    data: CreateMealRequest,
    userId: string,
  ): Promise<MealWithItems>;
  deleteMeal(mealId: number, userId: string): Promise<void>;

  // Ingredients
  getIngredients(patientId: number, userId: string): Promise<UserIngredient[]>;
  addIngredient(
    patientId: number,
    data: AddIngredientRequest,
    userId: string,
  ): Promise<UserIngredient>;
  addIngredients(
    patientId: number,
    data: AddIngredientRequest[],
    userId: string,
  ): Promise<UserIngredient[]>;
  deleteIngredient(ingredientId: number, userId: string): Promise<void>;

  // Recipes
  getSavedRecipes(patientId: number, userId: string): Promise<SavedRecipe[]>;
  saveRecipe(
    patientId: number,
    data: SaveRecipeRequest,
    userId: string,
  ): Promise<SavedRecipe>;
  deleteRecipe(recipeId: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Helper to verify patient ownership
  private async verifyOwnership(
    patientId: number,
    userId: string,
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
        "Access denied: patient does not belong to user",
      );
    }
    return patient;
  }

  private async getSocialProfile(patientId: number): Promise<SocialProfile> {
    const [profile] = await db
      .select({
        patientId: patients.id,
        displayName: patients.displayName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(patients)
      .leftJoin(users, eq(users.id, patients.userId))
      .where(eq(patients.id, patientId));

    if (!profile) {
      throw new UnauthorizedError("Patient not found");
    }

    return {
      patientId: profile.patientId,
      displayName: profile.displayName,
      profileImageUrl: profile.profileImageUrl ?? null,
    };
  }

  private async hydrateFriendship(
    friendship: Friendship,
  ): Promise<FriendshipWithProfiles> {
    const [requester, addressee] = await Promise.all([
      this.getSocialProfile(friendship.requesterPatientId),
      this.getSocialProfile(friendship.addresseePatientId),
    ]);

    return {
      ...friendship,
      requester,
      addressee,
    };
  }

  private async findFriendshipBetween(
    patientAId: number,
    patientBId: number,
  ): Promise<Friendship | undefined> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.requesterPatientId, patientAId),
            eq(friendships.addresseePatientId, patientBId),
          ),
          and(
            eq(friendships.requesterPatientId, patientBId),
            eq(friendships.addresseePatientId, patientAId),
          ),
        ),
      )
      .limit(1);

    return friendship;
  }

  private encodeFeedCursor(createdAt: Date, id: number): string {
    return `${createdAt.toISOString()}|${id}`;
  }

  private decodeFeedCursor(
    cursor?: string,
  ): { createdAt: Date; id: number } | undefined {
    if (!cursor) {
      return undefined;
    }

    const [isoDate, idStr] = cursor.split("|");
    if (!isoDate || !idStr) {
      return undefined;
    }

    const parsedDate = new Date(isoDate);
    const parsedId = Number(idStr);
    if (Number.isNaN(parsedDate.getTime()) || Number.isNaN(parsedId)) {
      return undefined;
    }

    return { createdAt: parsedDate, id: parsedId };
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

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createPatient(insertPatient: Partial<Patient>): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values({
        userId: insertPatient.userId,
        displayName: insertPatient.displayName || "User",
        heightCm: insertPatient.heightCm,
        gender: insertPatient.gender,
        dateOfBirth: insertPatient.dateOfBirth,
      })
      .returning();
    return patient;
  }

  async getOrCreatePatient(data: Partial<Patient>): Promise<Patient> {
    // Use upsert pattern to avoid race condition on concurrent requests
    await db
      .insert(patients)
      .values({
        userId: data.userId,
        displayName: data.displayName || "User",
        heightCm: data.heightCm,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
      })
      .onConflictDoNothing({ target: patients.userId });

    // Fetch the existing or just-created record
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.userId, data.userId!));

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
    userId: string,
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
    userId: string,
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
    userId?: string,
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
    userId?: string,
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
        eq(observations.id, observationComponents.observationId),
      )
      .where(and(...conditions))
      .orderBy(observations.effectiveAt);

    return results.map((r) => ({ ...r, date: r.date.toISOString() }));
  }

  // === GOALS ===
  async getGoal(
    patientId: number,
    month: string,
    userId: string,
  ): Promise<GoalWithTargets | undefined> {
    // Verify ownership before fetching goal
    await this.verifyOwnership(patientId, userId);

    const monthStart = `${month}-01`;
    const [goal] = await db.query.goals.findMany({
      where: and(
        eq(goals.patientId, patientId),
        eq(goals.monthStart, monthStart),
      ),
      limit: 1,
      with: { targets: { with: { metric: true } } },
    });
    return goal;
  }

  async upsertGoal(
    data: UpsertGoalRequest,
    patientId: number,
    userId: string,
  ): Promise<Goal> {
    // Verify ownership before upserting goal
    await this.verifyOwnership(patientId, userId);

    return await db.transaction(async (tx) => {
      const monthStart = `${data.month}-01`;
      const dateObj = new Date(data.month);
      const monthEnd = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth() + 1,
        0,
      )
        .toISOString()
        .split("T")[0];

      let [goal] = await tx
        .select()
        .from(goals)
        .where(
          and(eq(goals.patientId, patientId), eq(goals.monthStart, monthStart)),
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
    userId: string,
  ): Promise<number | undefined> {
    // Verify ownership before fetching metric value
    await this.verifyOwnership(patientId, userId);

    const [result] = await db
      .select({ value: observationComponents.value })
      .from(observationComponents)
      .innerJoin(
        observations,
        eq(observations.id, observationComponents.observationId),
      )
      .where(
        and(
          eq(observations.patientId, patientId),
          eq(observationComponents.metricCode, metricCode),
          gte(observations.effectiveAt, new Date(monthStart)),
          lte(observations.effectiveAt, new Date(monthEnd)),
        ),
      )
      .orderBy(desc(observations.effectiveAt), desc(observations.issuedAt))
      .limit(1);
    return result?.value;
  }

  async importMeasurements(
    patientId: number,
    rows: ImportRow[],
    strategy: "skip" | "overwrite",
  ): Promise<ImportResult> {
    // Note: We don't check userId here because the caller (processor) is expected
    // to have verified ownership or passed a verified patientId.
    // But to be safe, we could. However, this method only takes patientId.
    // Let's assume caller handles it for now, or we add userId param.
    // Given the signature, we'll proceed with patientId.

    return await db.transaction(async (tx) => {
      let imported = 0;
      let skipped = 0;
      let failed = 0; // We define failed but mostly we might throw or just log?
      // Actually, schema validation happened before. Here we handle DB constraints.

      // Group by date to minimize observations locally
      const byDate = new Map<string, ImportRow[]>();
      for (const row of rows) {
        if (!byDate.has(row.date)) byDate.set(row.date, []);
        byDate.get(row.date)?.push(row);
      }

      for (const [dateStr, dateRows] of Array.from(byDate.entries())) {
        const dateObj = new Date(dateStr);

        // Check for existing observation at this exact timestamp
        // Note: dateStr from import-parser is ISO string. valid.
        const existing = await tx.query.observations.findFirst({
          where: and(
            eq(observations.patientId, patientId),
            eq(observations.effectiveAt, dateObj),
          ),
          with: { components: true },
        });

        let observationId = existing?.id;

        if (!existing) {
          // Create new
          const [newObs] = await tx
            .insert(observations)
            .values({
              patientId,
              effectiveAt: dateObj,
              status: "final",
              category: "vital-signs",
            })
            .returning();
          observationId = newObs.id;
        }

        // Now handle components
        for (const row of dateRows) {
          const existingComp = existing?.components.find(
            (c) => c.metricCode === row.metricCode,
          );

          if (existingComp) {
            if (strategy === "overwrite") {
              await tx
                .update(observationComponents)
                .set({ value: row.value, unit: row.unit })
                .where(eq(observationComponents.id, existingComp.id));
              imported++;
            } else {
              skipped++;
            }
          } else {
            // Insert new component
            await tx.insert(observationComponents).values({
              observationId: observationId!,
              metricCode: row.metricCode,
              value: row.value,
              unit: row.unit,
            });
            imported++;
          }
        }
      }

      return {
        success: true,
        importedCount: imported,
        skippedCount: skipped,
        failedCount: failed,
        errors: [],
      };
    });
  }

  // === CALCULATIONS ===
  async getCalculations(
    patientId: number,
    userId: string,
  ): Promise<Calculation[]> {
    await this.verifyOwnership(patientId, userId);

    return await db
      .select()
      .from(calculations)
      .where(eq(calculations.patientId, patientId))
      .orderBy(desc(calculations.createdAt));
  }

  async createCalculation(
    data: Omit<InsertCalculation, "patientId">,
    patientId: number,
    userId: string,
  ): Promise<Calculation> {
    await this.verifyOwnership(patientId, userId);

    const [calculation] = await db
      .insert(calculations)
      .values({
        ...data,
        patientId,
      })
      .returning();

    return calculation;
  }

  // === HABITS ===
  private async verifyHabitOwnership(
    habitId: number,
    userId: string,
  ): Promise<Habit> {
    const [habit] = await db
      .select()
      .from(habits)
      .where(eq(habits.id, habitId));
    if (!habit) {
      throw new UnauthorizedError("Habit not found");
    }
    // Verify the habit belongs to this user's patient
    await this.verifyOwnership(habit.patientId, userId);
    return habit;
  }

  async getHabits(
    patientId: number,
    userId: string,
  ): Promise<HabitWithEntries[]> {
    await this.verifyOwnership(patientId, userId);

    const habitsList = await db.query.habits.findMany({
      where: eq(habits.patientId, patientId),
      with: { entries: true },
      orderBy: [desc(habits.createdAt)],
    });

    return habitsList.map((h) => ({
      ...h,
      completedDates: h.entries.filter((e) => e.completed).map((e) => e.date),
    }));
  }

  async getHabit(
    habitId: number,
    userId: string,
  ): Promise<HabitWithEntries | undefined> {
    await this.verifyHabitOwnership(habitId, userId);

    const habit = await db.query.habits.findFirst({
      where: eq(habits.id, habitId),
      with: { entries: true },
    });

    if (!habit) return undefined;

    return {
      ...habit,
      completedDates: habit.entries
        .filter((e) => e.completed)
        .map((e) => e.date),
    };
  }

  async createHabit(
    data: CreateHabitRequest,
    patientId: number,
    userId: string,
  ): Promise<Habit> {
    await this.verifyOwnership(patientId, userId);

    const today = new Date().toISOString().split("T")[0];
    const [habit] = await db
      .insert(habits)
      .values({
        patientId,
        title: data.title,
        color: data.color,
        icon: data.icon,
        startDate: today,
      })
      .returning();

    await this.createHabitActivityEvent(
      patientId,
      habit.id,
      null,
      "habit_created",
      today,
    );

    return habit;
  }

  async updateHabit(
    habitId: number,
    data: UpdateHabitRequest,
    userId: string,
  ): Promise<Habit> {
    await this.verifyHabitOwnership(habitId, userId);

    const [habit] = await db
      .update(habits)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(habits.id, habitId))
      .returning();

    return habit;
  }

  async deleteHabit(habitId: number, userId: string): Promise<void> {
    await this.verifyHabitOwnership(habitId, userId);

    await db.delete(habits).where(eq(habits.id, habitId));
  }

  async toggleHabitEntry(
    habitId: number,
    date: string,
    userId: string,
  ): Promise<{ completed: boolean }> {
    const habit = await this.verifyHabitOwnership(habitId, userId);

    // Check if entry exists for this date
    const [existing] = await db
      .select()
      .from(habitEntries)
      .where(
        and(eq(habitEntries.habitId, habitId), eq(habitEntries.date, date)),
      );

    if (existing) {
      // Toggle: if completed, delete; if not completed, set to completed
      if (existing.completed) {
        await db.delete(habitEntries).where(eq(habitEntries.id, existing.id));
        await this.createHabitActivityEvent(
          habit.patientId,
          habitId,
          null,
          "habit_uncompleted",
          date,
        );
        return { completed: false };
      } else {
        await db
          .update(habitEntries)
          .set({ completed: true })
          .where(eq(habitEntries.id, existing.id));
        await this.createHabitActivityEvent(
          habit.patientId,
          habitId,
          existing.id,
          "habit_completed",
          date,
        );
        return { completed: true };
      }
    } else {
      // Create new entry as completed
      const [created] = await db
        .insert(habitEntries)
        .values({
          habitId,
          date,
          completed: true,
        })
        .returning();

      await this.createHabitActivityEvent(
        habit.patientId,
        habitId,
        created.id,
        "habit_completed",
        date,
      );
      return { completed: true };
    }
  }

  // === SOCIAL ===
  async createFriendRequest(
    patientId: number,
    email: string,
    userId: string,
  ): Promise<FriendshipWithProfiles> {
    await this.verifyOwnership(patientId, userId);

    const normalizedEmail = email.trim().toLowerCase();
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!targetUser) {
      throw new UnauthorizedError("User not found");
    }

    let targetPatient = await this.getPatientByUserId(targetUser.id);
    if (!targetPatient) {
      targetPatient = await this.getOrCreatePatient({
        userId: targetUser.id,
        displayName: targetUser.firstName || targetUser.email || "User",
      });
    }

    if (targetPatient.id === patientId) {
      throw new UnauthorizedError(
        "You cannot send a friend request to yourself",
      );
    }

    const existingFriendship = await this.findFriendshipBetween(
      patientId,
      targetPatient.id,
    );

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        throw new UnauthorizedError("You are already friends");
      }

      if (existingFriendship.status === "pending") {
        throw new UnauthorizedError("Friend request already pending");
      }

      if (existingFriendship.status === "blocked") {
        throw new UnauthorizedError("Friend request blocked");
      }

      const [reopenedRequest] = await db
        .update(friendships)
        .set({
          requesterPatientId: patientId,
          addresseePatientId: targetPatient.id,
          status: "pending",
          createdAt: new Date(),
          respondedAt: null,
        })
        .where(eq(friendships.id, existingFriendship.id))
        .returning();

      return this.hydrateFriendship(reopenedRequest);
    }

    const [friendRequest] = await db
      .insert(friendships)
      .values({
        requesterPatientId: patientId,
        addresseePatientId: targetPatient.id,
        status: "pending",
      })
      .returning();

    return this.hydrateFriendship(friendRequest);
  }

  async getFriendRequests(
    patientId: number,
    userId: string,
  ): Promise<FriendRequestsResponse> {
    await this.verifyOwnership(patientId, userId);

    const [incomingRequests, outgoingRequests] = await Promise.all([
      db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.addresseePatientId, patientId),
            eq(friendships.status, "pending"),
          ),
        )
        .orderBy(desc(friendships.createdAt)),
      db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.requesterPatientId, patientId),
            eq(friendships.status, "pending"),
          ),
        )
        .orderBy(desc(friendships.createdAt)),
    ]);

    const [incoming, outgoing] = await Promise.all([
      Promise.all(
        incomingRequests.map((request) => this.hydrateFriendship(request)),
      ),
      Promise.all(
        outgoingRequests.map((request) => this.hydrateFriendship(request)),
      ),
    ]);

    return { incoming, outgoing };
  }

  async acceptFriendRequest(
    requestId: number,
    patientId: number,
    userId: string,
  ): Promise<FriendshipWithProfiles> {
    await this.verifyOwnership(patientId, userId);

    const [request] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, requestId));

    if (!request || request.addresseePatientId !== patientId) {
      throw new UnauthorizedError("Friend request not found");
    }

    if (request.status !== "pending") {
      throw new UnauthorizedError("Friend request is no longer pending");
    }

    const [accepted] = await db
      .update(friendships)
      .set({
        status: "accepted",
        respondedAt: new Date(),
      })
      .where(eq(friendships.id, requestId))
      .returning();

    return this.hydrateFriendship(accepted);
  }

  async declineFriendRequest(
    requestId: number,
    patientId: number,
    userId: string,
  ): Promise<FriendshipWithProfiles> {
    await this.verifyOwnership(patientId, userId);

    const [request] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, requestId));

    if (!request || request.addresseePatientId !== patientId) {
      throw new UnauthorizedError("Friend request not found");
    }

    if (request.status !== "pending") {
      throw new UnauthorizedError("Friend request is no longer pending");
    }

    const [declined] = await db
      .update(friendships)
      .set({
        status: "declined",
        respondedAt: new Date(),
      })
      .where(eq(friendships.id, requestId))
      .returning();

    return this.hydrateFriendship(declined);
  }

  async blockFriendRequest(
    requestId: number,
    patientId: number,
    userId: string,
  ): Promise<FriendshipWithProfiles> {
    await this.verifyOwnership(patientId, userId);

    const [request] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, requestId));

    if (!request) {
      throw new UnauthorizedError("Friend request not found");
    }

    const isParticipant =
      request.requesterPatientId === patientId ||
      request.addresseePatientId === patientId;

    if (!isParticipant) {
      throw new UnauthorizedError("Friend request not found");
    }

    if (request.status === "blocked") {
      return this.hydrateFriendship(request);
    }

    const [blocked] = await db
      .update(friendships)
      .set({
        status: "blocked",
        respondedAt: new Date(),
      })
      .where(eq(friendships.id, requestId))
      .returning();

    return this.hydrateFriendship(blocked);
  }

  async listFriends(
    patientId: number,
    userId: string,
  ): Promise<SocialProfile[]> {
    await this.verifyOwnership(patientId, userId);

    const relationships = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            eq(friendships.requesterPatientId, patientId),
            eq(friendships.addresseePatientId, patientId),
          ),
        ),
      )
      .orderBy(desc(friendships.createdAt));

    const friendIds = relationships.map((relationship) =>
      relationship.requesterPatientId === patientId
        ? relationship.addresseePatientId
        : relationship.requesterPatientId,
    );

    if (friendIds.length === 0) {
      return [];
    }

    return Promise.all(
      friendIds.map((friendId) => this.getSocialProfile(friendId)),
    );
  }

  async removeFriend(
    patientId: number,
    friendPatientId: number,
    userId: string,
  ): Promise<void> {
    await this.verifyOwnership(patientId, userId);

    const friendship = await this.findFriendshipBetween(
      patientId,
      friendPatientId,
    );
    if (!friendship || friendship.status !== "accepted") {
      throw new UnauthorizedError("Friendship not found");
    }

    await db.delete(friendships).where(eq(friendships.id, friendship.id));
  }

  async getFriendFeed(
    patientId: number,
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<FriendFeedResponse> {
    await this.verifyOwnership(patientId, userId);

    const safeLimit = Math.min(Math.max(limit ?? 25, 1), 100);
    const cursorToken = this.decodeFeedCursor(cursor);

    const acceptedRelationships = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            eq(friendships.requesterPatientId, patientId),
            eq(friendships.addresseePatientId, patientId),
          ),
        ),
      );

    const friendIds = acceptedRelationships.map((relationship) =>
      relationship.requesterPatientId === patientId
        ? relationship.addresseePatientId
        : relationship.requesterPatientId,
    );

    if (friendIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    const visibilityCondition = or(
      eq(socialPrivacySettings.shareHabitActivity, true),
      isNull(socialPrivacySettings.patientId),
    );

    const cursorCondition = cursorToken
      ? or(
          lt(habitActivityEvents.createdAt, cursorToken.createdAt),
          and(
            eq(habitActivityEvents.createdAt, cursorToken.createdAt),
            lt(habitActivityEvents.id, cursorToken.id),
          ),
        )
      : undefined;

    const whereClause = cursorCondition
      ? and(
          inArray(habitActivityEvents.actorPatientId, friendIds),
          visibilityCondition,
          cursorCondition,
        )
      : and(
          inArray(habitActivityEvents.actorPatientId, friendIds),
          visibilityCondition,
        );

    const rows = await db
      .select({
        id: habitActivityEvents.id,
        actorPatientId: habitActivityEvents.actorPatientId,
        actorDisplayName: patients.displayName,
        actorProfileImageUrl: users.profileImageUrl,
        eventType: habitActivityEvents.eventType,
        habitId: habits.id,
        habitTitle: habits.title,
        showHabitName: socialPrivacySettings.showHabitName,
        eventDate: habitActivityEvents.eventDate,
        createdAt: habitActivityEvents.createdAt,
      })
      .from(habitActivityEvents)
      .innerJoin(habits, eq(habits.id, habitActivityEvents.habitId))
      .innerJoin(patients, eq(patients.id, habitActivityEvents.actorPatientId))
      .leftJoin(users, eq(users.id, patients.userId))
      .leftJoin(
        socialPrivacySettings,
        eq(socialPrivacySettings.patientId, habitActivityEvents.actorPatientId),
      )
      .where(whereClause)
      .orderBy(
        desc(habitActivityEvents.createdAt),
        desc(habitActivityEvents.id),
      )
      .limit(safeLimit + 1);

    const hasMore = rows.length > safeLimit;
    const visibleRows = hasMore ? rows.slice(0, safeLimit) : rows;

    const items = visibleRows.map((row) => {
      const eventDate = row.eventDate ?? undefined;

      const createdAt =
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date(row.createdAt).toISOString();

      return {
        id: row.id,
        actor: {
          patientId: row.actorPatientId,
          displayName: row.actorDisplayName,
          profileImageUrl: row.actorProfileImageUrl ?? null,
        },
        eventType: row.eventType,
        habit:
          row.showHabitName === false
            ? { id: row.habitId }
            : { id: row.habitId, title: row.habitTitle },
        eventDate,
        createdAt,
      };
    });

    const lastRow = visibleRows[visibleRows.length - 1];
    const lastCreatedAt =
      lastRow?.createdAt instanceof Date
        ? lastRow.createdAt
        : lastRow
          ? new Date(lastRow.createdAt)
          : undefined;
    const nextCursor =
      hasMore && lastRow && lastCreatedAt
        ? this.encodeFeedCursor(lastCreatedAt, lastRow.id)
        : null;

    return {
      items,
      nextCursor,
    };
  }

  private async getOrCreateSocialPrivacySettings(
    patientId: number,
  ): Promise<SocialPrivacySettings> {
    await db
      .insert(socialPrivacySettings)
      .values({ patientId })
      .onConflictDoNothing({ target: socialPrivacySettings.patientId });

    const [settings] = await db
      .select()
      .from(socialPrivacySettings)
      .where(eq(socialPrivacySettings.patientId, patientId));

    if (!settings) {
      throw new UnauthorizedError("Failed to load social privacy settings");
    }

    return settings;
  }

  async getSocialPrivacySettings(
    patientId: number,
    userId: string,
  ): Promise<SocialPrivacySettings> {
    await this.verifyOwnership(patientId, userId);
    return this.getOrCreateSocialPrivacySettings(patientId);
  }

  async updateSocialPrivacySettings(
    patientId: number,
    data: UpdateSocialPrivacySettingsRequest,
    userId: string,
  ): Promise<SocialPrivacySettings> {
    await this.verifyOwnership(patientId, userId);
    await this.getOrCreateSocialPrivacySettings(patientId);

    const [updated] = await db
      .update(socialPrivacySettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(socialPrivacySettings.patientId, patientId))
      .returning();

    if (!updated) {
      throw new UnauthorizedError("Failed to update social privacy settings");
    }

    return updated;
  }

  async createHabitActivityEvent(
    actorPatientId: number,
    habitId: number,
    habitEntryId: number | null,
    eventType: HabitActivityEventType,
    eventDate?: string,
  ): Promise<void> {
    await db.insert(habitActivityEvents).values({
      actorPatientId,
      habitId,
      habitEntryId,
      eventType,
      eventDate,
    });
  }

  // === NUTRITION ===
  async getNutritionGoal(
    patientId: number,
    userId: string,
  ): Promise<NutritionGoal | undefined> {
    await this.verifyOwnership(patientId, userId);

    const [goal] = await db
      .select()
      .from(nutritionGoals)
      .where(eq(nutritionGoals.patientId, patientId));

    return goal;
  }

  async upsertNutritionGoal(
    patientId: number,
    data: UpdateNutritionGoalRequest,
    userId: string,
  ): Promise<NutritionGoal> {
    await this.verifyOwnership(patientId, userId);

    const existing = await this.getNutritionGoal(patientId, userId);

    if (existing) {
      const [updated] = await db
        .update(nutritionGoals)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(nutritionGoals.patientId, patientId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(nutritionGoals)
        .values({
          patientId,
          calories: data.calories ?? 2000,
          protein: data.protein ?? 150,
          carbs: data.carbs ?? 200,
          fat: data.fat ?? 65,
        })
        .returning();
      return created;
    }
  }

  async getMeals(
    patientId: number,
    date: string,
    userId: string,
  ): Promise<MealWithItems[]> {
    await this.verifyOwnership(patientId, userId);

    const mealsList = await db.query.meals.findMany({
      where: and(eq(meals.patientId, patientId), eq(meals.date, date)),
      with: { items: true },
      orderBy: [desc(meals.createdAt)],
    });

    return mealsList;
  }

  async createMeal(
    patientId: number,
    data: CreateMealRequest,
    userId: string,
  ): Promise<MealWithItems> {
    await this.verifyOwnership(patientId, userId);

    return await db.transaction(async (tx) => {
      const [meal] = await tx
        .insert(meals)
        .values({
          patientId,
          mealType: data.mealType,
          date: data.date,
          imageUrl: data.imageUrl,
        })
        .returning();

      const insertedItems = [];
      for (const item of data.items) {
        const [insertedItem] = await tx
          .insert(mealItems)
          .values({
            mealId: meal.id,
            name: item.name,
            quantity: item.quantity ?? 1,
            unit: item.unit ?? "serving",
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          })
          .returning();
        insertedItems.push(insertedItem);
      }

      return { ...meal, items: insertedItems };
    });
  }

  private async verifyMealOwnership(
    mealId: number,
    userId: string,
  ): Promise<typeof meals.$inferSelect> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, mealId));
    if (!meal) {
      throw new UnauthorizedError("Meal not found");
    }
    await this.verifyOwnership(meal.patientId, userId);
    return meal;
  }

  async deleteMeal(mealId: number, userId: string): Promise<void> {
    await this.verifyMealOwnership(mealId, userId);

    await db.delete(meals).where(eq(meals.id, mealId));
  }

  // === INGREDIENTS ===
  async getIngredients(
    patientId: number,
    userId: string,
  ): Promise<UserIngredient[]> {
    await this.verifyOwnership(patientId, userId);

    return await db
      .select()
      .from(userIngredients)
      .where(eq(userIngredients.patientId, patientId))
      .orderBy(desc(userIngredients.createdAt));
  }

  async addIngredient(
    patientId: number,
    data: AddIngredientRequest,
    userId: string,
  ): Promise<UserIngredient> {
    await this.verifyOwnership(patientId, userId);

    const [ingredient] = await db
      .insert(userIngredients)
      .values({
        patientId,
        name: data.name,
        quantity: data.quantity ?? 1,
        unit: data.unit ?? "unit",
        category: data.category ?? "other",
        expiresAt: data.expiresAt,
      })
      .returning();

    return ingredient;
  }

  async addIngredients(
    patientId: number,
    data: AddIngredientRequest[],
    userId: string,
  ): Promise<UserIngredient[]> {
    await this.verifyOwnership(patientId, userId);

    const ingredients: UserIngredient[] = [];
    for (const item of data) {
      const [ingredient] = await db
        .insert(userIngredients)
        .values({
          patientId,
          name: item.name,
          quantity: item.quantity ?? 1,
          unit: item.unit ?? "unit",
          category: item.category ?? "other",
          expiresAt: item.expiresAt,
        })
        .returning();
      ingredients.push(ingredient);
    }

    return ingredients;
  }

  private async verifyIngredientOwnership(
    ingredientId: number,
    userId: string,
  ): Promise<UserIngredient> {
    const [ingredient] = await db
      .select()
      .from(userIngredients)
      .where(eq(userIngredients.id, ingredientId));
    if (!ingredient) {
      throw new UnauthorizedError("Ingredient not found");
    }
    await this.verifyOwnership(ingredient.patientId, userId);
    return ingredient;
  }

  async deleteIngredient(ingredientId: number, userId: string): Promise<void> {
    await this.verifyIngredientOwnership(ingredientId, userId);
    await db
      .delete(userIngredients)
      .where(eq(userIngredients.id, ingredientId));
  }

  // === RECIPES ===
  async getSavedRecipes(
    patientId: number,
    userId: string,
  ): Promise<SavedRecipe[]> {
    await this.verifyOwnership(patientId, userId);

    return await db
      .select()
      .from(savedRecipes)
      .where(eq(savedRecipes.patientId, patientId))
      .orderBy(desc(savedRecipes.createdAt));
  }

  async saveRecipe(
    patientId: number,
    data: SaveRecipeRequest,
    userId: string,
  ): Promise<SavedRecipe> {
    await this.verifyOwnership(patientId, userId);

    const [recipe] = await db
      .insert(savedRecipes)
      .values({
        patientId,
        title: data.title,
        description: data.description,
        cuisineMode: data.cuisineMode,
        ingredients: JSON.stringify(data.ingredients),
        instructions: JSON.stringify(data.instructions),
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings ?? 2,
        difficulty: data.difficulty ?? "medium",
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
      })
      .returning();

    return recipe;
  }

  private async verifyRecipeOwnership(
    recipeId: number,
    userId: string,
  ): Promise<SavedRecipe> {
    const [recipe] = await db
      .select()
      .from(savedRecipes)
      .where(eq(savedRecipes.id, recipeId));
    if (!recipe) {
      throw new UnauthorizedError("Recipe not found");
    }
    await this.verifyOwnership(recipe.patientId, userId);
    return recipe;
  }

  async deleteRecipe(recipeId: number, userId: string): Promise<void> {
    await this.verifyRecipeOwnership(recipeId, userId);
    await db.delete(savedRecipes).where(eq(savedRecipes.id, recipeId));
  }
}

export const storage = new DatabaseStorage();
