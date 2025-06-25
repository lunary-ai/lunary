// Minimal, self-contained example that shows how to emit a Generative-AI span
// conforming to the OpenTelemetry Gen-AI semantic conventions **without**
// any runtime dependencies on the official OpenTelemetry SDK packages.
//
// Why not use the SDK?  The Lunary repository vendors the compiled protobuf
// types already, which means we can build an OTLP/HTTP request by hand and keep
// the example fully offline-capable (important for CI or air-gapped setups).
//
// Steps:
// 1. Start the local OTLP receiver: `bun run packages/otel/src/index.ts`.
// 2. Run this file           : `bun packages/otel/examples/send_genai_span.ts`.
// 3. Check the receiver logs – you should see one span turned into a Lunary
//    event and forwarded to the backend ingest endpoint.

import { ExportTraceServiceRequest } from "../src/gen/opentelemetry/proto/collector/trace/v1/trace_service.ts";
import { ResourceSpans } from "../src/gen/opentelemetry/proto/trace/v1/trace.ts";
import { Resource } from "../src/gen/opentelemetry/proto/resource/v1/resource.ts";
import { AnyValue, KeyValue } from "../src/gen/opentelemetry/proto/common/v1/common.ts";
import { ScopeSpans, Span, Span_SpanKind } from "../src/gen/opentelemetry/proto/trace/v1/trace.ts";

// ---- helpers ---------------------------------------------------------------
function strKV(key: string, value: string): KeyValue {
  return { key, value: { stringValue: value } as AnyValue } as KeyValue;
}

function intKV(key: string, value: number): KeyValue {
  return { key, value: { intValue: BigInt(value) } as AnyValue } as KeyValue;
}

// ---- build span ------------------------------------------------------------
const start = BigInt(Date.now() * 1_000_000);
const end = start + BigInt(3_000_000); // +3 ms

function rand(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

const span: Span = {
  traceId: rand(16),
  spanId: rand(8),
  name: "chat",
  kind: Span_SpanKind.SPAN_KIND_INTERNAL,
  startTimeUnixNano: start,
  endTimeUnixNano: end,
  attributes: [
    strKV("gen_ai.operation.name", "chat"),
    strKV("gen_ai.system", "openai"),
    strKV("gen_ai.request.prompt", "Hello world"),
    strKV("gen_ai.response.completion", "Howdy!"),
    intKV("gen_ai.usage.input_tokens", 4),
    intKV("gen_ai.usage.output_tokens", 1),
    strKV("lunary.project_key", process.env.LUNARY_PROJECT_KEY ?? "demo_key"),
  ],
  droppedAttributesCount: 0,
  droppedEventsCount: 0,
  droppedLinksCount: 0,
  events: [],
  links: [],
} as Span;

// ---- wrap into OTLP export request ----------------------------------------
const scopeSpans: ScopeSpans = {
  scope: { name: "example" },
  spans: [span],
  schemaUrl: "",
} as ScopeSpans;

const resource: Resource = {
  attributes: [strKV("service.name", "genai-demo"), strKV("service.version", "0.1.0")],
  droppedAttributesCount: 0,
  entityRefs: [],
} as Resource;

const resourceSpans: ResourceSpans = {
  resource,
  scopeSpans: [scopeSpans],
  schemaUrl: "",
} as ResourceSpans;

const exportReq: ExportTraceServiceRequest = {
  resourceSpans: [resourceSpans],
} as ExportTraceServiceRequest;

const payload = ExportTraceServiceRequest.encode(exportReq).finish();

// ---- send via OTLP/HTTP ----------------------------------------------------
await fetch("http://localhost:4318/v1/traces", {
  method: "POST",
  headers: { "Content-Type": "application/x-protobuf" },
  body: payload,
});

console.log("Example Gen-AI span sent – check receiver output");
