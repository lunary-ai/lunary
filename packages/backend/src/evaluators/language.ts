import { Run } from "shared"
import { callML } from "../utils/ml"

export async function evaluate(run: Run) {
  run.inputText = run.inputText || ""
  run.outputText = run.outputText || ""

  const text = run.inputText + `\n` + run.outputText

  const language = await callML("lang", {
    text,
  })

  return language
}
