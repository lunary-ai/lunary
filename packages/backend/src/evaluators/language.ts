import { Run } from "shared"
import { callML } from "../utils/ml"
import { lastMsg } from "../checks"

export async function evaluate(run: Run) {
  if (!run.input) {
    return null
  }
  const text = lastMsg(run.input)

  const language = await callML("language", {
    text,
  })

  return language
}
