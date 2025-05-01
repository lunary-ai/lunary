import { callML } from "@/src/utils/ml";
import { Run } from "shared";

interface Params {
  prompt: string;
  model: string;
}

export async function evaluate(run: Run, params: Params) {
  try {
    const { prompt } = params;
    const result = await callML("assertion", {
      input: run.input,
      output: run.output,
      instructions: prompt,
      // model,
    });
    return result as { pass: boolean; reason: string };
  } catch (error) {
    console.error(error);
  }
}
