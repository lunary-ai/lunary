import { NextResponse } from "next/server"

import { Database } from "@/utils/supaTypes"
import { jsonResponse } from "./jsonResponse"
import { NextApiResponse } from "next"

export const ensureHasAccessToApp = async (
  req,
  res: NextApiResponse | null = null,
) => {
  let appId
  let isEdge = false

  if (!res) {
    // Clone otherwise the next await ...json() will fail
    appId = (await req.clone().json()).appId

    isEdge = true
  } else {
    appId = (req.body || req.query).appId
  }

  // TODO
  return true
}
