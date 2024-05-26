import { Run } from "shared"
import { lastMsg } from "../checks"
import openai from "@/src/utils/openai"
import lunary from "lunary"

export default async function evaluate(run: Run) {
  const input = lastMsg(run.input)

  const template = await lunary.renderTemplate("sentiment", {
    input,
  })

  const res = await openai.chat.completions.create(template)

  const output = res.choices[0]?.message?.content

  if (!output) throw new Error("No output from AI")

  const result = parseFloat(output.toLowerCase().trim())

  return result
}
