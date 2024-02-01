import sql from "@/src/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const datasets = new Router({
  prefix: "/datasets",
})

datasets.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      id, slug, runs, created_at, updated_at
    from
      dataset
    where
      project_id = ${projectId}
    order by
      updated_at desc
  `

  ctx.body = rows
})

datasets.get("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state
  const { id } = ctx.params

  const [row] = await sql`
    select
      id, slug, runs, created_at, updated_at
    from
      dataset
    where
      project_id = ${projectId} and id = ${id}
  `

  ctx.body = row
})

datasets.post("/", async (ctx: Context) => {
  const { projectId } = ctx.state

  const { slug } = ctx.request.body as { slug: string }

  const [row] = await sql`
    insert into dataset ${sql({
      appId: projectId,
      slug,
    })} returning *
  `

  ctx.body = row
})

datasets.post("/:id/runs", async (ctx: Context) => {
  const { projectId, id } = ctx.params
  const { run } = ctx.request.body as {
    run: {
      input: any
      output: any
    }
  }

  // insert into jsonb[] runs

  await sql`
    update dataset
    set runs = runs || ${sql.json(run)}, updated_at = now()
    where project_id = ${projectId} and id = ${id}
  `

  ctx.status = 201
})

datasets.del("/:id/runs/:index", async (ctx: Context) => {
  const { projectId, id, index } = ctx.params

  // remove from jsonb[] from the run at index
  await sql` 
    update dataset
    set runs = runs - ${index}, updated_at = now()
    where project_id = ${projectId} and id = ${id}
  `

  ctx.status = 200
})

export default datasets
