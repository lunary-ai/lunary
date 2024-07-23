import sql from "./db"
import { setTimeout } from "timers/promises"
import * as Sentry from "@sentry/node"
import { filterAsync, findAsyncSequential } from "./misc"

interface ModelCost {
  models: string[]
  inputCost: number
  outputCost: number
}

// Costs are in USD per 1000 tokens

// OpenAI Pricing: https://openai.com/pricing
// Legacy OpenAI pricing: https://platform.openai.com/docs/deprecations/
const MODEL_COSTS: ModelCost[] = [
  {
    models: ["gpt-4o"],
    inputCost: 0.005,
    outputCost: 0.015,
  },
  {
    models: ["ft:gpt-3.5-turbo"],
    inputCost: 0.003,
    outputCost: 0.006,
  },
  {
    models: ["gpt-3.5-turbo-0613", "gpt-3.5-turbo-0301"],
    inputCost: 0.0015,
    outputCost: 0.002,
  },
  {
    models: ["gpt-3.5-turbo-instruct"],
    inputCost: 0.0015,
    outputCost: 0.002,
  },
  {
    models: ["gpt-3.5-turbo-16k"],
    inputCost: 0.003,
    outputCost: 0.004,
  },
  {
    models: ["gpt-3.5-turbo-1106"],
    inputCost: 0.001,
    outputCost: 0.002,
  },
  {
    models: ["gpt-3.5-turbo", "gpt-3.5-turbo-0125"],
    inputCost: 0.0005,
    outputCost: 0.0015,
  },
  {
    models: ["text-davinci-003"],
    inputCost: 0.02,
    outputCost: 0.02,
  },
  {
    models: [
      "gpt-4-turbo",
      "gpt-4-vision",
      "gpt-4-1106",
      "gpt-4-1106-vision",
      "gpt-4-0125",
    ],
    inputCost: 0.01,
    outputCost: 0.03,
  },
  {
    models: ["gpt-4-32k"],
    inputCost: 0.06,
    outputCost: 0.12,
  },
  {
    models: ["gpt-4", "gpt-4-0613", "gpt-4-0314"],
    inputCost: 0.03,
    outputCost: 0.06,
  },
  {
    models: ["claude-instant-1", "claude-instant-v1", "claude-instant-1.2"],
    inputCost: 0.0008,
    outputCost: 0.0024,
  },
  {
    models: ["claude-2", "claude-v2", "claude-1", "claude-v1", "claude-2.1"],
    inputCost: 0.008,
    outputCost: 0.024,
  },
  {
    models: ["claude-3-opus"],
    inputCost: 0.015,
    outputCost: 0.075,
  },
  {
    models: ["claude-3-5-sonnet"],
    inputCost: 0.003,
    outputCost: 0.015,
  },
  {
    models: ["claude-3-sonnet"],
    inputCost: 0.003,
    outputCost: 0.075,
  },
  {
    models: ["claude-3-haiku"],
    inputCost: 0.00025,
    outputCost: 0.00125,
  },
  {
    models: ["text-bison", "chat-bison", "code-bison", "codechat-bison"],
    inputCost: 0.0005,
    outputCost: 0.0005,
  },
  {
    models: ["command-nightly", "command"],
    inputCost: 0.015,
    outputCost: 0.015,
  },
  {
    models: ["whisper"],
    inputCost: 0.1, // $ per 1000 seconds
    outputCost: 0,
  },
  {
    models: ["tts-1-hd"],
    inputCost: 0.03,
    outputCost: 0,
  },
  {
    models: ["tts-1"],
    inputCost: 0.015,
    outputCost: 0,
  },
  {
    models: ["mistral-tiny"],
    inputCost: 0.00014,
    outputCost: 0.00042,
  },
  {
    models: ["mistral-small"],
    inputCost: 0.0006,
    outputCost: 0.0018,
  },
  {
    models: ["mistral-medium"],
    inputCost: 0.0006,
    outputCost: 0.0018,
  },
]

