import { z } from "zod";

export const jobStatusSchema = z.enum(["pending", "running", "done", "failed"]);

const isoDateString = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime(),
);

export const jobSchema = z.object({
  id: z.string().uuid(),
  createdAt: isoDateString,
  endedAt: isoDateString.nullable(),
  orgId: z.string().uuid(),
  type: z.string(),
  status: jobStatusSchema,
  progress: z.number().nonnegative(),
  error: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type Job = z.infer<typeof jobSchema>;
