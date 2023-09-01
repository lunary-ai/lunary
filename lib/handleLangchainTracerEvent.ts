/*
  This is responsible for parsing events directly from Langchain Tracer.
  Langchain pushes a lot of breaking changes at each release, so it can be hard to keep up.
  This file is a bit of a mess at the moment, TODO: clean & type once 
  Langchains's Tracer API stabilize.
*/

import { supabaseAdmin } from "@/lib/supabaseClient"

const cleanArray = (arr) => (arr.length === 1 ? arr[0] : arr)

const parseRole = (id: string[]) => {
  const roleHint = id[id.length - 1]

  if (roleHint.includes("Human")) return "user"
  if (roleHint.includes("System")) return "system"
  if (roleHint.includes("AI")) return "ai"
  if (roleHint.includes("Function")) return "function"
}

// Converts snake_case to camelCase
// I found some (probably unintended) camelCase props in the tracer events, so normalize everything
const recursiveToCamel = (item: unknown): unknown => {
  if (Array.isArray(item)) {
    return item.map((el: unknown) => recursiveToCamel(el))
  } else if (typeof item === "function" || item !== Object(item)) {
    return item
  }
  return Object.fromEntries(
    Object.entries(item as Record<string, unknown>).map(
      ([key, value]: [string, unknown]) => [
        key.replace(/([-_][a-z])/gi, (c) =>
          c.toUpperCase().replace(/[-_]/g, "")
        ),
        recursiveToCamel(value),
      ]
    )
  )
}

const parseMessage = (message) => {
  const obj = message.kwargs

  // "id" contains an array describing the constructor, with last item actual schema type
  const role = parseRole(message.id)

  const text = message.text || obj.content
  const kwargs = obj.additionalKwargs

  return {
    role,
    text,
    ...kwargs,
  }
}

const parseMessages = (messages: any[]) => {
  for (const gen of messages) {
    return gen.map(parseMessage)
  }
}

const parseGenerations = (generations: any[][]) => {
  for (const gen of generations) {
    return gen.map((generation) => {
      const { text, message } = generation
      if (message) return parseMessage(message)

      return text
    })
  }
}

interface Input {
  input?: string
  inputs?: string[]
  agent_scratchpad?: string
  prompts?: string[]
  stop?: string[]
  messages?: any[]
  question?: string
}

const parseInput = (rawInput: Input) => {
  if (!rawInput) return null

  const { input, inputs, question, prompts, messages } = rawInput

  if (input) return input
  if (inputs) return inputs
  if (question) return question
  if (prompts) return cleanArray(prompts)
  if (messages) return cleanArray(parseMessages(messages))

  return rawInput
}

const parseOutput = (rawOutput) => {
  if (!rawOutput) return null

  const { generations, text, output, answer } = rawOutput

  if (text) return text
  if (answer) return answer
  if (output) return output
  if (generations) return cleanArray(parseGenerations(generations))

  return rawOutput
}

// They mix camelcase and snakecase... so we need to try both
const tryParseTokenUsage = (outputs) => {
  const tokenUsage = outputs?.llmOutput?.tokenUsage

  return tokenUsage || {}
}

// Sometimes timestamp as string, sometimes ISO string
const parseDate = (date) => {
  if (!date) return null
  // attempt to parse as ISO string
  const parsed = new Date(date)
  if (parsed.toString() !== "Invalid Date") return parsed

  // attempt to parse as unix timestamp
  const unix = new Date(parseInt(date))
  if (unix.toString() !== "Invalid Date") return unix

  return null
}

export const handleLangchainTracerEvent = async (id, rawEvent, operation) => {
  const event: any = recursiveToCamel(rawEvent)

  if (operation === "update") {
    event.status = event.error ? "error" : "success"
  }

  // Langchain agents are actually chains, so use this custom metadata to
  // allow the user to specify them
  const agentName = event.extra?.metadata?.agentName
  if (event.runType === "chain" && agentName) {
    event.runType = "agent"

    // Allow the user to set a custom name for the agent
    event.name = agentName
  }

  if (event.runType === "llm") {
    event.params = event.extra?.invocationParams
    event.name = event.params?.model || event.params?.modelName
  }

  const {
    sessionName: appId,
    startTime,
    endTime,
    parentRunId,
    name, // in case of LLM run will be vendor "OpenAI"
    status,
    inputs,
    outputs,
    error,
    runType: type,
    tags,
  } = event

  const tokenUsage = tryParseTokenUsage(event.outputs)

  const table = supabaseAdmin.from("run")

  const data = {
    id,
    app: appId,
    parent_run: parentRunId,
    name,
    type,
    input: parseInput(inputs),
    output: parseOutput(outputs),
    created_at: parseDate(startTime),
    ended_at: parseDate(endTime),
    completion_tokens: tokenUsage?.completionTokens,
    prompt_tokens: tokenUsage?.promptTokens,
    status,
    error,
    tags,
  }

  // remove null values so we don't overwrite existing data with null
  const strippedData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v != null)
  )

  let query = table[operation](strippedData)

  if (operation === "update") {
    query = query.match({ id })
  }

  return query
}

export default handleLangchainTracerEvent
