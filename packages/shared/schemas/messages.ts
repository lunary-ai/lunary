import { z } from "zod";

const textContentPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const imageContentPartSchema = z.object({
  type: z.literal("image_url"),
  image_url: z.object({
    url: z.string(),
    detail: z.string().optional(),
  }),
});

const contentPartSchema = z.union([
  textContentPartSchema,
  imageContentPartSchema,
]);

export const userMessageSchema = z.object({
  role: z.literal("user"),
  content: z.union([z.string(), z.array(contentPartSchema)]),
  name: z.string().optional(),
});
export type UserMessage = z.infer<typeof userMessageSchema>;
