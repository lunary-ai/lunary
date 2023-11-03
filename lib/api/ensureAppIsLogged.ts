import {
  createMiddlewareClient,
  createPagesServerClient,
} from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import { jsonResponse } from "./helpers"

// Ensure the user is logged in and has access to the app
// Works for both Edge functions and normal API routes
export const ensureAppIsLogged = async (req, res = null) => {
  // if no res, that means we're on an Edge function

  let supabase
  let appId
  let isEdge = false

  if (!res) {
    const res = NextResponse.next()

    // Clone otherwise the next await ...json() will fail
    appId = (await req.clone().json()).appId

    supabase = createMiddlewareClient({ req, res })

    isEdge = true
  } else {
    appId = (req.body || req.query).appId

    supabase = createPagesServerClient({ req, res })
  }

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const error = {
      error: "not_authenticated",
      description:
        "The user does not have an active session or is not authenticated",
    }

    return isEdge ? jsonResponse(401, error) : res.status(401).json(error)
  }

  // Try getting the app with RLS to make sure the user has access to it
  const { data: app } = await supabase
    .from("app")
    .select("id")
    .eq("id", appId)
    .single()

  if (!app) {
    const error = {
      error: "not_found",
      description: "The app does not exist",
    }

    return isEdge ? jsonResponse(404, error) : res.status(404).json(error)
  }

  return supabase
}
