import { checkAccess } from "@/src/utils/authorization"
import { convertChecksToSQL } from "@/src/utils/checks"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { deserializeLogic } from "shared"
import { z } from "zod"

const analytics = new Router({
  prefix: "/analytics",
})

// analytics.get(
//   "/tokens",
//   checkAccess("analytics", "read"),
//   async (ctx: Context) => {},
// )

analytics.get("/cost", checkAccess("analytics", "read"), async (ctx) => {
  const { projectId } = ctx.state

  await sql`
    select
      eu.id,
      sum(run.cost) as cost
    from
      external_user eu
      left join run on run.external_user_id = eu.id
    where
      eu.project_id = ${projectId} 
    group by 
      eu.id
   `
})

analytics.get(
  "/users/cost",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

// TODO:  put this in another file
function buildFiltersQuery(checks: string) {
  const deserializedChecks = deserializeLogic(checks)
  return deserializedChecks?.length && deserializedChecks.length > 1
    ? convertChecksToSQL(deserializedChecks)
    : sql`1 = 1`
}

const requestBodyMiddleware =
  (schema: any) => async (ctx: Context, next: () => Promise<any>) => {
    ctx.state.requestBody = schema.parse(ctx.request.query)
    ctx.state.granularityToIntervalMap = {
      hourly: "hour",
      daily: "day",
      weekly: "week",
    }
    ctx.state.interval =
      ctx.state.granularityToIntervalMap[ctx.state.requestBody.granularity]
    await next()
  }

const filtersQueryMiddleware = async (
  ctx: Context,
  next: () => Promise<any>,
) => {
  ctx.state.filtersQuery = ctx.state.requestBody.checks
    ? buildFiltersQuery(ctx.state.requestBody.checks)
    : sql`1 = 1`
  await next()
}

const requestBodySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  granularity: z.union([
    z.literal("hourly"),
    z.literal("daily"),
    z.literal("weekly"),
  ]),
  checks: z.string().optional(),
})

analytics.get(
  "/errors",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema),
  filtersQueryMiddleware,
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const filtersQuery = ctx.state.filtersQuery
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
          select
              generate_series(
                  ${startDate}::timestamptz,
                  ${endDate}::timestamptz,
                  ${"1 " + interval}::interval
              )::date as date
      ),
      filtered_runs as (
        select
          *
        from 
          run r
        where
          ${filtersQuery} 
          and project_id = ${projectId} 
          and error is not null
      )
      select 
        d.date,
        count(r.*)::int as errors 
      from 
        dates d
        left join filtered_runs r on d.date = date_trunc(${interval}, r.created_at)::date 
      group by 
        d.date
      order by 
        d.date
    `
    ctx.body = res
  },
)

analytics.get(
  "/latency",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema),
  filtersQueryMiddleware,
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const filtersQuery = ctx.state.filtersQuery
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
          select
              generate_series(
                  ${startDate}::timestamptz,
                  ${endDate}::timestamptz,
                  ${"1 " + interval}::interval
              )::date as date
      ),
      filtered_runs as (
        select
          *,
          extract(epoch from duration) as duration_seconds
        from 
          run r
        where
          ${filtersQuery} 
          and project_id = ${projectId} 
      )
      select 
        d.date,
        avg(r.duration_seconds)::float as avg_duration
      from 
        dates d
        left join filtered_runs r on d.date = date_trunc(${interval}, r.created_at)::date 
      group by 
        d.date
      order by 
        d.date
    `
    ctx.body = res
  },
)

analytics.get(
  "/tokens",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema),
  filtersQueryMiddleware,
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const filtersQuery = ctx.state.filtersQuery
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
          select
              generate_series(
                  ${startDate}::timestamptz,
                  ${endDate}::timestamptz,
                  ${"1 " + interval}::interval
              )::date as date
      ),
      token_data as (
        select
          r.name,
          r.created_at,
          (r.prompt_tokens + r.completion_tokens) as total_tokens
        from
          run r
        where
          ${filtersQuery} 
          and r.project_id = ${projectId} 
      )
      select
        d.date,
        td.name,
        sum(td.total_tokens)::int as tokens
      from
        dates d
        left join token_data td on d.date = td.created_at::date
      group by
        d.date, td.name
      having sum(td.total_tokens) is not null
      order by
        d.date, td.name
    `
    ctx.body = res
  },
)

analytics.get(
  "/costs",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema),
  filtersQueryMiddleware,
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const filtersQuery = ctx.state.filtersQuery
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
          select
              generate_series(
                  ${startDate}::timestamptz,
                  ${endDate}::timestamptz,
                  ${"1 " + interval}::interval
              )::date as date
      ),
      cost_data as (
        select
          r.name,
          r.created_at,
          r.cost
        from
          run r
        where
          ${filtersQuery} 
          and r.project_id = ${projectId} 
      )
      select
        d.date,
        cd.name,
        sum(cd.cost)::float as costs
      from
        dates d
        left join cost_data cd on d.date = cd.created_at::date
      group by
        d.date, cd.name
      having sum(cd.cost) is not null
      order by
        d.date, cd.name
    `
    ctx.body = res
  },
)

