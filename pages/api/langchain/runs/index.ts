/*
 * Ingests events directly from Langchain tracer's API
 */

import { NextRequest } from "next/server"
import cors from "@/lib/cors"
import handleLangchainTracerEvent from "@/lib/handleLangchainTracerEvent"

export const config = {
  runtime: "edge",
}

export default async function handler(req: NextRequest) {
  if (req.method !== "POST")
    return new Response(null, { status: 404, statusText: "Not Found" })

  const body = await req.json()

  const { error } = await handleLangchainTracerEvent(body.id, body, "insert")

  if (error) throw error

  return cors(req, new Response(null, { status: 200 }))
}
