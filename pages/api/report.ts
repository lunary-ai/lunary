/*
 * Ingests events from the client SDKs and stores them in the DB.
 */

import { NextApiRequest, NextApiResponse } from "next"
import { supabaseAdmin } from "@/lib/supabaseClient"

interface Event {
  type: string
  appId: string
  convoId: string
  timestamp: string
  returnId?: string
  model?: string
  message?: string
  history?: []
}

export const config = {
  runtime: "edge",
}

const handleEvent = async (event: Event): Promise<void> => {
  try {
    console.log("Ingesting event in Supabase", event)
    const { data, error } = await supabaseAdmin.from("events").insert([event])

    if (error) throw error

    console.log("Response from supa: ", data)
  } catch (e: any) {
    console.error(e.message)
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { event } = req.body

  try {
    console.log("Received event: ", event)
    await handleEvent(event)
  } catch (e) {
    console.error(`Error handling event.`)
    console.error(e)
  }

  res.status(200).json({})
}
