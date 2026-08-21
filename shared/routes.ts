import { z } from "zod";
import { insertPatientSchema, patients } from "./schema";

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

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/login" as const,
      input: z.object({
        email: z.string().email(),
        password: z.string()
      }),
      responses: {
        200: z.object({ success: z.boolean(), token: z.string().optional() }),
        401: errorSchemas.validation
      }
    }
  },
  patients: {
    checkin: {
      method: "POST" as const,
      path: "/api/checkin" as const,
      input: insertPatientSchema,
      responses: {
        201: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    queue: {
      method: "GET" as const,
      path: "/api/queue/:department" as const,
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>()),
      },
    },
    stats: {
      method: "GET" as const,
      path: "/api/stats" as const,
      responses: {
        200: z.object({
          patientsToday: z.number(),
          patientsWaiting: z.number(),
          activeDepartments: z.number(),
          averageWaitTime: z.number()
        })
      }
    }
  }
}

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
