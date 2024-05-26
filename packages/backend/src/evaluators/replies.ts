import { Run } from "shared"
import { lastMsg } from "../checks"
import openai from "@/src/utils/openai"
import lunary from "lunary"

export default async function evaluate(run: Run) {
  if (!run.input || !run.output)
    throw new Error("No input or output for evaluator 'replies'")

  const template = await lunary.renderTemplate("replied-question", {
    question: lastMsg(run.input),
    answer: lastMsg(run.output),
  })

  const res = await openai.chat.completions.create(template)

  const output = res.choices[0]?.message?.content

  if (!output) throw new Error("No output from AI")

  const result = output.split("\n")[0].toLowerCase().replace(".", "").trim()

  return result.includes("yes")
}
