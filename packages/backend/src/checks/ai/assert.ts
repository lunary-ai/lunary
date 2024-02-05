import openai from "@/src/utils/openai"
import lunary from "lunary"

export default async function aiAssert(sentence: string, assert: string) {
  const template = await lunary.renderTemplate("assert", {
    sentence,
    assert,
  })

  const res = await openai.chat.completions.create(template)

  const output = res.choices[0]?.message?.content

  if (!output) throw new Error("No output from AI")

  const result = output.split("\n")[0]
  const explanation = output.split("\n").slice(1).join("\n")

  return {
    passed: result === "YES",
    explanation,
  }
}
