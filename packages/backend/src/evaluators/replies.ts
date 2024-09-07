import { Run } from "shared";
import { lastMsg } from "../checks";
import openai from "@/src/utils/openai";
import lunary from "lunary";

export async function evaluate(run: Run) {
  if (!run.input || !run.output) {
    return null;
  }

  const template = await lunary.renderTemplate("replied-question", {
    question: lastMsg(run.input),
    answer: lastMsg(run.output),
  });

  const res = await openai.chat.completions.create(template);

  const output = res.choices[0]?.message?.content;

  if (!output) "";

  const result = output.split("\n")[0].toLowerCase().replace(".", "").trim();

  return result.includes("yes") + "";
}
