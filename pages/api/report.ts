/*
 * Ingests events from the client SDKs and stores them in the DB.
 */

import { supabaseAdmin } from "@/lib/supabaseClient"
import { NextRequest } from "next/server"
import cors from "@/lib/cors"

interface Event {
  type: string
  app: string
  convo: string
  timestamp: string
  returnId?: string
  tags?: string[]
  model?: string
  message?: string
  history?: []
}

export const config = {
  runtime: "edge",
}

const handleEvents = async (events: Event[]): Promise<void> => {
  try {
    const res = await supabaseAdmin.rpc("upsert_convo", {
      _id: events[0].convo,
      _app: events[0].app,
      _tags: events[0].tags,
    })

    console.log(res)

    // remove tags (only used for convos) and clean timestamp from events
    const cleanedEvents = events.map((event: Event) => {
      const { tags, timestamp, ...rest } = event

      return {
        ...rest,
        timestamp: new Date(timestamp),
      }
    })

    const { data, error } = await supabaseAdmin
      .from("event")
      .insert(cleanedEvents)

    if (error) throw error
  } catch (e: any) {
    // Log maximum length is 4096 bytes.
    console.error(e?.message?.substring(0, 2000))
  }
}

export default async function handler(req: NextRequest) {
  if (req.method !== "POST")
    return new Response(null, { status: 404, statusText: "Not Found" })

  const { events } = await req.json()

  if (!events || !Array.isArray(events))
    return cors(req, new Response("Missing events payload.", { status: 400 }))

  try {
    console.log(`Ingesting ${events.length} events.`)
    await handleEvents(events)
  } catch (e: any) {
    console.error(`Error handling event.`)
    console.error(e?.message?.substring(0, 2000))
  }

  return cors(req, new Response(null, { status: 200 }))
}
