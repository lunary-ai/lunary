import { pipeline } from "@xenova/transformers"

let nerPipeline: any = null
let loading = false

const THRESHOLD = 0.5

type Output = {
  label: string
  score: number
}[]

async function aiSentiment(sentence?: string): Promise<number> {
  if (!sentence || sentence.length < 10) return 0.5 // neutral

  if (!nerPipeline) {
    // this prevents multiple loading of the pipeline simultaneously which causes extreme lag
    if (loading) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      return aiSentiment(sentence)
    }

    loading = true
    nerPipeline = await pipeline(
      "sentiment-analysis",
      "Xenova/bert-base-multilingual-uncased-sentiment",
    )
    loading = false
  }

  const output: Output = await nerPipeline(sentence)
  // [ { label: '1 star', score: 0.6303076148033142 } ]

  const sorted = output.sort((a, b) => b.score - a.score)

  if (sorted[0].score < THRESHOLD) return 0.5 // neutral

  const sentiment = parseInt(output[0].label)

  const score = +(sentiment / 5).toFixed(2)

  return score
}

export default aiSentiment
