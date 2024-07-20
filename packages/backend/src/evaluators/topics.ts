import { Run } from "shared"
import openai from "@/src/utils/openai"
import lunary from "lunary"
import { lastMsg } from "../checks"
import { callML } from "../utils/ml"

interface TopicsParams {
  topics: string[]
}

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
      if (message?.type === "system") {
        continue
      }
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

export async function evaluate(run: Run, params: TopicsParams) {
  const { topics } = params
  const input = parseMessages(run.input)
  const output = parseMessages(run.output)
  const error = parseMessages(run.error)

  const [inputPIIs, outputPIIs, errorPIIs] = await Promise.all([
    detectTopics(input, topics),
    detectTopics(output, topics),
    detectTopics(error, topics),
  ])

  const PIIs = {
    input: inputPIIs,
    output: outputPIIs,
    error: errorPIIs,
  }

  // TODO: zod for languages, SHOLUD NOT INGEST IN DB IF NOT CORRECT FORMAT
  return topics
}

async function detectTopics(
  texts: string[],
  topics: string[] = [],
): Promise<any> {
  try {
    return callML("topic", {
      texts,
      topics,
    })
  } catch (error) {
    console.error(error)
    console.log(texts)
  }
}
