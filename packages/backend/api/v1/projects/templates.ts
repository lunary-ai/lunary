import sql from "@/utils/db"
import Router from "@koa/router"
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
    group by t.id
  `

  ctx.body = templates
})

const defaultVersion = {
  content: [
    { content: "You are an helpful assistant.", role: "system" },
    { content: "Hi!", role: "user" },
  ],
  extra: {
    model: "gpt-4-1106-preview",
    temperature: 1.0,
    max_tokens: 1000,
  },
  test_values: {},
}

// insert template + a first version, and return the template with versions
templates.post("/", async (ctx: Context) => {
  const { projectId } = ctx.params
  const { slug, orgId, mode } = ctx.request.body as {
    slug: string
    orgId: string
    mode: string
  }

  const [template] = await sql`
    insert into template (
      app_id, org_id, slug, mode
    ) values (
      ${projectId}, ${orgId}, ${slug}, ${mode}
    ) returning *
  `

  const [templateVersion] = await sql`
    insert into template_version (
      template_id, content, extra, test_values
    ) values (
      ${template.id}, ${sql.json(defaultVersion.content)}, ${sql.json(
        defaultVersion.extra
      )}, ${sql.json(defaultVersion.test_values)}
    ) returning *
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
  const { content, extra, test_values } = ctx.request.body as {
    content: any[]
    extra: any
    test_values: any
  }

  const [templateVersion] = await sql`
    insert into template_version (
      template_id, content, extra, test_values
    ) values (
      ${ctx.params.id}, ${sql.json(content)}, ${sql.json(extra)}, ${sql.json(
        test_values
      )}
    ) returning *
  `

  ctx.body = templateVersion
})

// templates.patch("/:id/versions", async (ctx: Context) => {
//   const { content, extra, testValues, id, isDraft } = ctx.request.body as {
//     id: string
//     content: any[]
//     extra: any
//     testValues: any
//     isDraft: boolean
//   }

//   const [templateVersion] = await sql`
//     update template_version set
//       content = ${sql.json(content)},
//       extra = ${sql.json(extra)},
//       test_values = ${sql.json(testValues)}
//       is_draft = ${isDraft}
//     where template_id = ${ctx.params.id} and id = ${id}
//     returning *
//   `

//   ctx.body = templateVersion
// })

export default templates
