import { Run } from "shared";
import { isOpenAIMessage, lastMsg } from "../checks";
import openai from "@/src/utils/openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export async function evaluate(run: Run) {
  if (!Array.isArray(run.input) || !run.input.every(isOpenAIMessage)) return "";
  if (run.input[0].role !== "system") return "";

  const systemGuidelines = run.input[0].content;
  const answer = lastMsg(run.output);
  if (!answer) return "";

  const evalSchema = z.object({
    result: z.boolean(),
    reason: z.string(),
  });

  const completion = await openai!.responses.parse({
    model: "gpt-5-mini",
    instructions: `
You are judging whether an assistant answer fully complies with the provided GUIDELINES.

Reply **only** with JSON matching the schema:
{
  "result": boolean,   // true if every guideline is followed
  "reason": string          // short justification
}
    `,
    input: `
GUIDELINES:
${systemGuidelines}

ANSWER:
${answer}
    `,
    text: {
      format: zodTextFormat(evalSchema, "evaluation"),
    },
  });

  if (completion.output_parsed === null)
    throw new Error("Failed to parse completion");

  const { result, reason } = completion.output_parsed;

  return {
    result,
    reason,
  };
}
