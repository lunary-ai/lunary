import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const templates = new Router({
  prefix: "/templates",
})

templates.get("/", async (ctx: Context) => {
  const templates = await sql`
    select t.*, coalesce(json_agg(tv.*) filter (where tv.id is not null), '[]') as versions
    from template t
    left join template_version tv on tv.template_id = t.id
    where t.app_id = ${ctx.params.projectId}
    group by t.id, t.org_id, t.name, t.slug, t.mode, t.created_at, t.group, t.app_id
    order by max(tv.created_at) desc
  `

  ctx.body = templates
})

// insert template + a first version, and return the template with versions
templates.post("/", async (ctx: Context) => {
  const { projectId } = ctx.params
  const { slug, orgId, mode, content, extra, testValues, isDraft } = ctx.request
    .body as {
    slug: string
    orgId: string
    mode: string
    content: any[]
    extra: any
    testValues: any
    isDraft: boolean
  }

  console.log("template", {
    app_id: projectId,
    org_id: orgId,
    slug: slug,
    mode: mode,
  })

  const [template] = await sql`
    insert into template ${sql({
      appId: projectId,
      orgId: orgId,
      slug: slug,
      mode: mode,
    })} returning *
  `

  const [templateVersion] = await sql`
    insert into template_version ${sql({
      templateId: template.id,
      content: sql.json(content),
      extra: sql.json(extra),
      testValues: sql.json(testValues),
      isDraft: isDraft,
    })} returning *
  `

  ctx.body = {
    ...template,
    versions: [templateVersion],
  }
})

templates.get("/:id", async (ctx: Context) => {
  const [row] = await sql`
    select * from template where app_id = ${ctx.params.projectId} and id = ${ctx.params.id}
  `

  ctx.body = row
})

templates.delete("/:id", async (ctx: Context) => {
  await sql`
    delete from template where app_id = ${ctx.params.projectId} and id = ${ctx.params.id}
  `

  ctx.body = {}
})

templates.patch("/:id", async (ctx: Context) => {
  const { slug, mode } = ctx.request.body as {
    slug: string
    mode: string
  }

  const [template] = await sql`
    update template set
      slug = ${slug},
      mode = ${mode}
    where app_id = ${ctx.params.projectId} and id = ${ctx.params.id}
    returning *
  `

  const versions = await sql`
    select * from template_version where template_id = ${ctx.params.id}
  `

  ctx.body = {
    ...template,
    versions,
  }
})

templates.post("/:id/versions", async (ctx: Context) => {
  const { content, extra, testValues, isDraft } = ctx.request.body as {
    content: any[]
    extra: any
    testValues: any
    isDraft: boolean
  }

  const [templateVersion] = await sql`
    insert into template_version (
      template_id, content, extra, test_values, is_draft
    ) values (
      ${ctx.params.id}, ${sql.json(content)}, ${sql.json(extra)}, ${sql.json(
        testValues,
      )}, ${isDraft}
    ) returning *
  `

  ctx.body = templateVersion
})

export default templates
