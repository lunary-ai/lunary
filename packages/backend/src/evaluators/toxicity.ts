import { Run } from "shared"
import { callML } from "../utils/ml"
import { lastMsg } from "../checks"

export async function evaluate(run: Run) {
  const text = lastMsg(run.input) + lastMsg(run.output)
  if (!text.length) {
    return null
  }

  const toxicityLabels = await callML("toxicity", {
    text,
  })

  // format: ['toxicity', 'severe_toxicity', 'obscene', 'threat', 'insult' ...]
  return toxicityLabels
}
