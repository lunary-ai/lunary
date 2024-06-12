import { convertChecksToSQL } from "@/src/utils/checks"
import sql from "@/src/utils/db"
import Context from "@/src/utils/koa"
import { deserializeLogic } from "shared"
import { z } from "zod"

function buildFiltersQuery(checks: string) {
  const deserializedChecks = deserializeLogic(checks)
  return deserializedChecks?.length && deserializedChecks.length > 1
    ? convertChecksToSQL(deserializedChecks)
    : sql`1 = 1`
}

export function parseQuery(projectId: string, query: unknown) {
  return z
    .object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      timeZone: z.string(),
      granularity: z.union([
        z.literal("hourly"),
        z.literal("daily"),
        z.literal("weekly"),
      ]),
      checks: z.string().optional(),
    })
    .transform(({ startDate, endDate, timeZone, granularity, checks }) => {
      const filtersQuery = buildFiltersQuery(checks || "")
      const granularityToIntervalMap = {
        hourly: "1 hour",
        daily: "1 day",
        weekly: "7 days",
      }
      const localCreatedAtMap = {
        hourly: sql`date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
        daily: sql`date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
        weekly: sql`date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
      }
      const interval = granularityToIntervalMap[granularity]
      const localCreatedAt = localCreatedAtMap[granularity]

      const datesQuery = sql`
        select 
          * 
        from (
          select generate_series(
            ${startDate} at time zone ${timeZone},
            ${endDate} at time zone ${timeZone},
            ${interval}::interval
          )::timestamp as date) t
        where
          date <= current_timestamp at time zone ${timeZone} 
      `

      const filteredRunsQuery = sql`
        select 
          *,
          ${localCreatedAt}
        from
          run r
        where
          ${filtersQuery}
          and r.project_id = ${projectId}
    `

      return {
        startDate,
        endDate,
        datesQuery,
        filteredRunsQuery,
        granularity,
        timeZone,
        localCreatedAt,
      }
    })
    .parse(query)
}

// analytics.get(
//   "/feedback-ratio",
//   checkAccess("analytics", "read"),
//   requestBodyMiddleware(requestBodySchema),

//   async (ctx: Context) => {
//     const { projectId } = ctx.state
//     const { startDate, endDate } = ctx.state.requestBody
//     const interval = ctx.state.interval

//     const res = await sql`
//       with dates as (
//         select
//           generate_series(
//             ${startDate}::timestamptz,
//             ${endDate}::timestamptz,
//             ${"1 " + interval}::interval
//           )::date as date
//       ),
//       feedback_data as (
//         select
//           r.created_at::date as date,
//           case when r.feedback->>'thumb' = 'up' then 1 else 0 end as thumbs_up,
//           case when r.feedback->>'thumb' = 'down' then 1 else 0 end as thumbs_down
//         from
//           run r
//         where
//           r.project_id = ${projectId}

//       )
//       select
//         d.date,
//         coalesce(sum(fd.thumbs_up), 0) as total_thumbs_up,
//         coalesce(sum(fd.thumbs_down), 0) as total_thumbs_down,
//         case when coalesce(sum(fd.thumbs_down), 0) = 0 then null else coalesce(sum(fd.thumbs_up), 0)::float / coalesce(sum(fd.thumbs_down), 0)::float end as ratio
//       from
//         dates d
//         left join feedback_data fd on d.date = fd.date
//       group by
//         d.date

//       having coalesce(sum(fd.thumbs_down), 0) > 0
//       order by
//         d.date;
//     `
//     ctx.body = res
//   },
// )
