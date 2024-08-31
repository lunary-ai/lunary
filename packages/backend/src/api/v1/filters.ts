import sql from "@/src/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const filters = new Router({
  prefix: "/filters",
})

filters.get("/models", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select distinct
      r.name
    from
      run r
    where
      r.project_id = ${projectId} 
      and r.type = 'llm'
      and r.name is not null
    order by
      name;
  `

  ctx.body = rows.map((row) => row.name)
})

filters.get("/tags", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select distinct
      unnest(tags) as tag 
    from
      run
    where
      project_id = ${projectId} 
  `

  ctx.body = rows.map((row) => row.tag)
})

filters.get("/metadata", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select distinct
      jsonb_object_keys(metadata) as key
    from
      run
    where
      project_id = ${projectId} 
      and metadata is not null
    order by
      key;
  `

  ctx.body = rows.map((row) => row.key)
})

filters.get("/users", async (ctx) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      *
    from
      external_user
    where
      project_id = ${projectId}
  `

  ctx.body = rows
})

filters.get("/templates", async (ctx) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      id as value,
      slug as label
    from
      template
    where
      project_id = ${projectId}
  `

  ctx.body = rows
})

export default filters
