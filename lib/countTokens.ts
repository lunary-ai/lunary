import { supabaseAdmin } from "@/lib/supabaseClient"
import { encodingForModel, getEncoding } from "js-tiktoken"

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
    console.log("fSpec", fSpec)
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

function numTokensFromMessages(
  messages,
  functions,
  model = "gpt-3.5-turbo-0613"
) {
  let tokensPerMessage, tokensPerName
  let encoding

  try {
    encoding = encodingForModel(model)
  } catch (error) {
    console.warn("Warning: model not found. Using cl100k_base encoding.")
    encoding = getEncoding("cl100k_base")
  }

  tokensPerMessage = 3
  tokensPerName = 1

  messages = Array.isArray(messages) ? messages : [messages]

  let numTokens = 0
  for (let message of messages) {
    numTokens += tokensPerMessage
    for (let [key, value] of Object.entries(message)) {
      numTokens += encoding.encode(
        typeof value === "object" ? JSON.stringify(value) : value
      ).length

      if (key === "role") {
        numTokens += tokensPerName
      }
    }
  }

  if (functions) {
    try {
      numTokens += encoding.encode(
        formatFunctionSpecsAsTypescriptNS(functions)
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
  if (
    run.type !== "llm" ||
    run.event !== "end" ||
    (run.tokensUsage?.prompt && run.tokensUsage?.completion)
  )
    return run.tokensUsage

  const modelName = run.name?.replace("gpt-35", "gpt-3.5") // Azure fix

  console.log("model name", modelName)
  console.log("token usage", run.tokensUsage)

  const tokensUsage = run.tokensUsage || {}

  try {
    console.log(`Completing usage for ${modelName}`)
    const enc = encodingForModel(modelName)

    // get run input

    const { data: runData, error } = await supabaseAdmin
      .from("run")
      .select("input,params")
      .match({ id: run.runId })
      .single()

    if (!tokensUsage.prompt && runData?.input) {
      const inputTokens = Array.isArray(runData.input)
        ? numTokensFromMessages(
            runData.input,
            // @ts-ignore
            runData.params?.functions,
            modelName
          )
        : enc.encode(JSON.stringify(runData.input)).length

      console.log(
        `We have ${inputTokens} tokens in input vs ${tokensUsage.prompt} recorded`
      )

      tokensUsage.prompt = inputTokens
    }

    if (!tokensUsage.completion && run.output) {
      //
      const outputString =
        typeof run.output === "object" && run.output.text
          ? run.output.text
          : JSON.stringify(run.output)

      const outputTokens = enc.encode(outputString).length

      console.log(
        `We have ${outputTokens} tokens in output vs ${tokensUsage.completion} recorded`
      )

      tokensUsage.completion = outputTokens
    }

    return tokensUsage
  } catch (e) {
    console.error(e)
    return run.tokensUsage
  }
}
