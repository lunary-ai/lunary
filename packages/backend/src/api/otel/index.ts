import Router from "koa-router";
import { Context } from "koa";

import {
  ExportTraceServiceRequest,
  ExportTraceServiceResponse,
} from "./gen/opentelemetry/proto/collector/trace/v1/trace_service";
import {
  ExportMetricsServiceRequest,
  ExportMetricsServiceResponse,
} from "./gen/opentelemetry/proto/collector/metrics/v1/metrics_service";
import {
  ExportLogsServiceRequest,
  ExportLogsServiceResponse,
} from "./gen/opentelemetry/proto/collector/logs/v1/logs_service";

import { logToEvents, anyValueToJs } from "./transform";
import { orderEvents, spanToEvents } from "./pydantic-transform";
import { processEventsIngestion } from "../v1/runs/ingest";
import sql from "@/src/utils/db";

const PROTO = "application/x-protobuf";

const router = new Router();

async function processEvents(ctx: Context, events: any[]) {
  if (!events.length) {
    return [];
  }

  const projectId = ctx.state.projectId;

  if (!projectId) {
    const authHeader = ctx.headers["authorization"];
    let projectKey = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      projectKey = authHeader.substring(7);
    }

    if (!projectKey) {
      const first = events[0];
      projectKey =
        first?.metadata?.project_key ||
        first?.metadata?.projectKey ||
        ctx.headers["lunary-project-key"] ||
        process.env.LUNARY_PUBLIC_KEY;
    }

    if (!projectKey) {
      throw new Error("No project key provided");
    }

    const [project] = await sql`
      select id from project 
      where public_key = ${projectKey} or private_key = ${projectKey}
      limit 1
    `;

    if (!project) {
      throw new Error("Invalid project key");
    }

    const sortedEvents = sortEventsByDependencies(events);

    return await processEventsIngestion(project.id, sortedEvents);
  }

  const sortedEvents = sortEventsByDependencies(events);

  return await processEventsIngestion(projectId, sortedEvents);
}

function sortEventsByDependencies(events: any[]) {
  const eventsByRunId = new Map<string, any[]>();
  for (const event of events) {
    if (!eventsByRunId.has(event.runId)) {
      eventsByRunId.set(event.runId, []);
    }
    eventsByRunId.get(event.runId)!.push(event);
  }

  const runIdToParentRunId = new Map<string, string | undefined>();
  for (const event of events) {
    if (event.runId && event.parentRunId) {
      runIdToParentRunId.set(event.runId, event.parentRunId);
    } else if (event.runId) {
      runIdToParentRunId.set(event.runId, undefined);
    }
  }

  const sortedRunIds: string[] = [];
  const visited = new Set<string>();

  function visit(runId: string) {
    if (visited.has(runId)) return;
    visited.add(runId);

    const parentRunId = runIdToParentRunId.get(runId);
    if (parentRunId && runIdToParentRunId.has(parentRunId)) {
      visit(parentRunId);
    }

    sortedRunIds.push(runId);
  }

  for (const runId of runIdToParentRunId.keys()) {
    visit(runId);
  }

  const sortedEvents: any[] = [];
  for (const runId of sortedRunIds) {
    const runEvents = eventsByRunId.get(runId) || [];
    runEvents.sort((a, b) => {
      const timeDiff =
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
      // If same timestamp, start events come before end events
      if (a.event === "start" && b.event === "end") return -1;
      if (a.event === "end" && b.event === "start") return 1;
      return 0;
    });
    sortedEvents.push(...runEvents);
  }

  return sortedEvents;
}

router.post("/v1/traces", async (ctx) => {
  if (!ctx.request.headers["content-type"]?.startsWith(PROTO)) {
    ctx.status = 415;
    ctx.body = "Unsupported Content-Type";
    return;
  }

  const body = new Uint8Array(ctx.request.body as any);
  const batch = ExportTraceServiceRequest.decode(body);

  const events: any[] = [];
  for (const rs of batch.resourceSpans) {
    const resAttrs = Object.fromEntries(
      (rs.resource?.attributes || []).map((kv) => [
        kv.key,
        anyValueToJs(kv.value),
      ]),
    );

    for (const ss of rs.scopeSpans) {
      for (const span of ss.spans) {
        const spanEvents = spanToEvents(span);

        events.push(...spanEvents);
      }
    }
  }

  const resp = ExportTraceServiceResponse.create();
  ctx.type = PROTO;
  ctx.body = ExportTraceServiceResponse.encode(resp).finish();

  processEvents(ctx, orderEvents(events));
});

router.post("/v1/metrics", async (ctx) => {
  if (!ctx.request.headers["content-type"]?.startsWith(PROTO)) {
    ctx.status = 415;
    ctx.body = "Unsupported Content-Type";
    return;
  }

  const body = new Uint8Array(ctx.request.body as any);
  const batch = ExportMetricsServiceRequest.decode(body);

  const resp = ExportMetricsServiceResponse.create();
  ctx.type = PROTO;
  ctx.body = ExportMetricsServiceResponse.encode(resp).finish();
});

router.post("/v1/logs", async (ctx) => {
  if (!ctx.request.headers["content-type"]?.startsWith(PROTO)) {
    ctx.status = 415;
    ctx.body = "Unsupported Content-Type";
    return;
  }

  const body = new Uint8Array(ctx.request.body as any);
  const batch = ExportLogsServiceRequest.decode(body);

  const events: any[] = [];
  for (const rl of batch.resourceLogs) {
    const resAttrs = Object.fromEntries(
      (rl.resource?.attributes || []).map((kv) => [
        kv.key,
        anyValueToJs(kv.value),
      ]),
    );
    for (const sl of rl.scopeLogs) {
      for (const log of sl.logRecords) {
        events.push(...logToEvents(log, resAttrs));
      }
    }
  }

  const resp = ExportLogsServiceResponse.create();
  ctx.type = PROTO;
  ctx.body = ExportLogsServiceResponse.encode(resp).finish();

  processEvents(ctx, orderEvents(events));
});

export default router;
