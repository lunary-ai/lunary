import { convertChecksToSQL } from "@/src/utils/checks";
import sql from "@/src/utils/db";
import Context from "@/src/utils/koa";
import { deserializeLogic } from "shared";
import { z } from "zod";

export function buildFiltersQuery(checks: string) {
  const deserializedChecks = deserializeLogic(checks);
  return deserializedChecks?.length && deserializedChecks.length > 1
    ? convertChecksToSQL(deserializedChecks)
    : sql`1 = 1`;
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
      const filtersQuery = buildFiltersQuery(checks || "");
      const granularityToIntervalMap = {
        hourly: "1 hour",
        daily: "1 day",
        weekly: "7 days",
      };
      const localCreatedAtMap = {
        hourly: sql`date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
        daily: sql`date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
        weekly: sql`date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
      };
      const interval = granularityToIntervalMap[granularity];
      const localCreatedAt = localCreatedAtMap[granularity];

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
      `;

      const filteredRunsQuery = sql`
        select 
          *,
          ${localCreatedAt}
        from
          run r
        where
          ${filtersQuery}
          and r.project_id = ${projectId}
    `;

      return {
        startDate,
        endDate,
        datesQuery,
        filteredRunsQuery,
        granularity,
        timeZone,
        localCreatedAt,
      };
    })
    .parse(query);
}
