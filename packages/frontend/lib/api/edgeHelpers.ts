import { NextRequest } from "next/server"

import { jsonResponse } from "./jsonResponse"

export function edgeWrapper(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      // will fail if no body
      const body = (await req.clone().json()) || {}
    } catch (e) {}

    try {
      return await handler(req)
    } catch (error) {
      console.error(error)
      // H.consumeError(error)
      return jsonResponse(500, { error: error.message })
    }
  }
}
