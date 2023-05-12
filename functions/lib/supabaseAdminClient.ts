import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// Export an admin client, not safe in the browser.
const supabaseClient = createClient(
  // Supabase API URL - env var exported by default.
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

export default supabaseClient