analytics.get(
  "/run-types",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema),
  filtersQueryMiddleware,
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const filtersQuery = ctx.state.filtersQuery
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
          select
              generate_series(
                  ${startDate}::timestamptz,
                  ${endDate}::timestamptz,
                  ${"1 " + interval}::interval
              )::date as date
      ),
      run_data as (
        select
          r.type,
          r.created_at
        from
          run r
        where
          ${filtersQuery} 
          and r.project_id = ${projectId} 
      )
      select
        d.date,
        rd.type,
        count(rd.type)::int as runs
      from
        dates d
        left join run_data rd on d.date = rd.created_at::date
      group by
        d.date, rd.type
      having count(rd.type) is not null and count(rd.type) > 0
      order by
        d.date, rd.type
    `
    ctx.body = res
  },
)

analytics.get(
  "/users/new",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema.omit({ checks: true })),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
          select
              generate_series(
                  ${startDate}::timestamptz,
                  ${endDate}::timestamptz,
                  ${"1 " + interval}::interval
              )::date as date
      ),
      external_users as (
        select
          created_at
        from
          external_user eu
        where
          eu.project_id = ${projectId} 
      )
      select
        d.date, 
        count(eu.created_at)::int as users
      from
        dates d
        left join external_users eu on d.date = eu.created_at::date
      group by
        d.date
      order by
        d.date;
    `
    ctx.body = res
  },
)

analytics.get(
  "/users/active",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema.omit({ checks: true })),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
          select
              generate_series(
                  ${startDate}::timestamptz,
                  ${endDate}::timestamptz,
                  ${"1 " + interval}::interval
              )::date as date
      ),
      active_users as (
        select distinct
          r.external_user_id as id,
          r.created_at::date as date
        from
          run r
        where
          r.project_id = ${projectId} 
          and r.created_at >= ${startDate}::timestamptz
          and r.created_at <= ${endDate}::timestamptz
      )
      select
        d.date, 
        count(au.id)::int as users
      from
        dates d
        left join active_users au on d.date = au.date
      group by
        d.date
      order by
        d.date;
    `
    ctx.body = res
  },
)

analytics.get(
  "/users/average-cost",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
          select
              generate_series(
                  ${startDate}::timestamptz,
                  ${endDate}::timestamptz,
                  ${"1 " + interval}::interval
              )::date as date
      ),
      user_costs as (
        select
          r.external_user_id as user_id,
          r.created_at::date as date,
          sum(r.cost) as total_cost
        from
          run r
        where
          r.project_id = ${projectId} 
          and r.created_at >= ${startDate}::timestamptz
          and r.created_at <= ${endDate}::timestamptz
        group by
          r.external_user_id,
          r.created_at::date
      )
      select
        d.date, 
        avg(uc.total_cost) as cost
      from
        dates d
        left join user_costs uc on d.date = uc.date
      group by
        d.date
      having avg(uc.total_cost) is not null and avg(uc.total_cost) > 0
      order by
        d.date;
    `
    ctx.body = res
  },
)

analytics.get(
  "/feedback-ratio",
  checkAccess("analytics", "read"),
  requestBodyMiddleware(requestBodySchema),

  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { startDate, endDate } = ctx.state.requestBody
    const interval = ctx.state.interval

    const res = await sql`
      with dates as (
        select
          generate_series(
            ${startDate}::timestamptz,
            ${endDate}::timestamptz,
            ${"1 " + interval}::interval
          )::date as date
      ),
      feedback_data as (
        select
          r.created_at::date as date,
          case when r.feedback->>'thumb' = 'up' then 1 else 0 end as thumbs_up,
          case when r.feedback->>'thumb' = 'down' then 1 else 0 end as thumbs_down
        from
          run r
        where
          r.project_id = ${projectId}
          
      )
      select
        d.date,
        coalesce(sum(fd.thumbs_up), 0) as total_thumbs_up,
        coalesce(sum(fd.thumbs_down), 0) as total_thumbs_down,
        case when coalesce(sum(fd.thumbs_down), 0) = 0 then null else coalesce(sum(fd.thumbs_up), 0)::float / coalesce(sum(fd.thumbs_down), 0)::float end as ratio
      from
        dates d
        left join feedback_data fd on d.date = fd.date
      group by
        d.date
    
      having coalesce(sum(fd.thumbs_down), 0) > 0
      order by
        d.date;
    `
    console.log(res)
    ctx.body = res
  },
)

export default analytics
