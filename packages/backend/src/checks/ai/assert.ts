import openai from "@/src/utils/openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export default async function aiAssert(sentence: string, assertion: string) {
  const assertSchema = z.object({
    passed: z.boolean(),
    reason: z.string(),
  });

  const completion = await openai!.responses.parse({
    model: "gpt-4.1",
    instructions: `
You help evaluate if a given response from an AI matches a given assertion.
Return a JSON object with:
passed → true if the assertion is fully satisfied, false otherwise
reason → brief explanation
`,
    input: `
AI Response:
\`${sentence}\`

Assertion:
\`${assertion}\`
`,
    text: { format: zodTextFormat(assertSchema, "assert") },
  });

  if (completion.output_parsed === null) {
    throw new Error("Failed to parse completion");
  }

  const { passed, reason } = completion.output_parsed;

  return { passed, reason };
}
