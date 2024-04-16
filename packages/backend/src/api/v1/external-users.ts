import sql from "@/src/utils/db"
import Router from "koa-router"
import { Context } from "koa"
import { checkAccess } from "@/src/utils/authorization"

const users = new Router({
  prefix: "/external-users",
})

users.get("/", checkAccess("users", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state

  const { limit = "100", page = "0", search, days } = ctx.query

  const daysNum = parseInt((days as string) || "1000")

  let searchQuery = sql``
  if (search) {
    searchQuery = sql`and (lower(external_id) ilike lower(${`%${search}%`}) or lower(props->>'email') ilike lower(${`%${search}%`}) or lower(props->>'name') ilike lower(${`%${search}%`}))`
  }

  // TODO: pagination
  const users = await sql`
    select 
      id::int,
      project_id,
      external_id, 
      created_at,
      last_seen,
      props,
      (select coalesce(sum(cost), 0) from run where external_user_id = external_user.id and run.created_at >= now() - interval '1 day' * ${daysNum}) as cost
    from 
      external_user
    where
      project_id = ${projectId}
      ${searchQuery}
    order by 
      cost desc
    limit ${Number(limit)}
    offset ${Number(page) * Number(limit)}`

  ctx.body = users
})

users.get("/runs/usage", checkAccess("users", "read"), async (ctx) => {
  const { projectId } = ctx.state
  const days = ctx.query.days as string

  const daysNum = days ? parseInt(days) : 1

  const runsUsage = await sql`
      select
          run.external_user_id as user_id,
          run.name,
          run.type,
          coalesce(sum(run.completion_tokens), 0)::int as completion_tokens,
          coalesce(sum(run.prompt_tokens), 0)::int as prompt_tokens,
          coalesce(sum(run.cost), 0)::float as cost,
          sum(case when run.status = 'error' then 1 else 0 end)::int as errors,
          sum(case when run.status = 'success' then 1 else 0 end)::int as success
      from
          run
      where
          run.project_id = ${projectId as string}
          and run.created_at >= now() - interval '1 day' * ${daysNum}
          and (run.type != 'agent' or run.parent_run_id is null)
      group by
          run.external_user_id,
          run.name, 
          run.type
          `

  ctx.body = runsUsage
})

users.get("/:id", checkAccess("users", "read"), async (ctx: Context) => {
  const { id } = ctx.params
  const [row] = await sql`
    select * from external_user where id = ${id} limit 1
  `

  ctx.body = row
})

export default users
