import { serve } from "bun"; // Bun’s built‑in HTTP server  [oai_citation:5‡bun.sh](https://bun.sh/docs/api/http?utm_source=chatgpt.com)

// --- Generated OTLP message types ------------------------------------------
import {
  ExportTraceServiceRequest,
  ExportTraceServiceResponse,
} from "./gen/opentelemetry/proto/collector/trace/v1/trace_service.ts";
import {
  ExportMetricsServiceRequest,
  ExportMetricsServiceResponse,
} from "./gen/opentelemetry/proto/collector/metrics/v1/metrics_service.ts";
import {
  ExportLogsServiceRequest,
  ExportLogsServiceResponse,
} from "./gen/opentelemetry/proto/collector/logs/v1/logs_service.ts";

// Transformer util
import { logToEvents, anyValueToJs, getSpanContent } from "./transform";
import { orderEvents, spanToEvents } from "./pydantic-tranform.ts";

// Where to send events
const BACKEND_INGEST_URL =
  process.env.LUNARY_BACKEND_URL || "http://localhost:3333/ingest/otel";

async function forward(events: any[]) {
  if (!events.length) return;

  console.log(`\n📥 Forwarding ${events.length} events to backend`);
  console.log("Events:", JSON.stringify(events, null, 2));

  // Try to find project key in the batch metadata (resource attribute
  // `lunary.project_key` is mapped to event.metadata.project_key).
  const first = events[0];
  const projectKey =
    first?.metadata?.project_key ||
    first?.metadata?.projectKey ||
    process.env.LUNARY_PUBLIC_KEY;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (projectKey) headers["lunary-project-key"] = projectKey;

  console.log(`Using project key: ${projectKey}`);

  try {
    const response = await fetch(BACKEND_INGEST_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ Backend returned ${response.status}: ${text}`);
    } else {
      console.log("✅ Successfully forwarded to backend");
    }
  } catch (err) {
    console.error("❌ Error forwarding OTEL batch to backend:", err);
  }
}

// Helpers --------------------------------------------------------------------
const PROTO = "application/x-protobuf";
function bad(msg: string, code = 415) {
  return new Response(msg, { status: code });
}
function ok(bytes: Uint8Array) {
  return new Response(bytes, { headers: { "Content-Type": PROTO } });
}

// Bun server -----------------------------------------------------------------
serve({
  port: 4318, // OTLP/HTTP default port
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (req.method !== "POST") return bad("Method not allowed", 405);
    if (!req.headers.get("content-type")?.startsWith(PROTO))
      return bad("Unsupported Content‑Type");

    const body = new Uint8Array(await req.arrayBuffer());

    switch (path) {
      case "/v1/traces": {
        const batch = ExportTraceServiceRequest.decode(body);
        console.log(
          `\n🔭 Received traces: ${batch.resourceSpans.length} ResourceSpans`,
        );

        // Transform to Lunary events and forward
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
              // console.log(span);
              const spanEvents = spanToEvents(span);
              console.log(
                `Processing span ${span.name} -> ${spanEvents.length} events`,
              );
              events.push(...spanEvents);
            }
          }
        }

        await forward(orderEvents(events));

        const resp = ExportTraceServiceResponse.create(); // empty = “success”
        return ok(ExportTraceServiceResponse.encode(resp).finish());
      }

      case "/v1/metrics": {
        const batch = ExportMetricsServiceRequest.decode(body);
        console.log(
          `📊 metrics: ${batch.resourceMetrics.length} ResourceMetrics`,
        );
        const resp = ExportMetricsServiceResponse.create();
        return ok(ExportMetricsServiceResponse.encode(resp).finish());
      }

      case "/v1/logs": {
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
        await forward(events);

        const resp = ExportLogsServiceResponse.create();
        return ok(ExportLogsServiceResponse.encode(resp).finish());
      }

      default:
        return bad("Unknown OTLP path", 404);
    }
  },
});

console.log("🔭 OTLP/HTTP receiver listening on http://localhost:4318");
