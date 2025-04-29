import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";
import { checkAlerts } from "@/src/jobs/alerts";

const alerts = new Router({ prefix: "/alerts" });

// Schema for alert definition
const AlertInput = z.object({
  name: z.string().min(1).max(50),
  status: z.enum(["healthy", "triggered", "disabled"]).optional(),
  threshold: z.number().min(0),
  metric: z.string(),
  timeFrameMinutes: z.number().int(),
  email: z.string().email().optional(),
  webhookUrl: z.string().url().optional(),
});

// list active alerts (auto-camelize applied to DB columns)
alerts.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const rows = await sql`
    select id, name, status, threshold, metric, time_frame_minutes, email, webhook_url, created_at
    from alert
    where project_id = ${projectId}
    order by created_at desc
  `;
  ctx.body = rows;
});

// create a new alert
alerts.post("/", async (ctx: Context) => {
  const { projectId, userId } = ctx.state;
  const data = AlertInput.parse(ctx.request.body);
  const [newAlert] = await sql`
    insert into alert ${sql(clearUndefined({ project_id: projectId, owner_id: userId, ...data }))}
    returning id, name, status, threshold, metric, time_frame_minutes, email, webhook_url, created_at
  `;
  ctx.body = newAlert;
  // immediately evaluate alerts scanning after creation
  await checkAlerts();
});

// Update an existing alert
alerts.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);
  const partial = AlertInput.partial().parse(ctx.request.body);
  const [updated] = await sql`
    update alert
    set ${sql(clearUndefined({ ...partial, updated_at: new Date() }))}
    where id = ${id} and project_id = ${projectId}
    returning id, name, status, threshold, metric, time_frame_minutes, email, webhook_url, created_at
  `;
  if (!updated) ctx.throw(404, "alert not found");
  ctx.body = updated;
  // re-evaluate after status change
  await checkAlerts();
});

// Delete an alert
alerts.delete("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);

  // fetch alert to delete for history
  const [toDelete] = await sql`
    select id, threshold, created_at
    from alert
    where id = ${id} and project_id = ${projectId}
  `;
  if (!toDelete) {
    ctx.throw(404, "alert not found");
  }
  await sql`
      delete from alert
      where id = ${id} and project_id = ${projectId}
    `;

  ctx.status = 200;
});

// list alert history (auto-camelize applies)
alerts.get("/history", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const rows = await sql`
    select h.id, h.alert_id, h.start_time, h.end_time, h.trigger, h.status
    from alert_history h
    join alert a on a.id = h.alert_id
    where a.project_id = ${projectId}
    order by h.start_time desc
  `;
  ctx.body = rows;
});

// get single alert by id
alerts.get("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);

  const [alert] = await sql`
    select id, name, status, threshold, metric, time_frame_minutes, email, webhook_url, created_at
    from alert
    where id = ${id} and project_id = ${projectId}
  `;
  ctx.body = alert;
});

export default alerts;
