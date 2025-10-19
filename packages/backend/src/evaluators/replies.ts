import { Run } from "shared";
import { lastMsg } from "../checks";
import openai from "@/src/utils/openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export async function evaluate(run: Run) {
  if (!run.input || !run.output) return null;

  const question = lastMsg(run.input);
  const answer = lastMsg(run.output);
  if (!question || !answer) return null;

  const evalSchema = z.object({
    result: z.enum(["YES", "NO"]),
    reason: z.string().optional().default(""),
  });

  const completion = await openai!.responses.parse({
    model: "gpt-5-mini",
    instructions: `
You judge whether the ANSWER actually addresses the QUESTION / instruction.

• Return "YES" if it does.  
• Return "NO" if it does not.  
• If the prompt isn’t really a question (e.g.\ a statement), treat it as answered and return "YES".

Reply *only* with JSON matching the schema.
    `,
    input: `
QUESTION:
${question}

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
    result: result === "YES",
    reason,
  };
}
