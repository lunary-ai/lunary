import { NextApiRequest, NextApiResponse } from "next"
import { z } from "zod"

export function apiWrapper(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res)
    } catch (error) {
      console.error(error)

      if (error instanceof z.ZodError) {
        return res.status(422).json({
          error: "Invalid request parameters",
          details: error.issues,
        })
      }
      res.status(500).json({ error: error.message })
    }
  }
}
