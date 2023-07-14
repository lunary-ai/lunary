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
  agentRunId?: string
  toolRunId?: string
  convo?: string
  timestamp: number
  input?: any
  name?: string
  output?: any
  message?: string
  extra?: Record<string, unknown>
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
    timestamp: new Date(timestamp),
  }
}

const registerLLMEvent = async (event: Event): Promise<void> => {
  const {
    timestamp,
    app,
    event: eventName,
    runId,
    agentRunId,
    toolRunId,
    input,
    output,
    name,
    promptTokens,
    completionTokens,
    extra,
    error,
  } = event

  const table = supabaseAdmin.from("llm_run")
  let query = null

  switch (eventName) {
    case "start":
      // insert new llm_run

      query = table.insert({
        id: runId,
        app,
        model: name || "unknown",
        params: extra,
        agent_run: agentRunId,
        tool_run: toolRunId,
        created_at: timestamp,
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
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
        })
        .match({ id: runId })

      break
    case "error":
      // update llm_run with end time and status error

      query = table
        .update({
          ended_at: timestamp,
          status: "error",
          error,
        })
        .match({ id: runId })

      break
    case "stream":
      // update "stream_lag" in llm_run
      break
  }

  if (query) {
    const { error } = await query

    if (error) throw error
  }
}

const registerAgentEvent = async (event: Event): Promise<void> => {
  const {
    event: eventName,
    agentRunId,
    toolRunId,
    timestamp,
    app,
    name,
    input,
    output,
    extra,
    error,
  } = event

  const table = supabaseAdmin.from("agent_run")

  let query = null

  switch (eventName) {
    case "start":
      // insert new agent_run

      query = table.insert({
        id: agentRunId,
        name: name || "unknown",
        created_at: timestamp,
        app,
        input,
      })

      break
    case "end":
      // update agent_run with end time, output and status success

      query = table
        .update({
          ended_at: timestamp,
          status: "success",
          output,
        })
        .match({ id: agentRunId })

      break
    case "error":
      // update agent_run with end time and status error

      query = table
        .update({
          ended_at: timestamp,
          status: "error",
          error,
        })
        .match({ id: agentRunId })

      break
  }

  if (query) {
    const { error } = await query

    if (error) throw error
  }
}

const registerToolEvent = async (event: Event): Promise<void> => {
  const {
    app,
    event: eventName,
    agentRunId,
    toolRunId,
    name,
    input,
    timestamp,
    output,
    extra,
    error,
  } = event

  const table = supabaseAdmin.from("tool_run")

  let query = null

  switch (eventName) {
    case "start":
      // insert new tool_run

      query = table.insert({
        id: toolRunId,
        created_at: timestamp,
        app,
        agent_run: agentRunId,
        name,
        input,
        output,
      })

      break
    case "end":
      // update tool_run with end time, output and status success
      query = table
        .update({
          ended_at: timestamp,
          output,
          status: "success",
        })
        .match({ id: toolRunId })

      break
    case "error":
      // update tool_run with end time and status error
      query = table
        .update({
          ended_at: timestamp,
          status: "error",
          error,
        })
        .match({ id: toolRunId })

      break
  }

  if (query) {
    const { error } = await query

    if (error) throw error
  }
}

const registerLogEvent = async (event: Event): Promise<void> => {
  const { event: eventName, app, agentRunId, toolRunId, message, extra } = event

  const { error } = await supabaseAdmin.from("log").insert({
    agent_run: agentRunId,
    tool_run: toolRunId,
    app,
    level: eventName,
    message,
    extra,
  })

  if (error) throw error
}

const registerEvent = async (event: Event): Promise<void> => {
  const { type } = event

  switch (type) {
    case "llm":
      await registerLLMEvent(event)
      break
    case "agent":
      await registerAgentEvent(event)
      break
    case "tool":
      await registerToolEvent(event)
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
