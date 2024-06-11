import { checkAccess } from "@/src/utils/authorization"
import { convertChecksToSQL } from "@/src/utils/checks"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import Router from "koa-router"
import { deserializeLogic } from "shared"
import { z } from "zod"
import { parseQuery } from "./utils"

const analytics = new Router({
  prefix: "/analytics",
})

// TODO: access middleware

analytics.get(
  "/tokens",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
      ctx.query,
    )

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_sums as (
          select
            d.date,
            coalesce(sum(r.prompt_tokens + r.completion_tokens)::int, 0) as tokens,
            r.name
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by
            d.date,
            r.name
          having 
            coalesce(sum(r.prompt_tokens + r.completion_tokens), 0) != 0
        )
        select
          date, 
          tokens, 
          name
        from
          weekly_sums
        order by
          date;
      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        )
        select
          d.date,
          coalesce(sum(r.prompt_tokens + r.completion_tokens)::int, 0) as tokens,
          r.name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date,
          r.name
        having 
          coalesce(sum(r.prompt_tokens + r.completion_tokens), 0) != 0
        order by d.date;
    `

      ctx.body = res
      return
    }
  },
)

analytics.get(
  "/costs",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
      ctx.query,
    )

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_costs as (
          select
            d.date,
            coalesce(sum(r.cost)::float, 0) as costs,
            r.name
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by
            d.date,
            r.name
          having 
            coalesce(sum(r.cost)::float, 0) != 0
        )
        select
          date, 
          costs, 
          name
        from
          weekly_costs 
        order by
          date;
      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        )
        select
          d.date,
          coalesce(sum(r.cost)::float, 0) as costs,
          r.name
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date,
          r.name
        having 
          coalesce(sum(r.cost)::float, 0) != 0
        order by d.date;
    `

      ctx.body = res
      return
    }
  },
)

analytics.get(
  "/errors",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
      ctx.query,
    )

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_errors as (
          select
            d.date,
            coalesce(count(r.*)::int, 0) as errors
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
            and r.error is not null
          group by
            d.date
          having 
            coalesce(count(r.*)::int, 0) != 0
        )
        select
          date, 
          errors
        from
          weekly_errors
        order by
          date;
      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
          and error is not null
        )
        select
          d.date,
          coalesce(count(r.*)::int, 0) as errors
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date
        order by d.date;
    `

      ctx.body = res
      return
    }
  },
)

analytics.get(
  "/users/new",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { datesQuery, granularity, timeZone } = parseQuery(
      projectId,
      ctx.query,
    )

    const localCreatedAtMap = {
      hourly: sql`date_trunc('hour', eu.created_at at time zone ${timeZone})::timestamp as local_created_at`,
      daily: sql`date_trunc('day', eu.created_at at time zone ${timeZone})::timestamp as local_created_at`,
      weekly: sql`date_trunc('day', eu.created_at at time zone ${timeZone})::timestamp as local_created_at`,
    }

    const localCreatedAt = localCreatedAtMap[granularity]

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        external_users as (
          select
            *,
            ${localCreatedAt}
         from
           external_user eu
         where
           eu.project_id = ${projectId} 
        ),
        weekly_new_users as (
          select
            d.date,
            coalesce(count(eu.*)::int, 0) as users
          from
            dates d
            left join external_users eu on eu.local_created_at >= d.date and eu.local_created_at < d.date + interval '7 days'
          group by
            d.date
          having 
            coalesce(count(eu.*)::int, 0) != 0
        )
        select 
          date,
          users
        from
          weekly_new_users 
        order by
          date

      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        external_users as (
          select
            *,
            ${localCreatedAt}
         from
           external_user eu
         where
           eu.project_id = ${projectId}
        )
        select
          d.date,
          coalesce(count(eu.*), 0)::int as users
        from
          dates d
          left join external_users eu on d.date = eu.local_created_at
        group by
          d.date
        order by
          d.date;
      `
      ctx.body = res
      return
    }
  },
)

analytics.get(
  "/users/active",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const {
      datesQuery,
      filteredRunsQuery,
      granularity,
      timeZone,
      localCreatedAt,
    } = parseQuery(projectId, ctx.query)

    const distinctMap = {
      hourly: sql`distinct on (r.external_user_id, date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp)`,
      daily: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
      weekly: sql`distinct on (r.external_user_id, date_trunc('day', r.created_at at time zone ${timeZone})::timestamp)`,
    }
    const distinct = distinctMap[granularity]

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          select 
            ${distinct}
            *,
            ${localCreatedAt}
          from
            run r
          where
            r.project_id = ${projectId}          
            and r.external_user_id is not null
        ),
        weekly_active_users as (
          select
           d.date,
          coalesce(count(r.external_user_id)::int, 0) as users
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by 
            d.date
          order by 
            d.date
        )
        select
          date, 
          users
        from
          weekly_active_users
        order by
          date;
      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          select 
            ${distinct}
            *,
            ${localCreatedAt}
          from
            run r
          where
            r.project_id = ${projectId}          
            and r.external_user_id is not null
        )
        select
          d.date,
          coalesce(count(r.external_user_id)::int, 0) as users
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date
        order by d.date;
    `

      ctx.body = res
      return
    }
  },
)

analytics.get(
  "/users/average-cost",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const {
      datesQuery,
      filteredRunsQuery,
      granularity,
      timeZone,
      localCreatedAt,
    } = parseQuery(projectId, ctx.query)

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        user_costs as (
          select 
            r.external_user_id,
            ${localCreatedAt}, 
            coalesce(sum(r.cost)::float, 0)  as total_cost
          from
            run r
          where
            r.project_id = ${projectId}          
            and r.external_user_id is not null
          group by 
            r.external_user_id,
            local_created_at
        ),
        weekly_user_cost as (
          select
            d.date,
            coalesce(avg(r.total_cost)::float, 0) as cost
          from
            dates d
          left join
            user_costs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by
          d.date
        having 
          coalesce(avg(r.total_cost)::float, 0) != 0
        order by
          d.date
        )
        select
          date, 
          cost
        from
          weekly_user_cost
        order by
          date;
      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        user_costs as (
          select 
            r.external_user_id,
            ${localCreatedAt}, 
            coalesce(sum(r.cost)::float, 0)  as total_cost
          from
            run r
          where
            r.project_id = ${projectId}          
            and r.external_user_id is not null
          group by 
            r.external_user_id,
            local_created_at
        )
        select
          d.date,
          coalesce(avg(r.total_cost)::float, 0) as cost
        from
          dates d
          left join user_costs r on d.date = r.local_created_at
        group by
          d.date
        having 
          coalesce(avg(r.total_cost)::float, 0) != 0
        order by
          d.date;
      `

      ctx.body = res
      return
    }
  },
)

