import { z } from "zod";
import {
  createMeasurementSchema,
  upsertGoalSchema,
  createHabitSchema,
  updateHabitSchema,
  toggleHabitEntrySchema,
  sendFriendRequestSchema,
  socialFeedQuerySchema,
  updateSocialPrivacySettingsSchema,
  friendshipStatusEnum,
  habitActivityEventTypeEnum,
  updateNutritionGoalSchema,
  createMealSchema,
  metrics,
  patients,
  observations,
  goals,
  calculations,
  habits,
  nutritionGoals,
  meals,
  insertCalculationSchema,
  addIngredientSchema,
  addIngredientsSchema,
  scanIngredientsSchema,
  suggestRecipesSchema,
  saveRecipeSchema,
} from "./schema";

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const socialProfileSchema = z.object({
  patientId: z.number(),
  displayName: z.string(),
  profileImageUrl: z.string().nullable(),
});

const friendshipWithProfilesSchema = z.object({
  id: z.number(),
  requesterPatientId: z.number(),
  addresseePatientId: z.number(),
  status: friendshipStatusEnum,
  createdAt: z.string(),
  respondedAt: z.string().nullable(),
  requester: socialProfileSchema,
  addressee: socialProfileSchema,
});

const friendRequestsResponseSchema = z.object({
  incoming: z.array(friendshipWithProfilesSchema),
  outgoing: z.array(friendshipWithProfilesSchema),
});

const friendFeedItemSchema = z.object({
  id: z.number(),
  actor: socialProfileSchema,
  eventType: habitActivityEventTypeEnum,
  habit: z.object({
    id: z.number(),
    title: z.string().optional(),
  }),
  eventDate: z.string().optional(),
  createdAt: z.string(),
});

const friendFeedResponseSchema = z.object({
  items: z.array(friendFeedItemSchema),
  nextCursor: z.string().nullable(),
});

const socialPrivacySettingsResponseSchema = z.object({
  patientId: z.number(),
  shareHabitActivity: z.boolean(),
  showHabitName: z.boolean(),
  updatedAt: z.string(),
});

