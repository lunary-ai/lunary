import { createClient } from "@supabase/supabase-js"

// Export an admin client, not safe in the browser.
export const supabaseAdmin = createClient(
  // Supabase API URL - env var exported by default.
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
