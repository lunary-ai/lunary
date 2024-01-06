import sql from "@/utils/db"
import Router from "@koa/router"
import { Context } from "koa"

const org = new Router({
  prefix: "/org/:orgId",
})

org.get("/", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string

  const [row] = await sql`
    select
      id,
      created_at,
      name
    from
      org
    where
      id = ${orgId}
  `

  ctx.body = row
})

org.patch("/", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string

  const name = (ctx.request.body as { name: string }).name

  await sql`
      update org
      set
        name = ${name}
      where
        id = ${orgId}
    `
  ctx.body = {}
})

org.get("/projects", async (ctx: Context) => {
  const orgId = ctx.params.orgId as string

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

export default org
