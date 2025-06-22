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
          `📦 traces: ${batch.resourceSpans.length} ResourceSpans, ` +
            `${
              batch.resourceSpans.flatMap((r) => r.scopeSpans).length
            } ScopeSpans`
        );
        const resp = ExportTraceServiceResponse.create(); // empty = “success”
        return ok(ExportTraceServiceResponse.encode(resp).finish());
      }

      case "/v1/metrics": {
        const batch = ExportMetricsServiceRequest.decode(body);
        console.log(
          `📊 metrics: ${batch.resourceMetrics.length} ResourceMetrics`
        );
        const resp = ExportMetricsServiceResponse.create();
        return ok(ExportMetricsServiceResponse.encode(resp).finish());
      }

      case "/v1/logs": {
        const batch = ExportLogsServiceRequest.decode(body);
        console.log(`📝 logs: ${batch.resourceLogs.length} ResourceLogs`);
        const resp = ExportLogsServiceResponse.create();
        return ok(ExportLogsServiceResponse.encode(resp).finish());
      }

      default:
        return bad("Unknown OTLP path", 404);
    }
  },
});

console.log("🔭 OTLP/HTTP receiver listening on http://localhost:4318");
