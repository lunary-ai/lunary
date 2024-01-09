import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"
import postgres from "postgres"

const versions = new Router({
  prefix: "/template_versions",
})

// Use unCameledSql to avoid camel casing the results so they're compatible with openai's SDK
// Otherwise it returns stuff like maxTokens instead of max_tokens and OpenAI breaks
const unCameledSql = postgres(process.env.DB_URI!)

versions.get("/latest", async (ctx: Context) => {
  // Route used by SDK to fetch the latest version of a template

  const projectId = ctx.params.projectId as string

  const { slug } = ctx.request.query as {
    slug: string
  }

  const [latestVersion] = await unCameledSql`
    SELECT t.id, t.slug, t.mode, tv.id, tv.content, tv.extra, tv.created_at, tv.version
    FROM template t
    INNER JOIN template_version tv ON t.id = tv.template_id
    WHERE 
      t.app_id = ${projectId}
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

export default versions
