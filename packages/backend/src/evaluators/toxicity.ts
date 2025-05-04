/**
 * Toxicity evaluator
 *
 * Runtime: Bun (TypeScript)
 *
 * It validates OpenAI‑style messages contained in a `Run` object,
 * sends them to the Python ML micro‑service (`/toxicity` endpoint),
 * validates the service response and returns it to the caller.
 *
 * The caller (worker) can then decide how to persist the data
 * (run_toxicity row, JSONB column, etc.).
 */

import { z } from "zod";
import { MessageSchema } from "shared/schemas/openai";
import { callML } from "../utils/ml";
import { Run } from "shared";

const toxicLabelArr = z.array(z.string());

const toxicMessage = z.object({
  idx: z.number(),
  labels: toxicLabelArr,
  // 7 probabilities in the fixed Detoxify label order
  scores: z.array(z.number()).min(7).max(7),
});

export const ToxicityResponseSchema = z.object({
  toxic_input: z.boolean(),
  toxic_output: z.boolean(),
  input_labels: toxicLabelArr,
  output_labels: toxicLabelArr,
  messages: z.object({
    input: z.array(toxicMessage),
    output: z.array(toxicMessage),
  }),
});

export type ToxicityResult = z.infer<typeof ToxicityResponseSchema>;

/**
 * Evaluate a single run for toxicity.
 *
 * `run.output` is a single OpenAI message or null.
 *
 * @throws  ZodError if run.input or run.output are not valid OpenAI messages
 *          or if the Python service returns an unexpected payload.
 */
export async function evaluate({
  input,
  output,
}: {
  input: unknown;
  output: unknown;
}): Promise<ToxicityResult> {
  const inputMessages = MessageSchema.array().parse(input);
  const outputMessage = output ? MessageSchema.parse(output) : null;

  const resp = await callML("toxicity", {
    messages: outputMessage
      ? [...inputMessages, outputMessage]
      : [...inputMessages],
  });

  return ToxicityResponseSchema.parse(resp);
}
