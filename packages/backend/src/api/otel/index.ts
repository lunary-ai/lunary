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

  console.log(`\n📥 Processing ${events.length} OTEL events`);

  // Get project ID from authentication
  const projectId = ctx.state.projectId;
  
  if (!projectId) {
    // Try to find project key from events or headers
    const first = events[0];
    const projectKey =
      first?.metadata?.project_key ||
      first?.metadata?.projectKey ||
      ctx.headers["lunary-project-key"] ||
      process.env.LUNARY_PUBLIC_KEY;

    if (!projectKey) {
      throw new Error("No project key provided");
    }

    // Get project ID from key
    const [project] = await sql`
      select id from project 
      where public_key = ${projectKey} or private_key = ${projectKey}
      limit 1
    `;

    if (!project) {
      throw new Error("Invalid project key");
    }

    // Process events through the ingestion pipeline
    return await processEventsIngestion(project.id, events);
  }

  // Process events through the ingestion pipeline
  return await processEventsIngestion(projectId, events);
}

router.post("/v1/traces", async (ctx) => {
  if (!ctx.request.headers["content-type"]?.startsWith(PROTO)) {
    ctx.status = 415;
    ctx.body = "Unsupported Content-Type";
    return;
  }

  const body = new Uint8Array(ctx.request.body as any);
  const batch = ExportTraceServiceRequest.decode(body);
  
  console.log(
    `\n🔭 Received traces: ${batch.resourceSpans.length} ResourceSpans`,
  );

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
        console.log(
          `Processing span ${span.name} -> ${spanEvents.length} events`,
        );
        
        // Add resource attributes to each event's metadata
        for (const event of spanEvents) {
          if (!event.metadata) {
            event.metadata = {};
          }
          // Merge resource attributes into metadata
          Object.assign(event.metadata, resAttrs);
        }
        
        events.push(...spanEvents);
      }
    }
  }

  try {
    const results = await processEvents(ctx, orderEvents(events));
    console.log(`Processed ${results.length} events with results:`, results);
    
    // Return OTLP success response
    const resp = ExportTraceServiceResponse.create();
    ctx.type = PROTO;
    ctx.body = ExportTraceServiceResponse.encode(resp).finish();
  } catch (error) {
    console.error("Error processing traces:", error);
    ctx.status = 500;
    ctx.body = error.message;
  }
});

router.post("/v1/metrics", async (ctx) => {
  if (!ctx.request.headers["content-type"]?.startsWith(PROTO)) {
    ctx.status = 415;
    ctx.body = "Unsupported Content-Type";
    return;
  }

  const body = new Uint8Array(ctx.request.body as any);
  const batch = ExportMetricsServiceRequest.decode(body);
  
  console.log(
    `📊 metrics: ${batch.resourceMetrics.length} ResourceMetrics`,
  );
  
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
        console.log("LOG", log);
        events.push(...logToEvents(log, resAttrs));
      }
    }
  }
  
  try {
    const results = await processEvents(ctx, orderEvents(events));
    console.log(`Processed ${results.length} log events with results:`, results);
    
    // Return OTLP success response
    const resp = ExportLogsServiceResponse.create();
    ctx.type = PROTO;
    ctx.body = ExportLogsServiceResponse.encode(resp).finish();
  } catch (error) {
    console.error("Error processing logs:", error);
    ctx.status = 500;
    ctx.body = error.message;
  }
});

export default router;