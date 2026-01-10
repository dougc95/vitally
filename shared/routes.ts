import { z } from "zod";
import {
  createMeasurementSchema,
  upsertGoalSchema,
  createHabitSchema,
  updateHabitSchema,
  toggleHabitEntrySchema,
  metrics,
  patients,
  observations,
  goals,
  calculations,
  habits,
  insertCalculationSchema,
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
          })
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
          })
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
};

// ============================================
// HELPER
// ============================================
export function buildUrl(
  path: string,
  params?: Record<string, string | number>
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
