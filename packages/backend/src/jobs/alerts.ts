import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import { z } from "zod";

// check alerts and record history
export async function checkAlerts() {
  try {
    const alerts = await sql`
    select id, project_id, status, threshold, metric, time_frame_minutes 
    from alert
    where status != 'disabled'
  `;

    for (const alert of alerts) {
      const { id, projectId, status, threshold, metric, timeFrameMinutes } =
        alert;

      let value: number;
      switch (metric) {
        case "error": {
          const [res] = await sql`
            with recent_runs as (
              select 
                error
              from 
                run
              where 
                project_id = ${projectId}
                ${sql.unsafe(`and created_at >= now() - '${timeFrameMinutes} minutes'::interval`)}
            )
            select 
              coalesce(avg(case when recent_runs.error is not null then 1 else 0 end) * 100, 0) as value
            from recent_runs
          `;
          value = res.value;
          break;
        }
        case "cost": {
          const [res] = await sql`
            select 
              coalesce(sum(cost), 0) as value
            from 
              run
            where 
              project_id = ${projectId}
              ${sql.unsafe(`and created_at >= now() - '${timeFrameMinutes} minutes'::interval`)}
          `;
          value = res.value;
          break;
        }
        case "feedback": {
          // compute feedback percentage: thumbs up rate
          const [{ value: v }] = await sql`
            select coalesce(
              avg(
                case when feedback->>'thumb' = 'up' then 1 else 0 end
              ) * 100,
              0
            ) as value
            from run
            where project_id = ${projectId}
              and created_at >= now() - interval '${timeFrameMinutes} minutes'
          `;
          value = v;
          break;
        }
        case "latency_p50":
        case "latency_p75":
        case "latency_p90":
        case "latency_p95":
        case "latency_p99": {
          // compute configured latency percentile in seconds
          const quantile = parseFloat(metric.split("_p")[1]) / 100;
          const [{ value: v }] = await sql`
            select coalesce(
              percentile_cont(${quantile}) within group (
                order by extract(epoch from duration)::float
              ),
              0
            ) as value
            from run
            where project_id = ${projectId}
              and created_at >= now() - interval '${timeFrameMinutes} minutes'
          `;
          value = v;
          break;
        }
        default:
          continue;
      }

      const nowDate = new Date();

      if (status === "healthy" && value > threshold) {
        await sql.begin(async (trx) => {
          await trx`
          update alert set status = 'triggered', updated_at = ${nowDate}
          where id = ${id}
        `;
          await trx`
          insert into alert_history ${sql(
            clearUndefined({
              alert_id: id,
              start_time: nowDate,
              end_time: nowDate,
              trigger: value,
              status: "ongoing",
            }),
          )}
        `;
        });
      } else if (status === "triggered" && value <= threshold) {
        await sql.begin(async (trx) => {
          await trx`
          update alert
          set status = 'healthy', updated_at = ${nowDate}
          where id = ${id}
        `;
          await trx`
          update alert_history
          set status = 'resolved', end_time = ${nowDate}, trigger = ${value}
          where alert_id = ${id} and status = 'ongoing'
        `;
        });
      }
    }
  } catch (error) {
    console.error("[ALERTS] error checking alerts", error);
    return;
  }
}
