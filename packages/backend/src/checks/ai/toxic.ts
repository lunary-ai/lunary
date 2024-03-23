// import { pipeline } from "@xenova/transformers"

// // One of the only libraries that supports multiple languages
// import badWords from "washyourmouthoutwithsoap/data/build.json"
// import badWordsEnExtended from "washyourmouthoutwithsoap/data/_en.json"

// // extend with more words
// badWords.en = [...badWords.en, ...Object.keys(badWordsEnExtended)]
// const allWords = Object.values(badWords).flat()

// let nerPipeline: any = null
// let loading = false

// type Output = {
//   label: string
//   score: number
// }[]

// const profanityListCheck = (text: string) => {
//   const words = []

//   const clean = (text: string) => text.replace(/[^a-zA-Z ]/g, "").toLowerCase()
//   const tokenize = (text: string) => {
//     const withPunctuation = text.replace("/ {2,}/", " ").split(" ")
//     const withoutPunctuation = text
//       .replace(/[^\w\s]/g, "")
//       .replace("/ {2,}/", " ")
//       .split(" ")

//     return (
//       withPunctuation
//         .concat(withoutPunctuation)
//         // otherwise some false positives with short words
//         .filter((w) => w.length > 3)
//     )
//   }

//   // Clean and tokenize user input
//   const tokens = tokenize(clean(text))

//   // Check against list
//   for (let i in tokens) {
//     if (allWords.indexOf(tokens[i]) !== -1) words.push(tokens[i])
//   }

//   return [...new Set(words)] // remove duplicates
// }

// async function aiToxicity(sentences?: string[]): Promise<string[]> {
//   if (!sentences) return []

//   const cleaned = sentences.filter((s) => s && s.length > 3)
//   if (!cleaned?.length) return []

//   // check for profanity, more efficient in some cases
//   const badWords = profanityListCheck(cleaned.join(" "))
//   if (badWords.length) return badWords

//   if (!nerPipeline) {
//     // this prevents multiple loading of the pipeline simultaneously which causes extreme lag
//     if (loading) {
//       await new Promise((resolve) => setTimeout(resolve, 500))
//       return aiToxicity(sentences)
//     }

//     loading = true
//     nerPipeline = await pipeline("text-classification", "Xenova/toxic-bert")
//     loading = false
//   }

//   const output: Output = await nerPipeline(cleaned, { topk: null })

//   // remove duplicates and filter out low scores
//   const result = [
//     ...new Set(
//       output
//         .flat()
//         .filter((l) => l.score > 0.8)
//         .map((l) => l.label),
//     ),
//   ]

//   return result
// }

// export default aiToxicity
