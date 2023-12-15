import { edgeWrapper } from "@/lib/api/edgeHelpers"
import { jsonResponse } from "@/lib/api/jsonResponse"
import { supabaseAdmin } from "@/lib/supabaseClient"
import { z } from "zod"

const querySchema = z.object({
  app_id: z.string(),
  slug: z.string(),
})

export const runtime = "edge"

export default edgeWrapper(async function handler(req: Request) {
  const url = new URL(req.url)
  const { searchParams } = url

  const { app_id, slug } = querySchema.parse({
    app_id: searchParams.get("app_id"),
    slug: searchParams.get("slug"),
  })

  const { data } = await supabaseAdmin
    .from("template")
    .select("id,content,extra,slug,version,mode")
    .eq("app_id", app_id)
    .eq("slug", slug)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()
    .throwOnError()

  if (!data) {
    return jsonResponse(404, { error: "Not found" })
  }

  return jsonResponse(200, data)
})
