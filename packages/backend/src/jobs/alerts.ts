import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import {
  notifyAlertRecipients,
  AlertNotificationEvent,
} from "@/src/utils/alertNotifications";

export async function checkAlerts() {
  try {
    const alerts = await sql`
      select id, project_id, name, status, threshold, metric, time_frame_minutes, emails, webhook_urls
      from alert
      where status != 'disabled'
    `;

    for (const alert of alerts) {
      const {
        id,
        projectId,
        name,
        status,
        threshold,
        metric,
        timeFrameMinutes,
        emails,
        webhookUrls,
      } = alert;

      const sanitizedTimeFrameMinutes = Math.floor(Number(timeFrameMinutes));
      if (isNaN(sanitizedTimeFrameMinutes) || sanitizedTimeFrameMinutes <= 0) {
        console.error(
          `[ALERTS] Invalid timeFrameMinutes value: ${timeFrameMinutes}`,
        );
        continue;
      }
      const windowInterval = sql`make_interval(mins => ${sanitizedTimeFrameMinutes}::int)`;

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
                and created_at >= now() - ${windowInterval}
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
              and created_at >= now() - ${windowInterval}
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
              and created_at >= now() - ${windowInterval}
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
              and created_at >= now() - ${windowInterval}
          `;
          value = v;
          break;
        }
        default:
          continue;
      }

      const nowDate = new Date();
      const emailList = Array.isArray(emails) ? emails : [];
      const webhookList = Array.isArray(webhookUrls) ? webhookUrls : [];
      const shouldNotify = emailList.length > 0 || webhookList.length > 0;

      async function sendNotification(
        event: AlertNotificationEvent,
        current: number,
      ) {
        if (!shouldNotify) return;

        try {
          await notifyAlertRecipients(
            { emails: emailList, webhookUrls: webhookList },
            {
              alertId: id,
              alertName: name,
              projectId,
              metric,
              threshold,
              value: current,
              windowMinutes: sanitizedTimeFrameMinutes,
              status: event,
              timestamp: nowDate,
            },
          );
        } catch (notificationError) {
          console.error("[ALERTS] notification dispatch failed", {
            alertId: id,
            event,
            error: notificationError,
          });
        }
      }

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

        await sendNotification("triggered", value);
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

        await sendNotification("resolved", value);
      }
    }
  } catch (error) {
    console.error("[ALERTS] error checking alerts", error);
    return;
  }
}
