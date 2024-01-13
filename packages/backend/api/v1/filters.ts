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
      app_model_name
    where
      app = ${projectId}
    order by
      app
  `

  ctx.body = rows
})

filters.get("/tags", async (ctx: Context) => {
  const { projectId } = ctx.state

  // const rows = await sql`
  //   select
  //     tag
  //   from
  //     app_tag
  //   where
  //     app = ${projectId}
  // `

  // ctx.body = rows

  ctx.body = [
    {
      tag: "some",
    },
    {
      tag: "tag",
    },
    {
      tag: "here",
    },
  ]
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
      and app = ${projectId}
    union
    select
      jsonb_build_object ('emoji',
        feedback::json ->> 'emoji')
    from
      run
    where
      feedback::json ->> 'emoji' is not null
      and app = ${projectId}
    union
    select
      jsonb_build_object ('rating',
        CAST(feedback::json ->> 'rating' as INT))
    from
      run
    where
      feedback::json ->> 'rating' is not null
      and app = ${projectId}
    union
    select
      jsonb_build_object ('retried',
        CAST(feedback::json ->> 'retried' as boolean))
    from
      run
    where
      feedback::json ->> 'retried' is not null
      and app = ${projectId}
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
