import { createPagesServerClient } from "@supabase/auth-helpers-nextjs"

export const ensureAppIsLogged = async (req, res) => {
  // Create authenticated Supabase Client
  const supabase = createPagesServerClient({ req, res })
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session)
    return res.status(401).json({
      error: "not_authenticated",
      description:
        "The user does not have an active session or is not authenticated",
    })

  const { appId } = (req.body || req.query) as { appId: string }

  // Try getting the app with RLS to make sure the user has access to it
  const { data: app } = await supabase
    .from("app")
    .select("id")
    .eq("id", appId)
    .single()

  if (!app) {
    return res.status(404).json({
      error: "not_found",
      description: "The app does not exist",
    })
  }
}
