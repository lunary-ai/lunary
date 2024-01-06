import { NextApiRequest, NextApiResponse } from "next"
import { z } from "zod"
import { PageRouterHighlight, H } from "@highlight-run/next/server"

const withPageRouterHighlight = PageRouterHighlight({
  projectID: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID!,
  serviceName: "lunary-api",
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
        if (error instanceof z.ZodError) {
          return res.status(422).json({
            error: "Invalid request parameters",
            details: error.issues,
          })
        }
        res.status(500).json({ error: error.message })
      }
    },
  )
}
