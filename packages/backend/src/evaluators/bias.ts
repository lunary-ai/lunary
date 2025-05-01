import { callML } from "@/src/utils/ml";
import { Run } from "shared";
import { z } from "zod";
import { parseMessages } from "./utils";
import { cat } from "@xenova/transformers";

const biasSchema = z.array(
  z.union([z.null(), z.object({ reason: z.string() })]),
);
type Toxicity = z.infer<typeof toxicitySchema>;

export interface ToxicityEvaluation {
  input: Toxicity;
  output: Toxicity;
}

async function getToxicity(texts: string[]): Promise<Toxicity> {
  const raw = await callML("toxicity", { texts });
  return toxicitySchema.parse(raw);
}

export async function evaluate(run: Run): Promise<ToxicityEvaluation | null> {
  const inputTexts = parseMessages(run.input);
  const outputTexts = parseMessages(run.output);

  try {
    const [input, output] = await Promise.all([
      inputTexts ? getToxicity(inputTexts) : Promise.resolve([null]),
      outputTexts ? getToxicity(outputTexts) : Promise.resolve([null]),
    ]);
    return { input, output };
  } catch (error) {
    console.error(error);
    return null;
  }
}
