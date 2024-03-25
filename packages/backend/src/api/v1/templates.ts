import { checkAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import { unCamelObject } from "@/src/utils/misc"
import Router from "koa-router"

const templates = new Router({
  prefix: "/templates",
})

templates.get("/", async (ctx: Context) => {
  const templates = await sql`
    select t.*, coalesce(json_agg(tv.*) filter (where tv.id is not null), '[]') as versions
    from template t
    left join template_version tv on tv.template_id = t.id
    where t.project_id = ${ctx.state.projectId}
    group by t.id, t.name, t.slug, t.mode, t.created_at, t.group, t.project_id
    order by t.created_at desc
  `

  // uncamel each template's versions' extras' keys
  for (const template of templates) {
    for (const version of template.versions) {
      version.extra = unCamelObject(version.extra)
    }
  }

  ctx.body = templates
})

// insert template + a first version, and return the template with versions
templates.post("/", checkAccess("prompts", "create"), async (ctx: Context) => {
  const { projectId, userId } = ctx.state

  const { slug, mode, content, extra, testValues, isDraft } = ctx.request
    .body as {
    slug: string
    mode: string
    content: any[]
    extra: any
    testValues: any
    isDraft: boolean
  }

  const [template] = await sql`
    insert into template ${sql({
      projectId,
      ownerId: userId,
      slug,
      mode,
    })} returning *
  `

  const [templateVersion] = await sql`
    insert into template_version ${sql({
      templateId: template.id,
      content: sql.json(content),
      extra: sql.json(unCamelObject(extra)),
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
    select * from template where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}
  `

  ctx.body = row
})

templates.delete(
  "/:id",
  checkAccess("prompts", "delete"),
  async (ctx: Context) => {
    await sql`
    delete from template where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}
  `

    ctx.status = 204
  },
)

templates.patch(
  "/:id",
  checkAccess("prompts", "update"),
  async (ctx: Context) => {
    const { slug, mode } = ctx.request.body as {
      slug: string
      mode: string
    }

    const [template] = await sql`
    update template set
      slug = ${slug},
      mode = ${mode}
    where project_id = ${ctx.state.projectId} and id = ${ctx.params.id}
    returning *
  `

    const versions = await sql`
    select * from template_version where template_id = ${ctx.params.id}
  `

    for (const version of versions) {
      version.extra = unCamelObject(version.extra)
    }

    ctx.body = {
      ...template,
      versions,
    }
  },
)

templates.post(
  "/:id/versions",
  checkAccess("prompts", "update"),
  async (ctx: Context) => {
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
      ${ctx.params.id}, ${sql.json(content)}, ${sql.json(unCamelObject(extra))}, ${sql.json(
        testValues,
      )}, ${isDraft}
    ) returning *
  `

    ctx.body = templateVersion
  },
)

export default templates
