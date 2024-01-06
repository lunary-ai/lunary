import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const templates = new Router({
  prefix: "/templates",
})

templates.get("/", async (ctx: Context) => {
  const templates = await sql`
    select * from template where app_id = ${ctx.params.projectId}
  `

  ctx.body = templates
})

templates.get("/:id", async (ctx: Context) => {
  const [row] = await sql`
    select * from template where app_id = ${ctx.params.projectId} and id = ${ctx.params.id}
  `

  ctx.body = row
})

export default templates
