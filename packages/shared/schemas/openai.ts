import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                 */
/* ------------------------------------------------------------------ */

const Nullable = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullable().optional();

/* ------------------------------------------------------------------ */
/*  Content‑Part Schemas                                              */
/* ------------------------------------------------------------------ */

/** text */
export const ChatCompletionContentPartTextSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

/** image */
export const ChatCompletionContentPartImageURLSchema = z.object({
  url: z.string().url(),
  detail: z.enum(["auto", "low", "high"]).optional(),
});
export const ChatCompletionContentPartImageSchema = z.object({
  type: z.literal("image_url"),
  image_url: ChatCompletionContentPartImageURLSchema,
});

/** file */
export const ChatCompletionContentPartFileFileSchema = z.object({
  file_id: z.string(),
});
export const ChatCompletionContentPartFileSchema = z.object({
  type: z.literal("file"),
  file: ChatCompletionContentPartFileFileSchema,
});

/** input_audio */
export const ChatCompletionContentPartInputAudioInputSchema = z.object({
  url: z.string(), // openai spec simply requires base64‑encoded or URL
  format: z.string().optional(),
});
export const ChatCompletionContentPartInputAudioSchema = z.object({
  type: z.literal("input_audio"),
  input_audio: ChatCompletionContentPartInputAudioInputSchema,
});

/** refusal (assistant‑only streaming delta) */
export const ChatCompletionContentPartRefusalSchema = z.object({
  type: z.literal("refusal"),
  refusal: z.string(),
});

/** union */
export const ChatCompletionContentPartSchema = z.union([
  ChatCompletionContentPartTextSchema,
  ChatCompletionContentPartImageSchema,
  ChatCompletionContentPartInputAudioSchema,
  ChatCompletionContentPartFileSchema,
  ChatCompletionContentPartRefusalSchema,
]);

/* ------------------------------------------------------------------ */
/*  Tool‑Call Schemas                                                 */
/* ------------------------------------------------------------------ */

export const ChatCompletionMessageToolCallFunctionSchema = z.object({
  name: z.string(),
  arguments: z.string(),
});

export const ChatCompletionMessageToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: ChatCompletionMessageToolCallFunctionSchema,
});

/* ------------------------------------------------------------------ */
/*  Audio output placeholder                                          */
/* ------------------------------------------------------------------ */

export const ChatCompletionAudioSchema = z.any(); // keep open for now

/* ------------------------------------------------------------------ */
/*  Message Param Schemas                                             */
/* ------------------------------------------------------------------ */

/** developer */
export const ChatCompletionDeveloperMessageParamSchema = z.object({
  role: z.literal("developer"),
  content: z.union([z.string(), z.array(ChatCompletionContentPartTextSchema)]),
  name: z.string().optional(),
});

/** system */
export const ChatCompletionSystemMessageParamSchema = z.object({
  role: z.literal("system"),
  content: z.union([z.string(), z.array(ChatCompletionContentPartTextSchema)]),
  name: z.string().optional(),
});

/** user */
export const ChatCompletionUserMessageParamSchema = z.object({
  role: z.literal("user"),
  content: z.union([z.string(), z.array(ChatCompletionContentPartSchema)]),
  name: z.string().optional(),
});

/** assistant */
export const ChatCompletionAssistantMessageParamSchema = z.object({
  role: z.literal("assistant"),
  content: Nullable(
    z.union([z.string(), z.array(ChatCompletionContentPartSchema)]),
  ),
  audio: Nullable(ChatCompletionAudioSchema),
  refusal: Nullable(z.string()),
  function_call: Nullable(
    z.object({
      name: z.string(),
      arguments: z.string(),
    }),
  ),
  tool_calls: z.array(ChatCompletionMessageToolCallSchema).optional(),
  name: z.string().optional(),
});

/** tool */
export const ChatCompletionToolMessageParamSchema = z.object({
  role: z.literal("tool"),
  tool_call_id: z.string(),
  content: z.union([z.string(), z.array(ChatCompletionContentPartSchema)]),
});

/** deprecated function */
export const ChatCompletionFunctionMessageParamSchema = z.object({
  role: z.literal("function"),
  name: z.string(),
  content: z.string().nullable(),
});

/* ------------------------------------------------------------------ */
/*  Union                                                              */
/* ------------------------------------------------------------------ */

export const MessageSchema = z.discriminatedUnion("role", [
  ChatCompletionDeveloperMessageParamSchema,
  ChatCompletionSystemMessageParamSchema,
  ChatCompletionUserMessageParamSchema,
  ChatCompletionAssistantMessageParamSchema,
  ChatCompletionToolMessageParamSchema,
  ChatCompletionFunctionMessageParamSchema,
]);

export type Message = z.infer<typeof MessageSchema>;
export type ChatCompletionContentPart = z.infer<
  typeof ChatCompletionContentPartSchema
>;
