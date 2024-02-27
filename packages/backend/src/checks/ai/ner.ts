import { pipeline } from "@xenova/transformers"

let nerPipeline: any = null
let loading = false

type Output = {
  entity: string
  score: number
  index: number
  word: string
  start: null
  end: null
}[]

type Entities = {
  per: string[]
  loc: string[]
  org: string[]
}

export default async function aiNER(sentence?: string): Promise<Entities> {
  const entities: Entities = { per: [], loc: [], org: [] }

  if (!sentence) return { per: [], loc: [], org: [] }

  if (!nerPipeline) {
    // this prevents multiple loading of the pipeline simultaneously which causes extreme lag
    if (loading) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      return aiNER(sentence)
    }

    loading = true
    nerPipeline = await pipeline(
      "ner",
      "Xenova/bert-base-multilingual-cased-ner-hrl",
    )
    loading = false
  }

  const output: Output = await nerPipeline(sentence)

  let currentEntity = { name: "", score: 0, type: "" }

  output.forEach((word) => {
    const entityType = word.entity.split("-")[1]
    if (word.entity.startsWith("B-")) {
      if (currentEntity.score > 0.5) {
        entities[currentEntity.type.toLowerCase()].push(
          currentEntity.name.trim(),
        )
      }
      currentEntity = { name: word.word, score: word.score, type: entityType }
    } else if (currentEntity.type === entityType) {
      currentEntity.name += word.word.includes("##")
        ? word.word.replace("##", "")
        : " " + word.word
      currentEntity.score *= word.score
    }
  })

  if (currentEntity.score > 0.5) {
    entities[currentEntity.type.toLowerCase()].push(currentEntity.name.trim())
  }

  return entities
}
