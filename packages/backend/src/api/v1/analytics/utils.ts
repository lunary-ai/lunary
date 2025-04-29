import { convertChecksToSQL } from "@/src/utils/checks";
import sql from "@/src/utils/db";
import { DateTime } from "luxon";
import { deserializeLogic, LogicNode } from "shared";
import { z } from "zod";

export function buildFiltersQuery(deserializedChecks: LogicNode) {
  return deserializedChecks?.length && deserializedChecks.length > 1
    ? convertChecksToSQL(deserializedChecks)
    : sql`1 = 1`;
}

export function parseQuery(projectId: string, queryString: string, query: any) {
  const checks = deserializeLogic(queryString);
  const filtersQuery = buildFiltersQuery(checks);

  return z
    .object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      timeZone: z.string(),
      granularity: z.union([
        z.literal("hourly"),
        z.literal("daily"),
        z.literal("weekly"),
        z.literal("monthly"),
      ]),
    })
    .transform(({ startDate, endDate, timeZone, granularity }) => {
      const startUtc = DateTime.fromISO(startDate, { zone: timeZone })
        .toUTC()
        .toISO();
      const endUtc = DateTime.fromISO(endDate, { zone: timeZone })
        .toUTC()
        .toISO();
      const granularityToIntervalMap = {
        hourly: "1 hour",
        daily: "1 day",
        weekly: "7 days",
      };
      const localCreatedAtMap = {
        hourly: sql`date_trunc('hour', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
        daily: sql`date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
        weekly: sql`date_trunc('day', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
        monthly: sql`date_trunc('month', r.created_at at time zone ${timeZone})::timestamp as local_created_at`,
      };
      const interval = granularityToIntervalMap[granularity];
      const localCreatedAt = localCreatedAtMap[granularity];

      const datesQuery = sql`
      select (gs at time zone ${timeZone})::timestamp as date          
      from   generate_series(
               ${startUtc}::timestamptz,
               ${endUtc}  ::timestamptz,
               ${interval}::interval
             ) gs
      where  gs <= current_timestamp                      
    `;

      const filteredRunsQuery = sql`
      select
        *,
        ${localCreatedAt}                                
      from   run r
      where  ${filtersQuery}
        and  r.project_id = ${projectId}
        and  r.created_at >= ${startUtc}::timestamptz     
        and  r.created_at <  ${endUtc}  ::timestamptz     
    `;

      return {
        startDate,
        endDate,
        startUtc,
        endUtc,
        datesQuery,
        filteredRunsQuery,
        granularity,
        timeZone,
        localCreatedAt,
        checks,
      };
    })
    .parse(query);
}
