import openai from "@/src/utils/openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { Run } from "shared";
import { lastMsg } from "../checks";

interface AssertParams {
  conditions: string[];
}

export async function evaluate(run: Run, params: AssertParams) {
  const { conditions } = params;
  const conditionList = conditions.map((c) => `- ${c}`).join("\n");

  const assertSchema = z.object({
    result: z.boolean(),
    reason: z.string(),
  });

  const completion = await openai!.responses.parse({
    model: "gpt-5-mini",
    instructions: `
You help evaluate if a given interaction from an AI matches one or more assertions.
Return a JSON object with:
result → true if all assertions are satisfied, false otherwise
reason → brief explanation
`,
    input: `
User Input:
\`${lastMsg(run.input)}\`

AI Response/answer:
\`${lastMsg(run.output)}\`

Assertions:
${conditionList}
`,
    text: { format: zodTextFormat(assertSchema, "assert") },
  });

  if (completion.output_parsed === null) throw new Error("Failed to parse");

  const { result, reason } = completion.output_parsed;
  return { result, reason };
}
