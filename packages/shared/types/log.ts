import { z } from "zod"

export const Feedback = z.union([
  z.object({
    thumb: z.enum(["up", "down"]).nullable().optional(),
    comment: z.string().nullable(),
  }),
  z.null(),
])

export type Feedback = z.infer<typeof Feedback>
