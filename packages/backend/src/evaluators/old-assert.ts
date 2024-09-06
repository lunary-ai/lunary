import openai from "@/src/utils/openai";
import lunary from "lunary";
import { Run } from "shared";
import { lastMsg } from "../checks";

interface AssertParams {
  conditions: string[];
}

// Used in playground
export async function evaluate(run: Run, params: AssertParams) {
  const { conditions } = params;

  const conditionList = conditions
    .map((condition) => `- ${condition}`)
    .join("\n");

  const template = await lunary.renderTemplate("assert-v2", {
    input: lastMsg(run.input),
    output: lastMsg(run.output),
    conditions: conditionList,
  });

  const res = await openai.chat.completions.create(template);

  const output = res.choices[0]?.message?.content;

  if (!output) "";

  const result = output.split("\n")[0].toLowerCase().replace(".", "").trim();
  const reason = output.split("\n").slice(1).join("\n");

  return {
    result: result === "yes",
    reason,
  };
}
