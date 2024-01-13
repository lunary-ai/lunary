import sql from "@/utils/db"
import Context from "@/utils/koa"
import Router from "koa-router"
import { z } from "zod"

const projects = new Router({
  prefix: "/projects",
})

projects.get("/", async (ctx: Context) => {
  const { orgId } = ctx.state

  const rows = await sql`
    select
      id,
      created_at,
      name,
      org_id,
      exists(select * from run where app = app.id) as activated
    from
      app
    where
      org_id = ${orgId}
  `

  ctx.body = rows
})

projects.post("/", async (ctx: Context) => {
  const { orgId } = ctx.state

  const bodySchema = z.object({
    name: z.string(),
  })
  const { name } = bodySchema.parse(ctx.request.body)

  const newProject = {
    name,
    orgId,
  }

  const [project] = await sql`insert into app ${sql(newProject)} returning *`

  ctx.body = project
})

projects.delete("/:projectId", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { orgId } = ctx.state

  const [{ count }] =
    await sql`select count(*)::int from  app where org_id = ${orgId}`

  if (count > 1) {
    await sql`delete from app where id = ${projectId}`
    ctx.status = 200
    return
  } else {
    ctx.status = 422

    ctx.body = {
      error: "Deletion Failed",
      message: "An organization must have at least one project.",
    }
    return
  }
})

projects.patch("/:projectId", async (ctx: Context) => {
  const { projectId } = ctx.state
  const bodySchema = z.object({
    name: z.string(),
  })
  const { name } = bodySchema.parse(ctx.request.body)

  await sql`
      update app
      set
        name = ${name}
      where
        id = ${projectId}
    `
  ctx.status = 200
  ctx.body = {}
})

export default projects
