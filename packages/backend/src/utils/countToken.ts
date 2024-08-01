import cl100k_base from "js-tiktoken/ranks/cl100k_base"

import * as Sentry from "@sentry/node"
import {
  Tiktoken,
  TiktokenEncoding,
  getEncodingNameForModel,
} from "js-tiktoken/lite"
import sql from "./db"
import { withTimeout } from "./timeout"

const cache = {}

async function getRareEncoding(
  encoding,
  extendedSpecialTokens?: Record<string, number>,
) {
  if (!(encoding in cache)) {
    let url
    switch (encoding) {
      case "claude":
        url = `https://cdn.jsdelivr.net/gh/anthropics/anthropic-tokenizer-typescript@main/claude.json`
        break
      default:
        url = `https://tiktoken.pages.dev/js/${encoding}.json`
    }

    const res = await fetch(url)

    if (!res.ok) throw new Error("Failed to fetch encoding")
    cache[encoding] = await res.json()
  }
  return new Tiktoken(cache[encoding], extendedSpecialTokens)
}

async function getEncoding(
  encoding,
  extendSpecialTokens?: Record<string, number>,
) {
  switch (encoding) {
    case "claude":
    case "gpt2":
    case "r50k_base":
    case "p50k_base":
      return await getRareEncoding(encoding, extendSpecialTokens)

    case "cl100k_base":
      return new Tiktoken(cl100k_base, extendSpecialTokens)
    default:
      throw new Error("Unknown encoding " + encoding)
  }
}

async function encodingForModel(model: string) {
  let encodingName: TiktokenEncoding

  if (model?.includes("claude")) {
    encodingName = "gpt2"
  } else {
    try {
      encodingName = getEncodingNameForModel(model)
    } catch (e) {
      console.warn("Warning: model not found. Using cl100k_base encoding.")
      encodingName = "cl100k_base"
    }
  }

  return getEncoding(encodingName)
}

const GOOGLE_MODELS = [
  "chat-bison-001",
  "code-bison-001",
  "text-bison-001",
  "codechat-bison-001",
]

