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
  const deserializedChecks = deserializeLogic(queryString);

  const enricherFilters = ["languages", "pii", "topics", "toxicity"];

  const mainChecks = deserializedChecks?.filter((check) => {
    if (check === "AND" || check === "OR") {
      return true;
    }
    return !enricherFilters.includes(check?.id);
  });

  const evaluatorChecks = deserializedChecks?.filter((check) => {
    if (check === "AND" || check === "OR") {
      return true;
    }
    return enricherFilters.includes(check?.id);
  });

  const filtersQuery =
    deserializedChecks?.length && deserializedChecks.length > 1 // first is always ["AND"]
      ? convertChecksToSQL(mainChecks)
      : sql`r.type = 'llm'`; // default to type llm

  const evaluatorFiltersQuery =
    evaluatorChecks?.length && evaluatorChecks.length > 1
      ? convertChecksToSQL(evaluatorChecks)
      : sql`true`;

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
        r.*,
        (r.prompt_tokens + r.completion_tokens) as total_tokens,
        eu.id as user_id,
        eu.external_id as user_external_id,
        eu.created_at as user_created_at,
        eu.last_seen as user_last_seen,
        eu.props as user_props,
        t.slug as template_slug,
        coalesce(er.results, '[]') as evaluation_results,
        parent_feedback.feedback as parent_feedback,
        chat_feedbacks.feedbacks as feedbacks,
        coalesce(scores, '[]'::json) as scores,
        ${localCreatedAt}                                
      from   
        run r
        left join external_user eu on r.external_user_id = eu.id
        left join template_version tv on r.template_version_id = tv.id
        left join template t on tv.template_id = t.id
        left join run pr
          on  pr.id   = r.parent_run_id
          and pr.type = 'chat'
        left join lateral (
          select 
            json_agg(jsonb_build_object('evaluatorName', e.name, 'evaluatorSlug', e.slug, 'evaluatorType', e.type, 'evaluatorId', e.id, 'result', er.result)) as results
          from 
            evaluation_result_v2 er
            left join evaluator e on er.evaluator_id = e.id
          where 
            er.run_id = r.id
          group by
            r.id
        ) as er on true
        left join lateral (
          select 
            json_agg(jsonb_build_object('value', rs.value, 'label', rs.label, 'comment', rs.comment)) as scores
          from
            run_score rs
          where
            rs.run_id = r.id
          group by
            r.id
        ) as rs on true
        left join lateral (
          with recursive parent_runs as (
            select id, parent_run_id, feedback from run where id = r.id
            union all
            select r.id, r.parent_run_id, r.feedback
            from run r
            join parent_runs on parent_runs.parent_run_id = r.id
            where r.parent_run_id is not null and r.type = 'chat'
          )
          select
            feedback
          from
            parent_runs
          where
            parent_runs.id != r.id
        ) parent_feedback on true
        left join lateral (
          select
            json_agg(feedback) as feedbacks
          from
            run r2
          where
            r2.parent_run_id = r.id
            and r2.type = 'chat'
      ) as chat_feedbacks on true
      where  
        r.project_id = ${projectId}
        and r.is_deleted = false
        and r.created_at >= ${startUtc}::timestamptz     
        and r.created_at <  ${endUtc}  ::timestamptz     
        and ${filtersQuery}
        ${
          evaluatorChecks?.length > 1
            ? sql`and exists (
          select 1
          from evaluation_result_v2 er2
          join evaluator e2 on er2.evaluator_id = e2.id
          where er2.run_id = r.id and ${evaluatorFiltersQuery} 
        )
        `
            : sql``
        }
        
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
