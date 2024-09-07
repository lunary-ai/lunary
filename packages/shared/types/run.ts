import { z } from "zod";

export const Feedback = z.union([
  z.object({
    thumb: z.enum(["up", "down"]).nullable().optional(),
    comment: z.string().nullable(),
  }),
  z.null(),
]);

export type Feedback = z.infer<typeof Feedback>;

export interface Run {
  id: string;
  createdAt: string;
  endedAt?: string;
  duration?: string;
  tags?: string[];
  projectId: string;
  status?: string;
  name?: string;
  error?: Record<string, any>;
  input?: Record<string, any>;
  output?: Record<string, any>;
  params?: Record<string, any>;
  type: string;
  parentRunId?: string;
  promptTokens?: number;
  completionTokens?: number;
  cost?: number;
  externalUserId?: number;
  feedback?: Record<string, any>; // TODO: real feedback type, but need to check before
  isPublic: boolean;
  siblingRunId?: string;
  templateVersionId?: number;
  runtime?: string;
  metadata?: Record<string, any>;
  ipAddresses?: string[];
}
