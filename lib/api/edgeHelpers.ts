import { NextRequest, NextResponse } from "next/server"
import { EdgeHighlight, H } from "@highlight-run/next/server"

const withEdgeHighlight = EdgeHighlight({
  projectID: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID,
  serviceName: "llmonitor-api-edge",
})

export function edgeWrapper(handler: (req: NextRequest) => Promise<Response>) {
  return withEdgeHighlight(async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error) {
      console.error(error)
      H.consumeError(error)
      return jsonResponse(500, { error: error.message })
    }
  })
}

/**
 * Edge functions helper to return a JSON res
 */
export function jsonResponse(status: number, data: any, init?: ResponseInit) {
  return new NextResponse(JSON.stringify(data), {
    ...init,
    status,
    headers: {
      ...init?.headers,
      "Content-Type": "application/json",
    },
  })
}
