import { Run } from "shared"
import { callML } from "../utils/ml"
import { lastMsg } from "../checks"

export async function evaluate(run: Run) {
  const text = lastMsg(run.input)

  const language = await callML("lang", {
    text,
  })

  return language
}
