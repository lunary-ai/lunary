import * as Sentry from "@sentry/node";
import sql from "./db";
import { withTimeout } from "./timeout";
import { countGoogleTokens, isGoogleModel } from "./tokens/google";
import { get_encoding, Tiktoken, TiktokenEncoding } from "tiktoken";
import {
  getEncodingNameForOpenAIModel,
  isOpenAIModelName,
} from "./tokens/openai";

function getEncodingNameForModel(modelName: string): TiktokenEncoding {
  if (modelName?.includes("claude")) {
    return "cl100k_base"; // TODO
  } else if (isOpenAIModelName(modelName)) {
    return getEncodingNameForOpenAIModel(modelName);
  } else {
    console.warn(
      `Warning: model ${modelName} not found. Using cl100k_base encoding.`,
    );
    return "cl100k_base";
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

function formatFunctionSpecsAsTypescriptNS(functions: any) {
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
        ].join("\n");
      } else if (pSpec?.type === "array") {
        return [
          `${pSpec.description ? "// " + pSpec.description : ""}`,
          `${pSpec.name}: ${pSpec.type}<${paramSignature(pSpec.items)}>,`,
        ].join("\n");
      }

      // TODO: enum type support
      return `${pSpec.name}: ${pSpec.type}, ${
        pSpec.description ? "// " + pSpec.description : ""
      }`;
    } catch (error) {
      console.error("Error while formatting function spec as typescript", {
        error,
        pSpec,
      });
      return "";
    }
  }

  function functionSignature(fSpec) {
    const func = !fSpec.type ? fSpec : fSpec.function;

    return [
      `${func.description ? "// " + func.description : ""}`,
      `type ${func.name} = (_: {`,
      ...Object.entries(func.parameters.properties).map(
        ([name, param]) => `  ${paramSignature({ ...param, name })}`,
      ),
      "}) => any;",
    ].join("\n");
  }

  const final = [
    "namespace functions {",
    functions.map((f) => functionSignature(f)).join("\n"),
    "}", // `// namespace functions` doesn't count towards token length
  ].join("\n");

  return final;
}

/*
 * Returns the number of tokens in an array of messages passed to OpenAI.
 *
 */
async function numTokensFromMessages(
  messages: any,
  functions: unknown,
  enc: Tiktoken,
) {
  let tokensPerMessage, tokensPerName;

  tokensPerMessage = 3;
  tokensPerName = 1;

  messages = Array.isArray(messages) ? messages : [messages];

  let numTokens = 0;
  for (let message of messages) {
    numTokens += tokensPerMessage;
    for (let [key, value] of Object.entries(message)) {
      numTokens += enc.encode(
        typeof value === "object" ? JSON.stringify(value) : String(value),
      ).length;

      if (key === "role") {
        numTokens += tokensPerName;
      }
    }
  }

  if (functions) {
    try {
      numTokens += enc.encode(
        formatFunctionSpecsAsTypescriptNS(functions),
      ).length;
    } catch (error) {
      // console.error(error)
      console.error("Warning: function token counting failed. Skipping.");
    }
  }

  numTokens += 3; // every reply is primed with assistant
  return numTokens;
}

export async function completeRunUsage(run: any) {
  if (
    run.type !== "llm" ||
    run.event !== "end" ||
    (run.tokensUsage?.prompt && run.tokensUsage?.completion)
  )
    return run.tokensUsage;

  const tokensUsage = run.tokensUsage || {};

  const [runData] =
    await sql`select input, params, name from run where id = ${run.runId}`;
  const modelName = runData?.name;

  if (typeof modelName !== "string") {
    return run.tokenUsage;
  }

  if (isGoogleModel(modelName)) {
    const [inputTokens, outputTokens] = await Promise.all([
      countGoogleTokens(modelName, runData.input),
      countGoogleTokens(modelName, run.output),
    ]);
    tokensUsage.prompt = inputTokens;
    tokensUsage.completion = outputTokens;
  } else {
    const encodingName = getEncodingNameForModel(modelName);
    const enc = await get_encoding(encodingName);

    if (!tokensUsage.prompt && runData?.input) {
      const inputTokens = Array.isArray(runData.input)
        ? await numTokensFromMessages(
            runData.input,
            // @ts-ignore
            runData.params?.functions || runData.params?.tools,
            enc,
          )
        : enc.encode(JSON.stringify(runData.input)).length;

      tokensUsage.prompt = inputTokens;
    }

    if (!tokensUsage.completion && run.output) {
      const outputString =
        typeof run.output === "object" && run.output.text
          ? run.output.text
          : JSON.stringify(run.output);

      const outputTokens = enc.encode(outputString).length;

      tokensUsage.completion = outputTokens;
    }
  }

  return tokensUsage;
}

export async function completeRunUsageWithTimeout(run: any) {
  try {
    return withTimeout(
      () => completeRunUsage(run),
      5000,
      "Timeout for run usage completion",
    );
  } catch (error: unknown) {
    console.error(error, JSON.stringify(run, null, 2));
    Sentry.captureException(error, { contexts: { run } });
    return run.tokenUsage;
  }
}
