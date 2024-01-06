import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const versions = new Router({
  prefix: "/template_versions/:id",
})

versions.get("/", async (ctx: Context) => {
  const [version] = await sql`
    select * from template_version where id = ${ctx.params.id}
  `

  const [template] = await sql`
    select * from template where app_id = ${ctx.params.projectId} and id = ${version.templateId}
  `

  ctx.body = { ...version, template }
})

versions.patch("/", async (ctx: Context) => {
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
