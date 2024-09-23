import { callML } from "@/src/utils/ml";
import { Run } from "shared";

interface Params {
  statement: string;
  model: string;
}

export async function evaluate(run: Run, params: Params) {
  try {
    const { statement, model } = params;
    const result = await callML("assertion", {
      input: run.input,
      output: run.output,
      statement,
      model,
    });
    return result;
  } catch (error) {
    console.error(error);
  }
}
