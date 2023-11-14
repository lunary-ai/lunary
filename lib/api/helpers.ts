import { NextApiRequest, NextApiResponse } from "next"

import { PageRouterHighlight, H } from "@highlight-run/next/server"

const withPageRouterHighlight = PageRouterHighlight({
  projectID: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID,
  serviceName: "llmonitor-api",
})

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
