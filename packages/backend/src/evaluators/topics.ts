import { Run } from "shared"
import openai from "@/src/utils/openai"
import lunary from "lunary"

interface TopicsParams {
  topics: string[]
}

export async function evaluate(run: Run, params: TopicsParams) {
  const { topics } = params

  run.inputText = run.inputText || ""
  run.outputText = run.outputText || ""

  const input = run.inputText + `\n\n` + run.outputText

  const topicsList = topics.join("\n")

  const template = await lunary.renderTemplate("topics", {
    input,
    topics: topicsList,
  })

  const res = await openai.chat.completions.create(template)

  const output = res.choices[0]?.message?.content

  if (!output) throw new Error("No output from AI")

  const results = output
    .split("\n")
    .map((line: string) => line.toLowerCase().replace(".", "").trim())

  return results
}
