import { z } from 'zod';
import { 
  createMeasurementSchema, 
  upsertGoalSchema, 
  metrics,
  patients,
  observations,
  goals
} from './schema';

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
      method: 'GET' as const,
      path: '/api/bootstrap',
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
      method: 'POST' as const,
      path: '/api/measurements',
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
      method: 'GET' as const,
      path: '/api/measurements/latest',
      input: z.object({ patientId: z.string().optional() }).optional(),
      responses: {
        200: z.custom<any>(), // Returns ObservationWithComponents or null
      },
    },
    list: { // For history/charts
      method: 'GET' as const,
      path: '/api/measurements',
      input: z.object({ 
        from: z.string().optional(), 
        to: z.string().optional() 
      }).optional(),
      responses: {
        200: z.array(z.custom<any>()), // Array of ObservationWithComponents
      },
    }
  },
  metrics: {
    timeseries: {
      method: 'GET' as const,
      path: '/api/metrics/:code/timeseries',
      input: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.object({
          date: z.string(),
          value: z.number(),
        })),
        404: errorSchemas.notFound,
      },
    },
  },
  goals: {
    upsert: {
      method: 'PUT' as const,
      path: '/api/goals',
      input: upsertGoalSchema,
      responses: {
        200: z.custom<typeof goals.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/goals',
      input: z.object({ month: z.string() }), // YYYY-MM
      responses: {
        200: z.custom<any>(), // GoalWithTargets or null
      },
    },
    progress: {
      method: 'GET' as const,
      path: '/api/progress',
      input: z.object({ month: z.string() }), // YYYY-MM
      responses: {
        200: z.array(z.object({
          metricCode: z.string(),
          metricName: z.string(),
          currentValue: z.number().nullable(),
          targetValue: z.number().nullable(),
          unit: z.string(),
          status: z.enum(["on-track", "off-track", "no-data", "no-target"]),
          delta: z.number().nullable(),
          direction: z.string().optional(),
        })),
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
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
