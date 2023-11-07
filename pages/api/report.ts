/*
 * Ingests events from the client SDKs and stores them in the DB.
 */

import { supabaseAdmin } from "@/lib/supabaseClient"
import { NextRequest } from "next/server"
import cors from "@/lib/api/cors"
import { completeRunUsage } from "@/lib/countTokens"
import { Json } from "../../utils/supaTypes"

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

export const config = {
  runtime: "edge",
}

const uuidFromSeed = async (seed: string): Promise<string> => {
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

const cleanEvent = async (event: any): Promise<Event> => {
  const { timestamp, runId, parentRunId, tags, name, ...rest } = event

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

const registerRunEvent = async (
  event: Event,
  insertedIds: Set<string>,
  allowRetry = true,
): Promise<void> => {
  const {
    timestamp,
    type,
    app,
    userId,
    userProps,
    event: eventName,
    runId,
    parentRunId,
    input,
    tags,
    output,
    name,
    tokensUsage,
    extra,
    error,
  } = event

  let parentRunIdToUse = parentRunId

  const table = supabaseAdmin.from("run")
  let query = null

  let internalUserId
  // Only do on start event to save on DB calls and have correct lastSeen
  if (typeof userId === "string" && eventName === "start") {
    userId
    const { data, error } = await supabaseAdmin
      .from("app_user")
      .upsert(
        {
          external_id: userId,
          last_seen: timestamp,
          app: app,
          props: userProps as Json,
        },
        { onConflict: "external_id, app" },
      )
      .select()
      .single()

    if (error) throw error

    internalUserId = data.id
  }

  if (
    eventName === "start" &&
    parentRunIdToUse &&
    !insertedIds.has(parentRunIdToUse)
  ) {
    // Check if parent run exists (only necessary if we haven't just inserted it)

    const { data, error } = await supabaseAdmin
      .from("run")
      .select("user")
      .match({ id: parentRunIdToUse })
      .single()

    if (error) {
      // Could be that the parent run is not yet created
      // For example if the server-side event reached here before the frontend event, will throw foreign-key constraint error
      // So we retry once after 5s
      // A cleaner solution would be to use a queue, but this is simpler for now

      console.warn(`Error getting parent run user: ${error.message}`)

      if (allowRetry) {
        console.log(
          "Retrying insertion in 2s in case parent not inserted yet...",
        )

        await new Promise((resolve) => setTimeout(resolve, 2000))

        return await registerRunEvent(event, insertedIds, false)
      } else {
        // Prevent foreign key constraint error
        parentRunIdToUse = null
      }
    }

    // This allow user id to correctly cascade to childs runs if for example it's set on the frontend and not passed to the backend
    if (data?.user) {
      internalUserId = data?.user
    }
  }

  switch (eventName) {
    case "start":
      query = table.insert({
        type,
        id: runId,
        user: internalUserId,
        created_at: timestamp,
        app,
        tags,
        name,
        status: "started",
        params: extra,
        parent_run: parentRunIdToUse,
        input,
      })

      break
    case "end":
      // update llm_run with end time, output and status success

      query = table
        .update({
          ended_at: timestamp,
          output,
          status: "success",
          prompt_tokens: tokensUsage?.prompt,
          completion_tokens: tokensUsage?.completion,
        })
        .match({ id: runId })

      break
    case "error":
      query = table
        .update({
          ended_at: timestamp,
          status: "error",
          error,
        })
        .match({ id: runId })

      break
    case "feedback":
      // get previous feedback to merge

      const { data, error } = await supabaseAdmin
        .from("run")
        .select("feedback")
        .match({ id: runId })
        .maybeSingle()

      query = table
        .update({
          feedback: {
            ...(data?.feedback || {}),
            ...extra,
          },
        })
        .match({ id: runId })

    case "stream":
      break
  }

  if (query) {
    const { error, data } = await query

    if (error) throw error

    insertedIds.add(runId)
  }
}

const registerLogEvent = async (event: Event): Promise<void> => {
  const { event: eventName, app, parentRunId, message, extra } = event

  const { error } = await supabaseAdmin.from("log").insert({
    run: parentRunId,
    app,
    level: eventName,
    message,
    extra: extra || {},
  })

  if (error) throw error
}

const registerEvent = async (
  event: Event,
  insertedIds: Set<string>,
): Promise<void> => {
  const { type } = event

  switch (type) {
    case "llm":
    case "embed":
    case "chain":
    case "agent":
    case "retriever":
    case "chat":
    case "convo":
    case "tool":
      await registerRunEvent(event, insertedIds)
      break
    case "log":
      await registerLogEvent(event)
      break
  }
}

export default async function handler(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return cors(req, new Response(null, { status: 200 }))
  }

  const { events } = await req.json()

  const insertedIds = new Set<string>()

  if (!events) {
    console.error("Missing events payload.")
    return cors(req, new Response("Missing events payload.", { status: 400 }))
  }

  // Event processing order is important for foreign key constraints
  const sorted = (Array.isArray(events) ? events : [events]).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  for (const event of sorted) {
    try {
      const cleanedEvent = await cleanEvent(event)

      await registerEvent(cleanedEvent, insertedIds)
    } catch (e: any) {
      console.error(`
      Error ingesting event.
      - Message: ${e.message}
      - Input: ${JSON.stringify(events)}`)
    }
  }

  return cors(req, new Response(null, { status: 200 }))
}
