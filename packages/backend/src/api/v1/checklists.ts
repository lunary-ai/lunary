import { checkAccess } from "@/src/utils/authorization"
import sql from "@/src/utils/db"
import { clearUndefined } from "@/src/utils/ingest"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { CheckLogic } from "shared"

const checklists = new Router({
  prefix: "/checklists",
})

checklists.get("/", checkAccess("checklists", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state
  // TODO: full zod
  const { type } = ctx.query as { type: string }

  const rows = await sql`select * from checklist 
        where project_id = ${projectId} 
        and type = ${type} 
        order by updated_at desc`
  ctx.body = rows
})

checklists.get(
  "/:id",
  checkAccess("checklists", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { id } = ctx.params

    const [check] = await sql`select * from checklist 
        where project_id = ${projectId} 
        and id = ${id}`
    ctx.body = check
  },
)

checklists.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state
  const { slug, type, data } = ctx.request.body as {
    slug: string
    type: string
    data: CheckLogic
  }

  const [insertedCheck] = await sql`
    insert into checklist ${sql({
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

checklists.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params
  const { slug, data } = ctx.request.body as {
    slug: string
    data: CheckLogic
  }

  const [updatedCheck] = await sql`
    update checklist
    set ${sql(clearUndefined({ slug, data, updatedAt: new Date() }))}
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `
  ctx.body = updatedCheck
})

checklists.delete(
  "/:id",
  checkAccess("checklists", "delete"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { id } = ctx.params

    await sql`
    delete from checklist
    where project_id = ${projectId}
    and id = ${id}
    returning *
  `

    ctx.status = 200
  },
)

export default checklists
