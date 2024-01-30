import { pipeline } from "@xenova/transformers"

let nerPipeline: any = null

type Output = {
  entity: string
  score: number
  index: number
  word: string
  start: null
  end: null
}[]

export default async function aiNER(sentence: string): Promise<{
  [key: string]: string[]
}> {
  if (!nerPipeline) nerPipeline = await pipeline("ner") // defaults to Xenova/bert-base-multilingual-cased-ner-hrl

  const output: Output = await nerPipeline(sentence)

  const entities: {
    [key: string]: string[]
  } = { PER: [], LOC: [], ORG: [] }

  let currentEntity = { name: "", score: 0, type: "" }

  output.forEach((word) => {
    const entityType = word.entity.split("-")[1]
    if (word.entity.startsWith("B-")) {
      if (currentEntity.score > 0.5) {
        entities[currentEntity.type].push(currentEntity.name.trim())
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
    entities[currentEntity.type].push(currentEntity.name.trim())
  }

  return entities
}
