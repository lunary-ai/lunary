import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const versions = new Router({
  prefix: "/template_versions",
})

versions.get("/:id", async (ctx: Context) => {
  const [version] = await sql`
    select * from template_version where id = ${ctx.params.id}
  `

  const [template] = await sql`
    select * from template where app_id = ${ctx.params.projectId} and id = ${version.templateId}
  `

  ctx.body = { ...version, template }
})

versions.patch("/:id", async (ctx: Context) => {
  const { content, extra, testValues, isDraft } = ctx.request.body as {
    id: string
    content: any[]
    extra: any
    testValues: any
    isDraft: boolean
  }

  const [templateVersion] = await sql`
    update template_version set
      content = ${sql.json(content)},
      extra = ${sql.json(extra)},
      test_values = ${sql.json(testValues)},
      is_draft = ${isDraft}
    where id = ${ctx.params.id}
    returning *
  `

  ctx.body = templateVersion
})

versions.get("/latest", async (ctx: Context) => {
  // Route used by SDK to fetch the latest version of a template

  const { app_id, slug } = ctx.request.query as {
    app_id: string
    slug: string
  }

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
    ctx.throw(404)
  }

  ctx.body = latestVersion
})

export default versions
