import openai from "@/src/utils/openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export default async function aiFact(
  input: string,
  output: string,
  ideal: string,
) {
  const factSchema = z.object({
    result: z.enum(["A", "B", "C", "D", "E"]),
    reason: z.string(),
  });

  const completion = await openai!.responses.parse({
    model: "gpt-5-mini",
    instructions: `
You are comparing a submitted answer to an expert answer on a given question.

Classify their factual relationship using one of the following:
(A) Submission is a subset of the expert answer (fully consistent).
(B) Submission is a superset of the expert answer (fully consistent).
(C) Submission contains all the same details as the expert answer.
(D) There is a disagreement between the submission and the expert answer.
(E) Differences exist, but they don't matter from a factual standpoint.

Reply *only* with JSON matching the schema.
    `,
    input: `
[BEGIN DATA]
************
[Question]: ${input}
************
[Expert]: ${ideal}
************
[Submission]: ${output}
************
[END DATA]
    `,
    text: {
      format: zodTextFormat(factSchema, "fact"),
    },
  });

  if (completion.output_parsed === null) {
    throw new Error("Failed to parse completion");
  }

  const { result, reason } = completion.output_parsed;

  return {
    result,
    reason,
  };
}