// ============================================
// API CONTRACT
// ============================================
export const api = {
  bootstrap: {
    get: {
      method: "GET" as const,
      path: "/api/bootstrap",
      responses: {
        200: z.object({
          patient: z.custom<typeof patients.$inferSelect>(),
          metrics: z.array(z.custom<typeof metrics.$inferSelect>()),
        }),
      },
    },
  },
  measurements: {
    create: {
      method: "POST" as const,
      path: "/api/measurements",
      input: createMeasurementSchema,
      responses: {
        201: z.object({
          observationId: z.number(),
          count: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
    latest: {
      method: "GET" as const,
      path: "/api/measurements/latest",
      input: z.object({ patientId: z.string().optional() }).optional(),
      responses: {
        200: z.custom<any>(), // Returns ObservationWithComponents or null
      },
    },
    list: {
      // For history/charts
      method: "GET" as const,
      path: "/api/measurements",
      input: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
      responses: {
        200: z.array(z.custom<any>()), // Array of ObservationWithComponents
      },
    },
  },
  metrics: {
    timeseries: {
      method: "GET" as const,
      path: "/api/metrics/:code/timeseries",
      input: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
      responses: {
        200: z.array(
          z.object({
            date: z.string(),
            value: z.number(),
          }),
        ),
        404: errorSchemas.notFound,
      },
    },
  },
  goals: {
    upsert: {
      method: "PUT" as const,
      path: "/api/goals",
      input: upsertGoalSchema,
      responses: {
        200: z.custom<typeof goals.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/goals",
      input: z.object({ month: z.string() }), // YYYY-MM
      responses: {
        200: z.custom<any>(), // GoalWithTargets or null
      },
    },
    progress: {
      method: "GET" as const,
      path: "/api/progress",
      input: z.object({ month: z.string() }), // YYYY-MM
      responses: {
        200: z.array(
          z.object({
            metricCode: z.string(),
            metricName: z.string(),
            currentValue: z.number().nullable(),
            targetValue: z.number().nullable(),
            unit: z.string(),
            status: z.enum(["on-track", "off-track", "no-data", "no-target"]),
            delta: z.number().nullable(),
            direction: z.string().optional(),
          }),
        ),
      },
    },
  },
  import: {
    preview: {
      method: "POST" as const,
      path: "/api/import/preview",
      // multipart/form-data, body is not JSON validated here, handled by multer
      responses: {
        200: z.custom<any>(), // ImportPreview
        400: errorSchemas.validation,
      },
    },
    confirm: {
      method: "POST" as const,
      path: "/api/import/confirm",
      input: z.object({
        rows: z.array(z.custom<any>()), // ImportRow[]
        mergeStrategy: z.enum(["skip", "overwrite"]).default("skip"),
      }),
      responses: {
        200: z.custom<any>(), // ImportResult
        400: errorSchemas.validation,
      },
    },
    template: {
      method: "GET" as const,
      path: "/api/import/template",
      responses: {
        200: z.any(), // File download
      },
    },
  },
  export: {
    fhir: {
      patient: {
        method: "GET" as const,
        path: "/api/export/fhir/patient",
        responses: {
          200: z.custom<any>(), // FHIRPatient
        },
      },
      observations: {
        method: "GET" as const,
        path: "/api/export/fhir/observations",
        input: z
          .object({
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional(),
        responses: {
          200: z.custom<any>(), // FHIRBundle
        },
      },
      goals: {
        method: "GET" as const,
        path: "/api/export/fhir/goals",
        input: z
          .object({
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional(),
        responses: {
          200: z.custom<any>(), // FHIRBundle
        },
      },
      bundle: {
        method: "GET" as const,
        path: "/api/export/fhir/bundle",
        input: z
          .object({
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional(),
        responses: {
          200: z.custom<any>(), // FHIRBundle
        },
      },
    },
  },
  calculations: {
    list: {
      method: "GET" as const,
      path: "/api/calculations",
      responses: {
        200: z.array(z.custom<typeof calculations.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/calculations",
      input: insertCalculationSchema,
      responses: {
        201: z.custom<typeof calculations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  habits: {
    list: {
      method: "GET" as const,
      path: "/api/habits",
      responses: {
        200: z.array(z.custom<any>()), // HabitWithEntries[]
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/habits/:id",
      responses: {
        200: z.custom<any>(), // HabitWithEntries
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/habits",
      input: createHabitSchema,
      responses: {
        201: z.custom<typeof habits.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/habits/:id",
      input: updateHabitSchema,
      responses: {
        200: z.custom<typeof habits.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/habits/:id",
      responses: {
        204: z.undefined(),
        404: errorSchemas.notFound,
      },
    },
    toggleEntry: {
      method: "POST" as const,
      path: "/api/habits/:id/entries",
      input: toggleHabitEntrySchema,
      responses: {
        200: z.object({ completed: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
  },
  social: {
    friends: {
      requests: {
        create: {
          method: "POST" as const,
          path: "/api/social/friends/requests",
          input: sendFriendRequestSchema,
          responses: {
            201: friendshipWithProfilesSchema,
            400: errorSchemas.validation,
            404: errorSchemas.notFound,
          },
        },
        list: {
          method: "GET" as const,
          path: "/api/social/friends/requests",
          responses: {
            200: friendRequestsResponseSchema,
          },
        },
        accept: {
          method: "POST" as const,
          path: "/api/social/friends/requests/:id/accept",
          responses: {
            200: friendshipWithProfilesSchema,
            404: errorSchemas.notFound,
          },
        },
        decline: {
          method: "POST" as const,
          path: "/api/social/friends/requests/:id/decline",
          responses: {
            200: friendshipWithProfilesSchema,
            404: errorSchemas.notFound,
          },
        },
        block: {
          method: "POST" as const,
          path: "/api/social/friends/requests/:id/block",
          responses: {
            200: friendshipWithProfilesSchema,
            404: errorSchemas.notFound,
          },
        },
      },
      list: {
        method: "GET" as const,
        path: "/api/social/friends",
        responses: {
          200: z.array(socialProfileSchema),
        },
      },
      remove: {
        method: "DELETE" as const,
        path: "/api/social/friends/:friendPatientId",
        responses: {
          204: z.undefined(),
          404: errorSchemas.notFound,
        },
      },
    },
    feed: {
      list: {
        method: "GET" as const,
        path: "/api/social/feed",
        input: socialFeedQuerySchema.optional(),
        responses: {
          200: friendFeedResponseSchema,
        },
      },
    },
    privacy: {
      get: {
        method: "GET" as const,
        path: "/api/social/privacy",
        responses: {
          200: socialPrivacySettingsResponseSchema,
        },
      },
      update: {
        method: "PUT" as const,
        path: "/api/social/privacy",
        input: updateSocialPrivacySettingsSchema,
        responses: {
          200: socialPrivacySettingsResponseSchema,
          400: errorSchemas.validation,
        },
      },
    },
    friendshipStatus: friendshipStatusEnum,
  },
  nutrition: {
    goals: {
      get: {
        method: "GET" as const,
        path: "/api/nutrition/goals",
        responses: {
          200: z.custom<typeof nutritionGoals.$inferSelect>(),
        },
      },
      update: {
        method: "POST" as const,
        path: "/api/nutrition/goals",
        input: updateNutritionGoalSchema,
        responses: {
          200: z.custom<typeof nutritionGoals.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
    },
    meals: {
      list: {
        method: "GET" as const,
        path: "/api/nutrition/meals",
        input: z
          .object({
            date: z.string().optional(),
          })
          .optional(),
        responses: {
          200: z.array(z.custom<any>()), // MealWithItems[]
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/nutrition/meals",
        input: createMealSchema,
        responses: {
          201: z.custom<any>(), // MealWithItems
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/nutrition/meals/:id",
        responses: {
          204: z.undefined(),
          404: errorSchemas.notFound,
        },
      },
    },
    analysis: {
      analyze: {
        method: "POST" as const,
        path: "/api/nutrition/analyze-image",
        input: z.object({
          imageUrl: z.string(),
          provider: z.enum(["openai", "gemini"]).optional(),
        }),
        responses: {
          200: z.object({
            foods: z.array(
              z.object({
                name: z.string(),
                calories: z.number(),
                protein: z.number(),
                carbs: z.number(),
                fat: z.number(),
                confidence: z.number(),
                quantity: z.number(),
                unit: z.string(),
              }),
            ),
          }),
          500: errorSchemas.internal,
        },
      },
    },
    ingredients: {
      list: {
        method: "GET" as const,
        path: "/api/nutrition/ingredients",
        responses: {
          200: z.array(z.custom<any>()),
        },
      },
      add: {
        method: "POST" as const,
        path: "/api/nutrition/ingredients",
        input: addIngredientSchema,
        responses: {
          201: z.custom<any>(),
          400: errorSchemas.validation,
        },
      },
      addBulk: {
        method: "POST" as const,
        path: "/api/nutrition/ingredients/bulk",
        input: addIngredientsSchema,
        responses: {
          201: z.array(z.custom<any>()),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/nutrition/ingredients/:id",
        responses: {
          204: z.undefined(),
          404: errorSchemas.notFound,
        },
      },
      scan: {
        method: "POST" as const,
        path: "/api/nutrition/ingredients/scan",
        input: scanIngredientsSchema,
        responses: {
          200: z.object({
            ingredients: z.array(
              z.object({
                name: z.string(),
                quantity: z.number(),
                unit: z.string(),
                category: z.string(),
                confidence: z.number(),
              }),
            ),
          }),
          500: errorSchemas.internal,
        },
      },
    },
    recipes: {
      suggest: {
        method: "POST" as const,
        path: "/api/nutrition/recipes/suggest",
        input: suggestRecipesSchema,
        responses: {
          200: z.object({
            recipes: z.array(
              z.object({
                title: z.string(),
                description: z.string(),
                ingredients: z.array(z.string()),
                instructions: z.array(z.string()),
                prepTime: z.number(),
                cookTime: z.number(),
                servings: z.number(),
                difficulty: z.enum(["easy", "medium", "hard"]),
                macros: z.object({
                  calories: z.number(),
                  protein: z.number(),
                  carbs: z.number(),
                  fat: z.number(),
                }),
              }),
            ),
          }),
          500: errorSchemas.internal,
        },
      },
      saved: {
        method: "GET" as const,
        path: "/api/nutrition/recipes/saved",
        responses: {
          200: z.array(z.custom<any>()),
        },
      },
      save: {
        method: "POST" as const,
        path: "/api/nutrition/recipes/save",
        input: saveRecipeSchema,
        responses: {
          201: z.custom<any>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/nutrition/recipes/:id",
        responses: {
          204: z.undefined(),
          404: errorSchemas.notFound,
        },
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(
  path: string,
  params?: Record<string, string | number>,
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