async function countGoogleTokens(model, input) {
  const prepareData = (input) => {
    const messages = Array.isArray(input) ? input : [input]

    return messages.map((message) => {
      return {
        content: typeof message === "string" ? message : message.text,
      }
    })
  }

  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: {
          messages: prepareData(input),
        },
      }),
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta3/models/${model}:countMessageTokens?key=${process.env.PALM_API_KEY}`,
      options,
    )
    const data = await res.json()

    return data.tokenCount as number
  } catch (e) {
    console.error("Error while counting tokens with Google API", e)
    return
  }
}

/**
 * Returns a function signature block in the format used by OpenAI internally:
 * https://community.openai.com/t/how-to-calculate-the-tokens-when-using-function-call/266573/6
 *
 * Accurate to within 5 tokens when used with countStringTokens :)
 *
 * Example given by OpenAI engineer:
 * ```
 * namespace functions {
 *   type x = (_: {
 *     location: string,
 *     unit?: "celsius" | "fahrenheit",
 *   }) => any;
 * } // namespace functions
 * ```
 *
 * Format found by further experimentation: (seems accurate to within 5 tokens)
 * ```
 * namespace functions {
 *
 * // Get the current weather in a given location
 * type get_current_weather = (_: {
 *   location: string, // The city and state, e.g. San Francisco, CA
 *   unit?: "celsius" | "fahrenheit",
 * }) => any;
 *
 * } // namespace functions
 * ```
 * The `namespace` statement doesn't seem to count towards total token length.
 */

function formatFunctionSpecsAsTypescriptNS(functions) {
  function paramSignature(pSpec) {
    try {
      if (pSpec?.type === "object") {
        return [
          `${pSpec.description ? "// " + pSpec.description : ""}`,
          `${pSpec.name}: {`,
          ...Object.entries(pSpec.properties).map(
            ([name, prop]) => `  ${paramSignature({ ...prop, name })}`,
          ),
          "},",
        ].join("\n")
      } else if (pSpec?.type === "array") {
        return [
          `${pSpec.description ? "// " + pSpec.description : ""}`,
          `${pSpec.name}: ${pSpec.type}<${paramSignature(pSpec.items)}>,`,
        ].join("\n")
      }

      // TODO: enum type support
      return `${pSpec.name}: ${pSpec.type}, ${
        pSpec.description ? "// " + pSpec.description : ""
      }`
    } catch (error) {
      console.error("Error while formatting function spec as typescript", {
        error,
        pSpec,
      })
      return ""
    }
  }

  function functionSignature(fSpec) {
    const func = !fSpec.type ? fSpec : fSpec.function

    return [
      `${func.description ? "// " + func.description : ""}`,
      `type ${func.name} = (_: {`,
      ...Object.entries(func.parameters.properties).map(
        ([name, param]) => `  ${paramSignature({ ...param, name })}`,
      ),
      "}) => any;",
    ].join("\n")
  }

  const final = [
    "namespace functions {",
    functions.map((f) => functionSignature(f)).join("\n"),
    "}", // `// namespace functions` doesn't count towards token length
  ].join("\n")

  return final
}

/*
 * Returns the number of tokens in an array of messages passed to OpenAI.
 *
 */
async function numTokensFromMessages(
  messages,
  functions,
  model = "gpt-3.5-turbo-0613",
) {
  let tokensPerMessage, tokensPerName
  const encoding = await encodingForModel(model)

  tokensPerMessage = 3
  tokensPerName = 1

  messages = Array.isArray(messages) ? messages : [messages]

  let numTokens = 0
  for (let message of messages) {
    numTokens += tokensPerMessage
    for (let [key, value] of Object.entries(message)) {
      numTokens += encoding.encode(
        typeof value === "object" ? JSON.stringify(value) : value,
      ).length

      if (key === "role") {
        numTokens += tokensPerName
      }
    }
  }

  if (functions) {
    try {
      numTokens += encoding.encode(
        formatFunctionSpecsAsTypescriptNS(functions),
      ).length
    } catch (error) {
      // console.error(error)
      console.error("Warning: function token counting failed. Skipping.")
    }
  }

  numTokens += 3 // every reply is primed with assistant
  return numTokens
}

export async function completeRunUsage(run: any) {
  if (
    run.type !== "llm" ||
    run.event !== "end" ||
    (run.tokensUsage?.prompt && run.tokensUsage?.completion)
  )
    return run.tokensUsage

  const tokensUsage = run.tokensUsage || {}

  const [runData] =
    await sql`select input, params, name from run where id = ${run.runId}`
  const modelName = runData.name

  const isGoogleModel =
    modelName && GOOGLE_MODELS.find((model) => modelName.includes(model))
  if (isGoogleModel) {
    const [inputTokens, outputTokens] = await Promise.all([
      countGoogleTokens(isGoogleModel, runData.input),
      countGoogleTokens(isGoogleModel, run.output),
    ])
    tokensUsage.prompt = inputTokens
    tokensUsage.completion = outputTokens
  } else {
    const enc = await encodingForModel(modelName)

    if (!tokensUsage.prompt && runData?.input) {
      const inputTokens = Array.isArray(runData.input)
        ? await numTokensFromMessages(
            runData.input,
            // @ts-ignore
            runData.params?.functions || runData.params?.tools,
            modelName,
          )
        : enc.encode(JSON.stringify(runData.input)).length

      tokensUsage.prompt = inputTokens
    }

    if (!tokensUsage.completion && run.output) {
      const outputString =
        typeof run.output === "object" && run.output.text
          ? run.output.text
          : JSON.stringify(run.output)

      const outputTokens = enc.encode(outputString).length

      tokensUsage.completion = outputTokens
    }
  }

  return tokensUsage
}

export async function completeRunUsageWithTimeout(run: any) {
  try {
    return withTimeout(
      () => completeRunUsage(run),
      5000,
      "Timeout for run usage completion",
    )
  } catch (error: unknown) {
    console.error(error, JSON.stringify(run, null, 2))
    Sentry.captureException(error, { contexts: { run } })
    return run.tokenUsage
  }
}
