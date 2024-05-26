import { Run } from "shared"
import { callML } from "../utils/ml"
import { lastMsg } from "../checks"

export default async function evaluate(run: Run) {
  const language = await callML("toxicity", {
    texts: [lastMsg(run.input), lastMsg(run.output)],
  })

  return language
}
