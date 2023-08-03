/*
 * Ingests events from the client SDKs and stores them in the DB.
 */

import { supabaseAdmin } from "@/lib/supabaseClient"
import { NextRequest } from "next/server"
import cors from "@/lib/cors"

export interface Event {
  type: string
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

const cleanEvent = (event: any): Event => {
  const { timestamp, ...rest } = event

  return {
    ...rest,
    timestamp: new Date(timestamp).toISOString(),
  }
}

const registerRunEvent = async (event: Event): Promise<void> => {
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

  const table = supabaseAdmin.from("run")
  let query = null

  let internalUserId
  // Only do on start event to save on DB calls and have correct lastSeen
  if (userId && eventName === "start") {
    const { data, error } = await supabaseAdmin
      .from("app_user")
      .upsert(
        {
          external_id: userId,
          last_seen: timestamp,
          app: app,
          props: userProps,
        },
        { onConflict: "external_id, app" }
      )
      .select()
      .single()

    if (error) throw error

    internalUserId = data.id
  }

  switch (eventName) {
    case "start":
      query = table.insert({
        type,
        id: runId,
        user: internalUserId,
        created_at: timestamp,
        app,
        tags: tags.length ? tags : null,
        name,
        status: "started",
        params: extra,
        parent_run: parentRunId,
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
    case "stream":
      break
  }

  if (query) {
    const { error } = await query

    if (error) throw error
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

const registerEvent = async (event: Event): Promise<void> => {
  const { type } = event

  switch (type) {
    case "llm":
    case "chain":
    case "agent":
    case "tool":
      await registerRunEvent(event)
      break
    case "log":
      await registerLogEvent(event)
      break
  }
}

export default async function handler(req: NextRequest) {
  if (req.method !== "POST")
    return new Response(null, { status: 404, statusText: "Not Found" })

  const { events } = await req.json()

  if (!events || !Array.isArray(events))
    return cors(req, new Response("Missing events payload.", { status: 400 }))

  console.log(`Ingesting ${events.length} events.`)

  // Event processing order is important for foreign key constraints
  const sorted = events.sort((a, b) => a.timestamp - b.timestamp)

  for (const event of sorted) {
    try {
      await registerEvent(cleanEvent(event))
    } catch (e: any) {
      console.error(`Error handling event.`)
      // Edge functions logs are limited to 2kb
      console.error(e)
    }
  }

  return cors(req, new Response(null, { status: 200 }))
}