analytics.get(
  "/run-types",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
      ctx.query,
    )

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_sums as (
           select
            d.date,
            coalesce(count(r.type)::int, 0) as runs,
            r.type
          from
            dates d
          left join
            filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by 
            d.date,
            r.type
          having 
            coalesce(count(r.type), 0) != 0
          order by d.date
        )
        select
          date, 
          runs, 
          type
        from
          weekly_sums
        order by
          date;
      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        )
        select
          d.date,
          coalesce(count(r.type)::int, 0) as runs,
          r.type
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date,
          r.type
        having 
          coalesce(count(r.type), 0) != 0
        order by d.date;
    `

      ctx.body = res
      return
    }
  },
)

analytics.get(
  "/latency",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
      ctx.query,
    )

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        weekly_avg as (
          select
            d.date,
            coalesce(avg(extract(epoch from r.duration))::float, 0) as avg_duration
          from
            dates d
            left join filtered_runs r on r.local_created_at >= d.date and r.local_created_at < d.date + interval '7 days'
          group by 
            d.date, r.local_created_at
          having 
            coalesce(avg(extract(epoch from r.duration))::float, 0) != 0
          order by d.date
        )
        select
          date, 
          avg_duration
        from
          weekly_avg
        order by
          date;
      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        )
        select
          d.date,
          coalesce(avg(extract(epoch from r.duration))::float, 0) as avg_duration
        from
          dates d
          left join filtered_runs r on d.date = r.local_created_at
        group by 
          d.date
        having 
          coalesce(avg(extract(epoch from r.duration))::float, 0) != 0
        order by d.date;
    `

      ctx.body = res
      return
    }
  },
)

analytics.get(
  "/feedback-ratio",
  checkAccess("analytics", "read"),
  async (ctx: Context) => {
    const { projectId } = ctx.state
    const { datesQuery, filteredRunsQuery, granularity } = parseQuery(
      projectId,
      ctx.query,
    )

    if (granularity === "weekly") {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
      feedback_data as (
          select
            r.local_created_at,
            case when r.feedback->>'thumb' = 'up' then 1 else 0 end as thumbs_up,
            case when r.feedback->>'thumb' = 'down' then 1 else 0 end as thumbs_down
          from
            filtered_runs r
          where 
            r.feedback is not null
      ),
      weekly_avg as (
        select
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end as local_created_at,
          sum(fd.thumbs_up) as total_thumbs_up,
          sum(fd.thumbs_down) as total_thumbs_down,
          case 
            when sum(fd.thumbs_down) = 0 then null 
            else (sum(fd.thumbs_up) / sum(fd.thumbs_down))::float 
          end as ratio
        from
          dates d
          left join feedback_data fd on fd.local_created_at >= d.date and fd.local_created_at < d.date + interval '7 days'
        group by 
          d.date,
          case when fd.local_created_at is not null then fd.local_created_at else d.date end
        having 
          coalesce(avg(extract(epoch from fd.local_created_at))::float, 0) != 0
        order by d.date
      )
        select
          date, 
          ratio
        from
          weekly_avg
        order by
          date;
      `
      ctx.body = res
      return
    } else {
      const res = await sql`
        with dates as (
          ${datesQuery}
        ),
        filtered_runs as (
          ${filteredRunsQuery}
        ),
        feedback_data as (
          select
           r.local_created_at as date,
           case when r.feedback->>'thumb' = 'up' then 1 else 0 end as thumbs_up,
           case when r.feedback->>'thumb' = 'down' then 1 else 0 end as thumbs_down
         from
           filtered_runs r
         where 
          feedback is not null
        )
        select 
          d.date,
          coalesce(sum(fd.thumbs_up), 0)::int as total_thumbs_up,
          coalesce(sum(fd.thumbs_down), 0)::int as total_thumbs_down,
          case 
            when coalesce(sum(fd.thumbs_down)::int, 0) = 0 then null 
            else (coalesce(sum(fd.thumbs_up)::int, 0) / coalesce(sum(fd.thumbs_down), 0))::float end as ratio
        from 
          dates d
          left join feedback_data fd on d.date = fd.date
        group by 
          d.date
          
        order by
          d.date
        `
      ctx.body = res
      return
    }
  },
)

export default analytics
