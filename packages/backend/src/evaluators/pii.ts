import { Run } from "shared"

interface PiiParams {
  entities: ("email" | "ip")[]
}

export async function evaluate(run: Run, params: PiiParams) {
  const { entities } = params
  const results: {
    emails?: string[]
    ips?: string[]
  } = {}

  run.inputText = run.inputText || ""
  run.outputText = run.outputText || ""

  const text = run.inputText + run.outputText

  if (entities.includes("email")) {
    const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    results.emails = [...new Set(text.match(emailRegex))]
  }

  if (entities.includes("ip")) {
    const ipRegex = /(?:\d{1,3}\.){3}\d{1,3}/gi
    results.ips = [...new Set(text.match(ipRegex))]
  }

  return results
}
