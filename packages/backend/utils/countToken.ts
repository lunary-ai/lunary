import cl100k_base from "js-tiktoken/ranks/cl100k_base"

import { Tiktoken, getEncodingNameForModel } from "js-tiktoken/lite"
import sql from "./db"
import { ensureIsUUID } from "./ingest"

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

async function encodingForModel(model) {
  let encodingName

  // TODO: Remove this once this PR merged:
  // https://github.com/dqbd/tiktoken/pull/79/files
  if (model?.includes("gpt-4") || model?.includes("gpt-3.5")) {
    encodingName = "cl100k_base"
  } else if (model?.includes("claude")) {
    encodingName = "claude"
  } else {
    try {
      encodingName = getEncodingNameForModel(model)
    } catch (e) {
      console.warn("Warning: model not found. Using cl100k_base encoding.")
      encodingName = "cl100k_base"
    }
  }

  return await getEncoding(encodingName)
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

    return data.tokenCount
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

// If model is openai and it's missing some token usage, we can try to compute it
export async function completeRunUsage(run) {
  if (
    run.type !== "llm" ||
    run.event !== "end" ||
    (run.tokensUsage?.prompt && run.tokensUsage?.completion)
  )
    return run.tokensUsage

  const tokensUsage = run.tokensUsage || {}

  try {
    // get run input

    const [runData] = await sql`
      SELECT input, params, name FROM run WHERE id = ${run.runId}
    `

    // Get model name (in older sdk it wasn't sent in "end" event)
    const modelName = runData.name?.replaceAll("gpt-35", "gpt-3.5") // Azure fix

    const isGoogleModel =
      modelName && GOOGLE_MODELS.find((model) => modelName.includes(model))
    if (isGoogleModel) {
      // For Google models we need to use their API to count tokens
      const inputTokens = await countGoogleTokens(isGoogleModel, runData.input)
      tokensUsage.prompt = inputTokens

      const outputTokens = await countGoogleTokens(isGoogleModel, run.output)
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
  } catch (e) {
    console.error(`Error while computing tokens usage for run ${run.runId}`, e)
    return run.tokensUsage
  }
}
