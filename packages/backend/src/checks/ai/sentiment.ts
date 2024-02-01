import { pipeline } from "@xenova/transformers"

let nerPipeline: any = null

const THRESHOLD = 0.5

type Output = {
  label: string
  score: number
}[]

async function aiSentiment(sentence: string): Promise<number> {
  if (!nerPipeline)
    nerPipeline = await pipeline(
      "sentiment-analysis",
      "Xenova/bert-base-multilingual-uncased-sentiment",
    )

  const output: Output = await nerPipeline(sentence)
  // [ { label: '1 star', score: 0.6303076148033142 } ]

  const sorted = output.sort((a, b) => b.score - a.score)

  if (sorted[0].score < THRESHOLD) return 0.5 // neutral

  const sentiment = parseInt(output[0].label)

  return Math.round(sentiment / 5)
}

export default aiSentiment
