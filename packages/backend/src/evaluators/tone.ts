import { Run } from "shared"
import openai from "@/src/utils/openai"
import lunary from "lunary"
import { lastMsg } from "../checks"

interface ToneParams {
  tone: string[]
}

export async function evaluate(run: Run, params: ToneParams) {
  const { tone } = params

  const toneList = tone.join("\n")

  const template = await lunary.renderTemplate("tones", {
    input: lastMsg(run.output),
    tone: toneList,
  })

  const res = await openai.chat.completions.create(template)

  const output = res.choices[0]?.message?.content

  if (!output) return []

  // if the first line is 'None' as instructed in the prompt, return an empty array
  if (output.split("\n")[0].toLowerCase().includes("none")) {
    return []
  }

  const results = output
    .split("\n")
    .map((line: string) => line.toLowerCase().replace(".", "").trim())

  return results
}
