import { checkAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import { clearUndefined } from "@/src/utils/ingest"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { CheckLogic } from "shared"

const views = new Router({
  prefix: "/views",
})

views.get("/", checkAccess("logs", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state

  ctx.body = await sql`select * from view
        where project_id = ${projectId} 
        order by updated_at desc`
})

views.get("/:id", checkAccess("logs", "read"), async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params

  const [view] =
    await sql`select * from view where project_id = ${projectId} and id = ${id}`

  ctx.body = view
})

views.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state

  const { name, data, columns } = ctx.request.body as {
    name: string
    data: CheckLogic
    columns: any
  }

  const [insertedCheck] = await sql`
    insert into view ${sql({
      name,
      ownerId: userId,
      projectId,
      data,
      columns,
    })}
    returning *
  `
  ctx.body = insertedCheck
})

views.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params
  const { name, data, columns } = ctx.request.body as {
    name: string
    data: CheckLogic
    columns: any
  }

  const [updatedView] = await sql`
    update view
    set ${sql(clearUndefined({ name, data, updatedAt: new Date(), columns }))}
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `
  ctx.body = updatedView
})

views.delete("/:id", checkAccess("logs", "delete"), async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params

  await sql`
    delete from view
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `

  ctx.status = 200
})

export default views
