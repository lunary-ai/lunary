import { z } from "zod";
import { MessageSchema } from "./openai";

export type TemplateVariables = Record<string, string>; // TODO: remove

export const promptSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  slug: z.string(),
  projectId: z.string(),
  mode: z.enum(["openai", "text"]),
});
export type Prompt = z.infer<typeof promptSchema>;

export const promptVersionSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  extra: z.object({
    model: z.string(),
    max_tokens: z.number().default(4096),
    temperature: z.number().default(1),
  }),
  content: z.array(MessageSchema),
  version: z.number(),
  isDraft: z.boolean(),
});
export type PromptVersion = z.infer<typeof promptVersionSchema>;
