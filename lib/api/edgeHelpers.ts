import { NextRequest } from "next/server"
import { EdgeHighlight, H } from "@highlight-run/next/server"
import { jsonResponse } from "./jsonResponse"

const withEdgeHighlight = EdgeHighlight({
  projectID: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID,
  serviceName: "llmonitor-api-edge",
})

export function edgeWrapper(handler: (req: NextRequest) => Promise<Response>) {
  return withEdgeHighlight(async (req: NextRequest) => {
    try {
      // will fail if no body
      const body = (await req.clone().json()) || {}
      H.setAttributes({ body })
    } catch (e) {}

    try {
      return await handler(req)
    } catch (error) {
      console.error(error)
      H.consumeError(error)

      return jsonResponse(500, { error: error.message })
    }
  })
}
