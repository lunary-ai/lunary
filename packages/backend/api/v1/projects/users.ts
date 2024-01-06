import sql from "@/utils/db"
import Router from "koa-router"
import { Context } from "koa"

const users = new Router({
  prefix: "/users",
})

users.get("/", async (ctx: Context) => {
  const { projectId } = ctx.params
  const { limit, page } = ctx.query

  const users = await sql`
      with app_users as (
          select distinct on (external_id) id
          from app_user
          where app = ${projectId}
            and external_id is not null
      )
      select distinct on (u.external_id) u.*
      from app_user u
      where u.app = ${projectId}
        and u.external_id is not null
        and exists (
            select 1
            from run
            where run.user = u.id
            and run.type = 'llm'
        )`

  ctx.body = users
})

users.get("/runs/usage", async (ctx) => {
  const projectId = ctx.params.projectId as string
  const days = ctx.query.days as string

  const daysNum = days ? parseInt(days) : 1

  const runsUsage = await sql`
      select
          run.user as user_id,
          run.name,
          run.type,
          coalesce(sum(run.completion_tokens), 0)::int as completion_tokens,
          coalesce(sum(run.prompt_tokens), 0)::int as prompt_tokens,
          sum(case when run.status = 'error' then 1 else 0 end)::int as errors,
          sum(case when run.status = 'success' then 1 else 0 end)::int as success
      from
          run
      where
          run.app = ${projectId as string}
          and run.created_at >= now() - interval '1 day' * ${daysNum}
          and (run.type != 'agent' or run.parent_run is null)
      group by
          run.user,
          run.name, 
          run.type
          `

  ctx.body = runsUsage
})

users.get("/:id", async (ctx: Context) => {
  const { id } = ctx.params
  const [row] = await sql`
    select * from app_user where id = ${id} limit 1
  `

  ctx.body = row
})

export default users
