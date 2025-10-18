import { checkAlerts } from "@/src/jobs/alerts";
import { postAlertWebhooks } from "@/src/utils/alertNotifications";
import sql from "@/src/utils/db";
import { clearUndefined } from "@/src/utils/ingest";
import Context from "@/src/utils/koa";
import Router from "koa-router";
import { z } from "zod";

const alerts = new Router({ prefix: "/alerts" });

// Schema for alert definition
const emailSchema = z.string().trim().email();
const webhookSchema = z.string().trim().url();

const AlertInput = z.object({
  name: z.string().min(1).max(50),
  status: z.enum(["healthy", "triggered", "disabled"]).optional(),
  threshold: z.number().min(0),
  metric: z.string(),
  timeFrameMinutes: z.number().int(),
  emails: z.array(emailSchema).max(20).optional(),
  webhookUrls: z.array(webhookSchema).max(20).optional(),
  // legacy single-target fields for backward compatibility
  email: emailSchema.optional(),
  webhookUrl: webhookSchema.optional(),
});

type AlertInputType = z.infer<typeof AlertInput>;
type AlertPartialInputType = Partial<AlertInputType>;

const AlertWebhookTestInput = z.object({
  webhookUrls: z.array(webhookSchema).min(1).max(20),
  name: z.string().trim().min(1).max(50).optional(),
  metric: z.string().optional(),
  threshold: z.number().min(0).optional(),
  timeFrameMinutes: z.number().int().min(1).optional(),
});

function collectUniqueStrings(values: (string | undefined)[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function extractEmails(payload: AlertPartialInputType): string[] {
  return collectUniqueStrings([...(payload.emails ?? []), payload.email]);
}

function extractWebhookUrls(payload: AlertPartialInputType): string[] {
  return collectUniqueStrings([
    ...(payload.webhookUrls ?? []),
    payload.webhookUrl,
  ]);
}

function hasEmailSelection(payload: AlertPartialInputType): boolean {
  return "emails" in payload || "email" in payload;
}

function hasWebhookSelection(payload: AlertPartialInputType): boolean {
  return "webhookUrls" in payload || "webhookUrl" in payload;
}

// list active alerts (auto-camelize applied to DB columns)
alerts.get("/", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const rows = await sql`
    select id, name, status, threshold, metric, time_frame_minutes, emails, webhook_urls, created_at
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
  const emails = extractEmails(data);
  const webhookUrls = extractWebhookUrls(data);

  const insertable = {
    ...clearUndefined({
      project_id: projectId,
      owner_id: userId,
      name: data.name,
      status: data.status,
      threshold: data.threshold,
      metric: data.metric,
      time_frame_minutes: data.timeFrameMinutes,
    }),
    emails: sql.array(emails),
    webhook_urls: sql.array(webhookUrls),
  };

  const [newAlert] = await sql`
    insert into alert ${sql(insertable)}
    returning id, name, status, threshold, metric, time_frame_minutes, emails, webhook_urls, created_at
  `;
  ctx.body = newAlert;
  // immediately evaluate alerts scanning after creation
  await checkAlerts();
});

alerts.post("/test-webhooks", async (ctx: Context) => {
  const { projectId, userId } = ctx.state;
  const data = AlertWebhookTestInput.parse(ctx.request.body);

  const alertDetails = clearUndefined({
    name: data.name,
    metric: data.metric,
    threshold: data.threshold,
    timeFrameMinutes: data.timeFrameMinutes,
  }) as Record<string, unknown>;

  const testPayload = clearUndefined({
    type: "alert.test",
    timestamp: new Date().toISOString(),
    projectId,
    triggeredBy: userId,
    message: "Test webhook triggered from Lunary alert configuration.",
    alert: Object.keys(alertDetails).length > 0 ? alertDetails : undefined,
  });

  const results = await postAlertWebhooks(data.webhookUrls, testPayload);

  const successCount = results.filter((result) => result.ok).length;
  const failureCount = results.length - successCount;

  ctx.body = {
    successCount,
    failureCount,
    results,
  };
});

// Update an existing alert
alerts.patch("/:id", async (ctx: Context) => {
  const { projectId } = ctx.state;
  const { id } = z.object({ id: z.string().uuid() }).parse(ctx.params);
  const partial = AlertInput.partial().parse(ctx.request.body);
  const baseUpdates = clearUndefined({
    name: partial.name,
    status: partial.status,
    threshold: partial.threshold,
    metric: partial.metric,
    time_frame_minutes: partial.timeFrameMinutes,
    updated_at: new Date(),
  });

  const updates: Record<string, unknown> = { ...baseUpdates };

  if (hasEmailSelection(partial)) {
    updates.emails = sql.array(extractEmails(partial));
  }

  if (hasWebhookSelection(partial)) {
    updates.webhook_urls = sql.array(extractWebhookUrls(partial));
  }

  const [updated] = await sql`
    update alert
    set ${sql(updates)}
    where id = ${id} and project_id = ${projectId}
    returning id, name, status, threshold, metric, time_frame_minutes, emails, webhook_urls, created_at
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
    select id, name, status, threshold, metric, time_frame_minutes, emails, webhook_urls, created_at
    from alert
    where id = ${id} and project_id = ${projectId}
  `;
  ctx.body = alert;
});

export default alerts;
