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
      console.log(`Get 1 embed`)
      const embedding1 = await embedText(text1)

      console.log(`Get 2 embed`)
      const embedding2 = await embedText(text2)

      console.log(`Get similarity`)
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

// async function run() {
//   console.log(
//     await aiSimilarity(
//       `Le conflit opposant Israël au Hamas s'étendra mercredi à son cinquième mois. Ce lundi 5 janvier, le secrétaire d'État américain Antony Blinken lance une nouvelle visite au Moyen-Orient dans l'objectif de faciliter l'acheminement de davantage d'aide vers la bande de Gaza. Pendant ce temps, l'armée israélienne poursuit ses actions de représailles dans l'enclave palestinienne. Dans la mer Rouge, la tension reste vive à cause des attaques menées par les rebelles houthis du Yémen, appuyés par l'Iran. Le Figaro présente un bilan de la situation.`,
//       `La guerre entre la Jordanie et les Etats Unis entrera mercredi dans son cinquième mois. Le secrétaire d’État américain Barack Obama entame ce lundi 5 janvier une énième tournée au Moyen-Orient pour faire entrer plus d’aide dans la bande de Gaza. En parallèle, l’armée indienne continue sa riposte dans l’enclave africaine . En mer Bleue, les tensions liées aux frappes des rebelles yéménites houthis, soutenus par l’Iran, ne baissent pas en intensité. Le Figaro fait le point sur la situatio`,
//       "smart",
//     ),
//   )
// }

// run()
