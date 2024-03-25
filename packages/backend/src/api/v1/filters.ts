import sql from "@/src/utils/db"
import Router from "koa-router"
import { Context } from "koa"
import { checkAccess } from "@/src/utils/authorization"

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
    order by
      project_id
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
    order by
      project_id
  `

  ctx.body = rows.map((row) => row.tag)
})

filters.get("/feedbacks", async (ctx: Context) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      jsonb_build_object ('thumbs',
        feedback::json ->> 'thumbs')
    from
      run
    where
      feedback::json ->> 'thumbs' is not null
      and project_id = ${projectId}
    union
    select
      jsonb_build_object ('emoji',
        feedback::json ->> 'emoji')
    from
      run
    where
      feedback::json ->> 'emoji' is not null
      and project_id = ${projectId}
    union
    select
      jsonb_build_object ('rating',
        CAST(feedback::json ->> 'rating' as INT))
    from
      run
    where
      feedback::json ->> 'rating' is not null
      and project_id = ${projectId}
    union
    select
      jsonb_build_object ('retried',
        CAST(feedback::json ->> 'retried' as boolean))
    from
      run
    where
      feedback::json ->> 'retried' is not null
      and project_id = ${projectId}
  `

  const feedbacks = rows.map((row) => row.jsonbBuildObject)

  ctx.body = feedbacks
})

// get external users
filters.get("/users", async (ctx) => {
  const { projectId } = ctx.state

  const rows = await sql`
    select
      external_id as label,
      id as value
    from
      external_user
    where
      project_id = ${projectId}
    order by
      project_id
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
    order by
      project_id
  `

  ctx.body = rows
})

export default filters
