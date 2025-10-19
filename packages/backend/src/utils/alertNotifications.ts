import { sendEmail } from "@/src/emails";
import config from "@/src/utils/config";

export type AlertNotificationEvent = "triggered" | "resolved";

export interface AlertNotificationDetails {
  alertId: string;
  alertName: string;
  projectId: string;
  metric: string;
  threshold: number;
  value: number;
  windowMinutes: number;
  status: AlertNotificationEvent;
  timestamp: Date;
}

export interface AlertRecipients {
  emails?: string[] | null;
  webhookUrls?: string[] | null;
}

export interface AlertWebhookDispatchResult {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
}

const ALERT_EMAIL_SENDER =
  config.PERSONAL_SENDER_ADDRESS ||
  config.GENERIC_SENDER_ADDRESS ||
  "alerts@lunary.ai";

const WEBHOOK_TIMEOUT_MS = 5000;

function normalizeTargets(values?: string[] | null): string[] {
  if (!values) return [];
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function buildAlertEmail(to: string, details: AlertNotificationDetails) {
  const {
    alertName,
    metric,
    threshold,
    value,
    windowMinutes,
    status,
    timestamp,
  } = details;
  const statusLabel = status === "triggered" ? "triggered" : "resolved";

  const subject = `[Lunary] Alert ${statusLabel} – ${alertName}`;
  const summary =
    status === "triggered"
      ? `The alert "${alertName}" was triggered because ${metric} reached ${formatNumber(value)}, breaching the threshold of ${threshold}.`
      : `The alert "${alertName}" is back to normal. ${metric} is now ${formatNumber(
          value,
        )}, below the threshold of ${threshold}.`;

  const text = `${summary}

Metric: ${metric}
Threshold: ${threshold}
Observed value: ${formatNumber(value)}
Window: ${windowMinutes} minute(s)
Project ID: ${details.projectId}
Time: ${timestamp.toISOString()}

You are receiving this message because you subscribed to alerts for this project.
`;

  return {
    subject,
    to,
    from: ALERT_EMAIL_SENDER,
    text,
  };
}

export function buildAlertWebhookPayload(details: AlertNotificationDetails) {
  return {
    type: `alert.${details.status}`,
    alertId: details.alertId,
    alertName: details.alertName,
    projectId: details.projectId,
    metric: details.metric,
    threshold: details.threshold,
    value: details.value,
    windowMinutes: details.windowMinutes,
    status: details.status,
    timestamp: details.timestamp.toISOString(),
    message:
      details.status === "triggered"
        ? `Alert "${details.alertName}" triggered (${details.metric}=${formatNumber(details.value)} > ${details.threshold}).`
        : `Alert "${details.alertName}" resolved (${details.metric}=${formatNumber(details.value)}).`,
  };
}

function isSlackWebhook(url: string): boolean {
  return /hooks\.slack\.com\/services\//.test(url);
}

type SlackField = { title: string; value: string; short: boolean };

function toSlackPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const status = String(payload.status ?? "");
  const statusColor =
    status === "triggered"
      ? "#e03131"
      : status === "resolved"
        ? "#2f9e44"
        : "#4c6ef5";

  const message =
    typeof payload.message === "string"
      ? payload.message
      : "Lunary alert notification";

  const metric = payload.metric ? String(payload.metric) : undefined;
  const threshold = payload.threshold ?? undefined;
  const value = payload.value ?? undefined;
  const windowMinutes = payload.windowMinutes ?? undefined;
  const timestamp = payload.timestamp
    ? Date.parse(String(payload.timestamp)) / 1000
    : Math.floor(Date.now() / 1000);

  const fields = (
    [
      metric
        ? {
            title: "Metric",
            value: metric,
            short: true,
          }
        : null,
      threshold !== undefined
        ? {
            title: "Threshold",
            value: String(threshold),
            short: true,
          }
        : null,
      value !== undefined
        ? {
            title: "Observed",
            value: String(value),
            short: true,
          }
        : null,
      windowMinutes !== undefined
        ? {
            title: "Window (minutes)",
            value: String(windowMinutes),
            short: true,
          }
        : null,
    ] as (SlackField | null)[]
  ).filter(Boolean) as SlackField[];

  return {
    text: message,
    attachments: [
      {
        color: statusColor,
        fields,
        ts: timestamp,
      },
    ],
  };
}

export async function postAlertWebhooks(
  urls: string[],
  payload: Record<string, unknown>,
): Promise<AlertWebhookDispatchResult[]> {
  const targets = normalizeTargets(urls);
  if (targets.length === 0) return [];

  return Promise.all(
    targets.map(async (url) => {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return {
            url,
            ok: false,
            error: "Only HTTP/HTTPS webhook URLs are supported",
          };
        }
      } catch {
        return { url, ok: false, error: "Invalid webhook URL" };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        WEBHOOK_TIMEOUT_MS,
      );

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "lunary-alert",
          },
          body: JSON.stringify(
            isSlackWebhook(url) ? toSlackPayload(payload) : payload,
          ),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          const snippet = text.length > 200 ? `${text.slice(0, 197)}...` : text;
          return {
            url,
            ok: false,
            status: response.status,
            error: snippet || `HTTP ${response.status}`,
          };
        }

        return { url, ok: true, status: response.status };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return { url, ok: false, error: "Request timed out" };
        }

        return {
          url,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        clearTimeout(timeoutId);
      }
    }),
  );
}

export async function notifyAlertRecipients(
  recipients: AlertRecipients,
  details: AlertNotificationDetails,
) {
  const emails = normalizeTargets(recipients.emails);
  const webhooks = normalizeTargets(recipients.webhookUrls);

  const emailJobs = emails.map((email) =>
    sendEmail(buildAlertEmail(email, details)),
  );
  const webhookJob = postAlertWebhooks(
    webhooks,
    buildAlertWebhookPayload(details),
  );

  const [emailResults, webhookResults] = await Promise.all([
    Promise.allSettled(emailJobs),
    webhookJob,
  ]);

  emailResults.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        "[ALERTS] email delivery failed",
        emails[index],
        result.reason,
      );
    }
  });

  webhookResults
    .filter((result) => !result.ok)
    .forEach((result) => {
      console.error("[ALERTS] webhook delivery failed", result);
    });
}
