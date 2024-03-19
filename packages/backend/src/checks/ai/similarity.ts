import openai from "@/src/utils/openai"
import lunary from "lunary"

function cosinesim(A: number[], B: number[]): number {
  var dotproduct = 0
  var mA = 0
  var mB = 0

  for (var i = 0; i < A.length; i++) {
    dotproduct += A[i] * B[i]
    mA += A[i] * A[i]
    mB += B[i] * B[i]
  }

  mA = Math.sqrt(mA)
  mB = Math.sqrt(mB)
  var similarity = dotproduct / (mA * mB)

  return similarity * 100
}

function jaccardIndexSimilarity(str1: string, str2: string) {
  // Tokenize the strings into sets of words
  const set1 = new Set(str1.split(/\s+/))
  const set2 = new Set(str2.split(/\s+/))

  // Find the intersection of two sets
  const intersection = new Set([...set1].filter((x) => set2.has(x)))

  // Find the union of two sets
  const union = new Set([...set1, ...set2])

  // Calculate Jaccard Index
  const jaccardIndex = intersection.size / union.size

  // Scale to 1-100
  const scaledJaccardIndex = 1 + jaccardIndex * (100 - 1)

  return scaledJaccardIndex
}

const embedText = async (text: string) => {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    encoding_format: "float",
  })

  return embedding.data[0].embedding
}

export default async function aiSimilarity(
  text1: string,
  text2: string,
  type: string,
) {
  switch (type) {
    case "cosine":
      const embedding1 = await embedText(text1)

      const embedding2 = await embedText(text2)

      const similarity = cosinesim(embedding1, embedding2)

      return similarity
    case "jaccard":
      return jaccardIndexSimilarity(text1, text2)

    case "ai":
    default:
      const template = await lunary.renderTemplate("distance", {
        text1,
        text2,
      })

      const res = await openai.chat.completions.create(template)

      const output = res.choices[0]?.message?.content

      if (!output) throw new Error("No output from AI")

      const result = parseInt(output)

      return result
  }
}
