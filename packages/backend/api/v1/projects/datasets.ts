import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const datasets = new Router({
  prefix: "/datasets",
})

datasets.get("/:id", async (ctx: Context) => {
  const { projectId, id } = ctx.params

  const [row] = await sql`
    select
      slug, runs, created_at, updated_at
    from
      dataset
    where
      app_id = ${projectId} and id = ${id}
  `

  ctx.body = row
})

datasets.post("/", async (ctx: Context) => {
  const { projectId } = ctx.params
  const { slug } = ctx.request.body as { slug: string }

  const [row] = await sql`
    insert into dataset (
      app_id, slug
    ) values (
      ${projectId}, ${slug}
    ) returning *
  `

  ctx.body = row
})

datasets.post("/:id/run", async (ctx: Context) => {
  const { projectId, id } = ctx.params
  const { run } = ctx.request.body as { run: any }

  // insert into jsonb[] runs

  const [row] = await sql`
    update dataset
    set runs = runs || ${run}
    where app_id = ${projectId} and id = ${id}
    returning *
  `

  ctx.body = row
})

export default datasets
