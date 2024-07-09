import { Run } from "shared"
import { lastMsg } from "../checks"
import { callML } from "../utils/ml"

// TOOD: refacto this with all the other parsing function already in use
function parseMessages(messages: unknown) {
  if (!messages) {
    return [""]
  }
  if (typeof messages === "string" && messages.length) {
    return [messages]
  }

  if (messages === "__NOT_INGESTED__") {
    return [""]
  }

  if (Array.isArray(messages)) {
    let contentArray = []
    for (const message of messages) {
      let content = message.content || message.text
      if (typeof content === "string" && content.length) {
        contentArray.push(content)
      } else {
        contentArray.push(JSON.stringify(message))
      }
    }
    return contentArray
  }

  if (typeof messages === "object") {
    return [JSON.stringify(messages)]
  }

  return [""]
}

interface Params {
  entities: string[]
}
export async function evaluate(run: Run, params: Oarans) {
  const { entities } = params
  const input = parseMessages(run.input)
  const output = parseMessages(run.output)
  const error = parseMessages(run.error)

  const [inputLanguages, outputLanguages, errrorLanguages] = await Promise.all([
    detectPIIs(input, entities),
    detectPIIs(output, entities),
    detectPIIs(error, entities),
  ])

  const languages = {
    input: inputLanguages,
    output: outputLanguages,
    error: errrorLanguages,
  }

  // TODO: zod for languages, SHOLUD NOT INGEST IN DB IF NOT CORRECT FORMAT

  return languages
}

// TODO: type
async function detectPIIs(texts: string[], entities: string[]): Promise<any> {
  try {
    return callML("pii", { texts, entities })
  } catch (error) {
    console.error(error)
    console.log(texts)
  }
}
