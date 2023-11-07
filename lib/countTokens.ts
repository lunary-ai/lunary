import { supabaseAdmin } from "@/lib/supabaseClient"

// Don't import all otherwise function over 1mb, too big for Vercel
// import gpt2 from "./ranks/gpt2"; useless
// import p50k_edit from "./ranks/p50k_edit"; useless
// import r50k_base from "js-tiktoken/ranks/r50k_base";

// @ts-ignore
import p50k_base from "js-tiktoken/ranks/p50k_base"
// @ts-ignore
import cl100k_base from "js-tiktoken/ranks/cl100k_base"

import { Tiktoken, getEncodingNameForModel } from "js-tiktoken/lite"

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

    console.log(url)

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
    case "p50k_base":
      return new Tiktoken(p50k_base, extendSpecialTokens)
    case "cl100k_base":
      return new Tiktoken(cl100k_base, extendSpecialTokens)
    default:
      throw new Error("Unknown encoding")
  }
}

async function encodingForModel(model) {
  const encodingName = model.includes("claude")
    ? "claude"
    : getEncodingNameForModel(model)

  return await getEncoding(encodingName)
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
    // TODO: enum type support
    return `${pSpec.name}: ${pSpec.type}, // ${pSpec.description}`
  }

  function functionSignature(fSpec) {
    return [
      `// ${fSpec.description}`,
      `type ${fSpec.name} = (_: {`,
      ...Object.values(fSpec.parameters).map((p) => `  ${paramSignature(p)}`),
      "}) => any;",
    ].join("\n")
  }

  return (
    "namespace functions {\n\n" +
    functions.map((f) => functionSignature(f)).join("\n\n") +
    "\n\n}" // `// namespace functions` doesn't count towards token length
  )
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
  let encoding

  try {
    encoding = await encodingForModel(model)
  } catch (error) {
    console.warn("Warning: model not found. Using cl100k_base encoding.")
    encoding = await getEncoding("cl100k_base")
  }

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
      console.error("Warning: function token counting failed. Skipping.")
    }
  }

  numTokens += 3 // every reply is primed with assistant
  return numTokens
}

// If model is openai and it's missing some token usage, we can try to compute it
export const completeRunUsage = async (run) => {
  console.log(`Counting tokens for run ${run.runId} model ${run.name}`)
  if (
    run.type !== "llm" ||
    run.event !== "end" ||
    (run.tokensUsage?.prompt && run.tokensUsage?.completion)
  )
    return run.tokensUsage

  const tokensUsage = run.tokensUsage || {}

  try {
    // get run input

    const { data: runData, error } = await supabaseAdmin
      .from("run")
      .select("input,params,name")
      .match({ id: run.runId })
      .single()

    // Get model name (in older sdk it wasn't sent in "end" event)
    const modelName = runData.name?.replaceAll("gpt-35", "gpt-3.5") // Azure fix
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

    console.log(`Computed tokens for run ${run.runId}`, tokensUsage)

    return tokensUsage
  } catch (e) {
    console.error(`Error while computing tokens usage for run ${run.runId}`, e)
    return run.tokensUsage
  }
}