function cleanModelName(name: string) {
  return name
    .toLowerCase()
    .replaceAll("gpt4", "gpt-4")
    .replaceAll("gpt3", "gpt-3")
    .replaceAll("gpt-35", "gpt-3.5")
    .replaceAll("claude3", "claude-3")
    .replaceAll("claude2", "claude-2")
    .replaceAll("claude1", "claude-1")
}

// Old ways of calculating cost
// Now everything is stored in the database
export function calcRunCostLegacy(run: any) {
  if (run.duration && run.duration < 0.01 * 1000) return null // cached llm calls
  if (run.type !== "llm" || !run.name) return null

  const modelCost = MODEL_COSTS.find((c) =>
    c.models.find((model) => {
      const cleanedName = cleanModelName(run.name)

      // Azure models have a different naming scheme
      return cleanedName.includes(model)
    }),
  )

  if (!modelCost) return null

  const promptTokens = run.promptTokens || 0
  const completionTokens = run.completionTokens || 0

  const inputCost = (modelCost.inputCost * promptTokens) / 1000
  const outputCost = (modelCost.outputCost * completionTokens) / 1000
  return inputCost + outputCost
}

export async function calcRunCost(run: any) {
  if (run.duration && run.duration < 0.01 * 1000) return null // cached llm calls
  if (run.type !== "llm" || !run.name) return null

  // Look at table model_mapping, in this logic:
  // Find all mappings with org_id null or org_id = run.project_id.org_id
  // Then check if the mapping.pattern matches run.name
  // If there are multiple use the most recent one via startDate (might also be null, in which case consider older)

  // Then use the inputCost and outputCost from the mapping. They are expressed in USD per 1.000.000. The unit can be 'TOKENS', 'MILLISECONDS' or 'CHARACTERS'. The cost is always per 1.000.000 units.
  // If cost is per character, use run.input and run.output length (stringified) to calculate the cost

  try {
    const [{ orgId }] = await sql`
    SELECT org_id FROM project WHERE id = ${run.projectId}`

    const mappings = await sql`
    SELECT * FROM model_mapping
    WHERE org_id = ${orgId} OR org_id IS NULL
    ORDER BY start_date DESC NULLS LAST, org_id IS NOT NULL DESC
  `

    const mapping = await findAsyncSequential(mappings, async (mapping) => {
      try {
        const regex = new RegExp(mapping.pattern)

        // Add a timeout to protect against regex slow/attacks
        const timeoutMs = 200

        const testPromise = regex.test(run.name)
        const timeoutPromise = setTimeout(timeoutMs, false)

        return await Promise.race([testPromise, timeoutPromise])
      } catch (error) {
        console.error(`Invalid regex pattern: ${mapping.pattern}`, error)
        return false
      }
    })

    if (!mapping) return calcRunCostLegacy(run)

    let inputUnits = 0
    let outputUnits = 0

    let inputCost = 0
    let outputCost = 0

    if (mapping.unit === "TOKENS") {
      inputUnits = run.promptTokens || 0
      outputUnits = run.completionTokens || 0

      inputCost = (inputCost * inputUnits) / 1_000_000
      outputCost = (outputCost * outputUnits) / 1_000_000
    } else if (mapping.unit === "MILLISECONDS") {
      inputUnits = run.duration || 0
      outputUnits = 0

      inputCost = inputCost * inputUnits
    } else if (mapping.unit === "CHARACTERS") {
      inputUnits =
        (typeof run.input === "string" ? run.input : JSON.stringify(run.input))
          ?.length || 0

      outputUnits =
        (typeof run.output === "string"
          ? run.output
          : JSON.stringify(run.output)
        )?.length || 0

      inputCost = (inputCost * inputUnits) / 1_000_000
      outputCost = (outputCost * outputUnits) / 1_000_000
    }

    const finalCost = Number((inputCost + outputCost).toFixed(5))

    // Round to 5 decimal places
    return finalCost
  } catch (error) {
    console.error(
      "Error calculating run cost, defaulting to legacy method",
      error,
    )
    Sentry.captureException(error)

    return calcRunCostLegacy(run)
  }
}
