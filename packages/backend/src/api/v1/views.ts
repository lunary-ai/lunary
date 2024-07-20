import { checkAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import { clearUndefined } from "@/src/utils/ingest"
import Context from "@/src/utils/koa"
import Router from "koa-router"

import { z } from "zod"

const views = new Router({
  prefix: "/views",
})

const ViewSchema = z.object({
  name: z.string(),
  data: z.any(),
  columns: z.any(),
  icon: z.string().optional(),
  type: z.enum(["llm", "thread", "trace"]),
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

  const validatedData = ViewSchema.parse(ctx.request.body)
  const { name, data, columns, icon, type } = validatedData

  const [insertedCheck] = await sql`
    insert into view ${sql({
      name,
      ownerId: userId,
      projectId,
      data,
      columns,
      icon,
      type,
    })}
    returning *
  `
  ctx.body = insertedCheck
})

views.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params

  const validatedData = ViewSchema.partial().parse(ctx.request.body)
  const { name, data, columns, icon } = validatedData

  const [updatedView] = await sql`
    update view
    set ${sql(clearUndefined({ name, data, updatedAt: new Date(), columns, icon }))}
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
