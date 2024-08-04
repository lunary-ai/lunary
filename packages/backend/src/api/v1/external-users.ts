import sql from "@/src/utils/db"
import Router from "koa-router"
import { Context } from "koa"
import { checkAccess } from "@/src/utils/authorization"
import { z } from "zod"

const users = new Router({
  prefix: "/external-users",
})

users.get("/", checkAccess("users", "list"), async (ctx: Context) => {
  const { projectId } = ctx.state
  const querySchema = z.object({
    limit: z.coerce.number().optional().default(100),
    page: z.coerce.number().optional().default(0),
    search: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    timeZone: z.string().optional(),
    sortField: z.string().optional().default("createdAt"),
    sortDirection: z
      .union([z.literal("acs"), z.literal("desc")])
      .optional()
      .default("desc"),
  })
  const {
    limit,
    page,
    search,
    startDate,
    endDate,
    timeZone,
    sortDirection,
    sortField,
  } = querySchema.parse(ctx.request.query)

  let searchQuery = sql``
  if (search) {
    searchQuery = sql`and (
      lower(external_id) ilike lower(${`%${search}%`}) 
      or lower(props->>'email') ilike lower(${`%${search}%`}) 
      or lower(props->>'name') ilike lower(${`%${search}%`})
    )`
  }

  let createAtQuery = sql``
  if (startDate && endDate && timeZone) {
    createAtQuery = sql`
      and r.created_at at time zone ${timeZone} >= ${startDate}
      and r.created_at at time zone ${timeZone} <= ${endDate}
    `
  }

  const sortMapping = {
    createdAt: "eu.created_at",
    lastSeen: "eu.last_seen",
    cost: "uc.cost",
  }

  let orderByClause = `${sortMapping[sortField]} ${sortDirection} nulls last`

  const [users, total] = await Promise.all([
    sql`
      with user_costs as (
        select
          external_user_id,
          coalesce(sum(cost), 0) as cost
        from
          run r
        where
          project_id = ${projectId} 
          ${createAtQuery}
        group by
          external_user_id
      )
      select
        eu.id,
        eu.created_at,
        eu.external_id,
        eu.last_seen,
        eu.props,
        uc.cost
      from
        public.external_user eu
        left join user_costs uc on eu.id = uc.external_user_id
      where
        eu.project_id = ${projectId} 
        ${searchQuery} 
      order by
        ${sql.unsafe(orderByClause)} 
      limit ${limit}
      offset ${page * limit}
    `,
    sql`
      select count(*) as total
      from public.external_user eu
      where eu.project_id = ${projectId} 
      ${searchQuery}
    `,
  ])

  ctx.body = {
    total: +total[0].total,
    page,
    limit,
    data: users,
  }
})

// TODO: deprecated?
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
  const { projectId } = ctx.state

  const [row] = await sql`
    select 
      * 
    from 
      external_user 
    where 
      id = ${id} 
      and project_id = ${projectId}
  `

  ctx.body = row
})

users.delete("/:id", checkAccess("users", "delete"), async (ctx: Context) => {
  const { id } = ctx.params
  const { projectId } = ctx.state

  await sql`
    delete 
    from external_user 
    where 
      id = ${id}
      and project_id = ${projectId}
    `

  ctx.status = 204
})

export default users
