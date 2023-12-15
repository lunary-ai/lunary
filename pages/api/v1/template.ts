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
    .select(
      "id,slug,mode,versions:template_version(id,content,extra,created_at,version,is_draft)",
    )
    .eq("app_id", app_id)
    .eq("slug", slug)
    .neq("versions.is_draft", true)
    .limit(1)
    .maybeSingle()
    .throwOnError()

  console.log({ data })

  const latestVersion = data?.versions?.[0]

  console.log({ latestVersion })

  if (!data) {
    return jsonResponse(404, { error: "Not found" })
  }

  return jsonResponse(200, latestVersion)
})
