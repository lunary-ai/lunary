import { NextApiRequest, NextApiResponse } from "next"
import { NextRequest, NextResponse } from "next/server"

import { PageRouterHighlight, H } from "@highlight-run/next/server"

const withPageRouterHighlight = PageRouterHighlight({
  projectID: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID,
  serviceName: "llmonitor-api",
})

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

export function apiWrapper(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
) {
  return withPageRouterHighlight(
    async (req: NextApiRequest, res: NextApiResponse) => {
      try {
        await handler(req, res)
      } catch (error) {
        console.error(error)
        H.consumeError(error)
        res.status(500).json({ error: error.message })
      }
    },
  )
}

// Make another wrapper for Edge Runtime functions
export function edgeWrapper(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error) {
      console.error(error)
      return jsonResponse(500, { error: error.message })
    }
  }
}
