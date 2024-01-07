import { edgeWrapper } from "@/lib/api/edgeHelpers"
import { jsonResponse } from "@/lib/api/jsonResponse"

import sql from "@/lib/db"
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

  const [latestVersion] = await sql`
    SELECT t.id, t.slug, t.mode, tv.id, tv.content, tv.extra, tv.created_at, tv.version
    FROM template t
    INNER JOIN template_version tv ON t.id = tv.template_id
    WHERE t.app_id = ${app_id}
      AND t.slug = ${slug}
      AND tv.is_draft = false
    ORDER BY tv.created_at DESC
    LIMIT 1
  `

  if (!latestVersion) {
    return jsonResponse(404, { error: "Not found" })
  }

  return jsonResponse(200, latestVersion)
})
