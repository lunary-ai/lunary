import {
  SupabaseClient,
  createMiddlewareClient,
  createPagesServerClient,
} from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import { jsonResponse } from "./helpers"
import { Database } from "@/utils/supaTypes"

// Ensure the user is logged in and has access to the app
// Works for both Edge functions and normal API routes
export const ensureIsLogged = async (req, res = null) => {
  // if no res, that means we're on an Edge function
  let supabase: SupabaseClient<Database>
  let isEdge = false

  if (!res) {
    const res = NextResponse.next()

    supabase = createMiddlewareClient({ req, res })

    isEdge = true
  } else {
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

  return { session, supabase }
}

export const ensureHasAccessToApp = async (req, res = null) => {
  const { session, supabase } = await ensureIsLogged(req, res)

  let appId
  let isEdge = false

  if (!res) {
    // Clone otherwise the next await ...json() will fail
    appId = (await req.clone().json()).appId

    isEdge = true
  } else {
    appId = (req.body || req.query).appId
  }

  // Try getting the app with RLS to make sure the user has access to it
  const { data: app } = await supabase
    .from("app")
    .select("id")
    .eq("id", appId)
    .single()

  if (!app) {
    throw new Error("The app does not exist or you don't have access to it")
  }

  return { session, supabase, app }
}
