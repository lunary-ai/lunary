import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const versions = new Router({
  prefix: "/template_versions",
})

versions.get("/", async (ctx: Context) => {
  const [version] = await sql`
    select * from template_version where template_id = ${ctx.params.id} and id = ${ctx.params.id}
  `

  const [template] = await sql`
    select * from template where app_id = ${ctx.params.projectId} and id = ${ctx.params.id}
  `

  ctx.body = { ...version, template }
})

versions.patch("/:id", async (ctx: Context) => {
  const { content, extra, testValues, id, isDraft } = ctx.request.body as {
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
      test_values = ${sql.json(testValues)}
      is_draft = ${isDraft}
    where template_id = ${ctx.params.id} and id = ${id}
    returning *
  `

  ctx.body = templateVersion
})

export default versions
