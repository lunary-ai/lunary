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
  if (req.method !== "PATCH")
    return new Response(null, { status: 404, statusText: "Not Found" })

  const body = await req.json()

  const url = new URL(req.url)

  const runId = url.pathname.split("/").pop()

  const { error } = await handleLangchainTracerEvent(runId, body, "update")

  if (error) throw error

  return cors(req, new Response(null, { status: 200 }))
}
