import openai from "@/src/utils/openai"
import lunary from "lunary"

export default async function aiFact(
  input: string,
  output: string,
  ideal: string,
) {
  const template = await lunary.renderTemplate("fact", {
    input,
    output,
    ideal,
  })

  const res = await openai.chat.completions.create(template)

  const { content } = res.choices[0]?.message

  if (!content) throw new Error("No response from AI")

  const result = content.split("\n")[0].toLowerCase().replace(".", "").trim()
  const reason = content.split("\n").slice(1).join("\n")

  return {
    result,
    reason,
  }
}
