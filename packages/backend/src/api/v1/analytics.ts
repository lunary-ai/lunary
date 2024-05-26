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

analytics.get(
  "/tokens",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

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

// TODO: middleware for requestBody, filtersQUery etc. for this router

analytics.get(
  "/errors",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const requestBody = z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      granularity: z.union([
        z.literal("hourly"),
        z.literal("daily"),
        z.literal("weekly"),
      ]),
      checks: z.string(),
    })
    const { projectId } = ctx.state
    const { startDate, endDate, granularity, checks } = requestBody.parse(
      ctx.request.query,
    )

    const filtersQuery = buildFiltersQuery(checks)

    const granularityToIntervalMap = {
      hourly: "hour",
      daily: "day",
      weekly: "week",
    }
    const interval = granularityToIntervalMap[granularity]

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
        count(r.*)::int as error_count 
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
  "/runs",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const requestBody = z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      granularity: z.union([
        z.literal("hourly"),
        z.literal("daily"),
        z.literal("weekly"),
      ]),
      checks: z.string(),
    })
    const { projectId } = ctx.state
    const { startDate, endDate, granularity, checks } = requestBody.parse(
      ctx.request.query,
    )

    const filtersQuery = buildFiltersQuery(checks)

    const granularityToIntervalMap = {
      hourly: "hour",
      daily: "day",
      weekly: "week",
    }
    const interval = granularityToIntervalMap[granularity]

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
      )
      select 
        d.date,
        count(r.*)::int as run_count 
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
  async (ctx: Context) => {
    const requestBody = z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      granularity: z.union([
        z.literal("hourly"),
        z.literal("daily"),
        z.literal("weekly"),
      ]),
      checks: z.string(),
    })
    const { projectId } = ctx.state
    const { startDate, endDate, granularity, checks } = requestBody.parse(
      ctx.request.query,
    )

    const filtersQuery = buildFiltersQuery(checks)

    const granularityToIntervalMap = {
      hourly: "hour",
      daily: "day",
      weekly: "week",
    }
    const interval = granularityToIntervalMap[granularity]

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
        avg(r.duration_seconds)::int as avg_duration
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
  "/users/new",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const requestBody = z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      granularity: z.union([
        z.literal("hourly"),
        z.literal("daily"),
        z.literal("weekly"),
      ]),
    })
    const { projectId } = ctx.state
    const { startDate, endDate, granularity } = requestBody.parse(
      ctx.request.query,
    )

    const granularityToIntervalMap = {
      hourly: "hour",
      daily: "day",
      weekly: "week",
    }
    const interval = granularityToIntervalMap[granularity]

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
        count(eu.created_at)::int as new_users_count
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
  "/latency",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

analytics.get(
  "/feedback/positive",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

analytics.get(
  "/feedback/negative",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {},
)

export default analytics
