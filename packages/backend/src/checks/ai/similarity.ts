import openai from "@/src/utils/openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

/* ---------- local helpers ---------- */

function cosinesim(A: number[], B: number[]): number {
  let dot = 0,
    mA = 0,
    mB = 0;
  for (let i = 0; i < A.length; i++) {
    dot += A[i] * B[i];
    mA += A[i] ** 2;
    mB += B[i] ** 2;
  }
  return (dot / (Math.sqrt(mA) * Math.sqrt(mB))) * 100;
}

function jaccardIndexSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(/\s+/));
  const set2 = new Set(str2.split(/\s+/));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  const j = intersection.size / union.size;
  return 1 + j * 99; // scale 0‒1 ➞ 1‒100
}

const embedText = async (text: string) => {
  const { data } = await openai!.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    encoding_format: "float",
  });
  return data[0].embedding;
};

export default async function aiSimilarity(
  text1: string,
  text2: string,
  type: "cosine" | "jaccard" | "ai" = "ai",
) {
  switch (type) {
    case "cosine": {
      const [e1, e2] = await Promise.all([embedText(text1), embedText(text2)]);
      return cosinesim(e1, e2);
    }

    case "jaccard":
      return jaccardIndexSimilarity(text1, text2);

    case "ai":
    default: {
      const similaritySchema = z.object({
        score: z.number().min(0).max(100),
      });

      const completion = await openai!.responses.parse({
        model: "gpt-4.1",
        instructions: `
You are a similarity estimator.  
Return the similarity *score* between two texts on a 0 – 100 scale:

  0   → texts have nothing in common  
  100 → texts are exactly the same  

Respond **only** with JSON matching the schema.
        `,
        input: `Text 1:\n${text1}\n\nText 2:\n${text2}`,
        text: {
          format: zodTextFormat(similaritySchema, "similarity"),
        },
      });

      if (completion.output_parsed === null)
        throw new Error("Failed to parse completion");

      return completion.output_parsed.score;
    }
  }
}
