import { pipeline } from "@xenova/transformers"

let nerPipeline: any = null

type Output = {
  label: string
  score: number
}[]

async function aiToxicity(sentence?: string): Promise<string[]> {
  if (!sentence || sentence.length < 3) return []

  nerPipeline = await pipeline("text-classification", "Xenova/toxic-bert")

  const output: Output = await nerPipeline(sentence, { topk: null })

  return output.filter((l) => l.score > 0.8).map((l) => l.label)
}

export default aiToxicity
