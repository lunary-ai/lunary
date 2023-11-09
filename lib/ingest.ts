import { completeRunUsage } from "@/lib/countTokens"

export interface Event {
  type:
    | "llm"
    | "embed"
    | "chain"
    | "agent"
    | "tool"
    | "log"
    | "retriever"
    | "chat"
    | "convo"
  app: string
  event?: string
  level?: string
  runId?: string
  parentRunId?: string
  // convo?: string
  timestamp: string
  input?: any
  tags?: string[]
  name?: string
  output?: any
  message?: string
  extra?: any
  feedback?: any
  tokensUsage?: {
    prompt: number
    completion: number
  }
  error?: {
    message: string
    stack?: string
  }
  [key: string]: unknown
}

export const uuidFromSeed = async (seed: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(seed)
  const hash = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hash))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return (
    hashHex.substring(0, 8) +
    "-" +
    hashHex.substring(8, 12) +
    "-" +
    "4" +
    hashHex.substring(13, 16) +
    "-a" +
    hashHex.substring(17, 20) +
    "-" +
    hashHex.substring(20, 32)
  )
}

/* Enabled the user to use any string as run ids.
 * Useful for example for interop with Vercel'AI SDK as they use their own run ids format.
 * This function will convert any string to a valid UUID.
 */
const ensureIsUUID = async (id: string): Promise<string> => {
  if (typeof id !== "string") return undefined
  if (!id || id.length === 36) return id // TODO: better check
  else return await uuidFromSeed(id)
}

// Converts snake_case to camelCase
// I found some (probably unintended) camelCase props in the tracer events, so normalize everything
const recursiveToCamel = (item: any): any => {
  if (Array.isArray(item)) {
    return item.map((el: unknown) => recursiveToCamel(el))
  } else if (typeof item === "function" || item !== Object(item)) {
    return item
  }
  return Object.fromEntries(
    Object.entries(item as Record<string, unknown>).map(
      ([key, value]: [string, unknown]) => [
        key.replace(/([-_][a-z])/gi, (c) =>
          c.toUpperCase().replace(/[-_]/g, ""),
        ),
        recursiveToCamel(value),
      ],
    ),
  )
}

export const cleanEvent = async (event: any): Promise<Event> => {
  const { timestamp, runId, parentRunId, tags, name, ...rest } =
    recursiveToCamel(event)

  return {
    ...rest,
    name: typeof name === "string" ? name.replace("models/", "") : undefined,
    tags: typeof tags === "string" ? [tags] : tags,
    tokensUsage: await completeRunUsage(event),
    runId: await ensureIsUUID(runId),
    parentRunId: await ensureIsUUID(parentRunId),
    timestamp: new Date(timestamp).toISOString(),
  }
}
