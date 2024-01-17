import sql from "@/utils/db"
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
    order by
      project_id
  `

  console.log(rows, projectId)

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

// TODO
// filters.get("/users", async (ctx) => {
//   const { projectId } = ctx.state
//   const usageRange = Number(ctx.query.usageRange) || 30

//   // TODO: do a new query to get the user list. Look at what is currently used in production
//   ctx.body = usersWithUsage
// })

export default filters
