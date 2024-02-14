import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { FilterLogic } from "shared"

const datasets = new Router({
  prefix: "/checklists",
})

datasets.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state
  // TODO: full zod
  const { type } = ctx.query as { type: string }

  const rows = await sql`select * from check_list 
        where project_id = ${projectId} 
        and type = ${type} 
        order by updated_at desc`
  ctx.body = rows
})

datasets.get("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params

  const [check] = await sql`select * from check_list 
        where project_id = ${projectId} 
        and id = ${id}`
  ctx.body = check
})

datasets.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state
  const { slug, type, data } = ctx.body as {
    slug: string
    type: string
    data: FilterLogic
  }

  const [insertedCheck] = await sql`
    insert into check_list ${sql({
      slug,
      ownerId: userId,
      projectId,
      type,
      data,
    })}
    returning *
  `
  ctx.body = insertedCheck
})

datasets.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params
  const { slug, data } = ctx.body as {
    slug: string
    data: FilterLogic
  }

  const [updatedCheck] = await sql`
    update check_list
    set ${sql({ slug, data, updatedAt: new Date() })}
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `
  ctx.body = updatedCheck
})
