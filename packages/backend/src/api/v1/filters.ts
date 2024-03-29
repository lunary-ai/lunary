import sql from "@/src/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const filters = new Router({
  prefix: "/filters",
})

filters.get("/models", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      name
    from
      model_name_cache
    where
      project_id = ${projectId}
  `

  ctx.body = rows.map((row) => row.name)
})

filters.get("/tags", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      tag
    from
      tag_cache
    where
      project_id = ${projectId}
  `

  ctx.body = rows.map((row) => row.tag)
})

filters.get("/feedback", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      feedback
    from
      feedback_cache
    where
      project_id = ${projectId}
  `

  ctx.body = rows.map((row) => row.feedback) // stringify so  it works with selected
})

// get all unique keys in metadata table
filters.get("/metadata", async (ctx: Context) => {
  const { projectId } = ctx.state
  // show the metadatas relevant to the type
  const { type } = ctx.query

  const rows = await sql`
    select
      key
    from
      metadata_cache
    where
      project_id = ${projectId}
  `

  ctx.body = rows.map((row) => row.key)
})

// get external users
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

filters.get("/radars", async (ctx) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      id as value,
      description as label
    from
      radar
    where
      project_id = ${projectId}
  `

  ctx.body = rows
})

export default filters
