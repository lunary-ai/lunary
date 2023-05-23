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

const handleEvent = async (events: Event[]): Promise<void> => {
  try {
    // Log maximum length is 4096 bytes.
    console.log(`Ingesting ${events.length} events.`)
    const { data, error } = await supabaseAdmin.from("events").insert(events)

    if (error) throw error

    console.log("Response from supa: ", data)
  } catch (e: any) {
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
    await handleEvent(events)
  } catch (e: any) {
    console.error(`Error handling event.`)
    console.error(e?.message?.substring(0, 2000))
  }

  return cors(req, new Response(null, { status: 200 }))
}
