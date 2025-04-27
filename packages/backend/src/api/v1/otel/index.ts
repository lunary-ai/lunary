import Context from "@/src/utils/koa";
import Router from "koa-router";
import { $root } from "./proto";
import { Event } from "lunary/types";
import { v4 as uuid } from "uuid";
import {
  attrsToMap,
  buildMessages,
  digForSpan,
  nsToIso,
  omitKeys,
} from "./utils";
import { processEventsIngestion } from "../runs/ingest";
const otel = new Router({
  prefix: "/otel",
});

export function convertOtelSpanToEvent(span: any): Event[] {
  const span1 = digForSpan(span);
  const attrs = attrsToMap(span1.attributes);

  /* ① basic ids & timing ------------------------------------------------ */
  const runId = span.spanId || uuid();
  const parentRunId =
    span.parentSpanId && span.parentSpanId !== "0000000000000000"
      ? span.parentSpanId
      : undefined;

  // Convert timestamps to ISO string format
  const tsStart = nsToIso(span.startTimeUnixNano);
  const tsEnd = nsToIso(span.endTimeUnixNano);

  /* ② input / output / model ------------------------------------------- */
  /* ★ new — build input / output arrays */
  const input = buildMessages("gen_ai.prompt.", attrs);
  const output = buildMessages("gen_ai.completion.", attrs);

  const model =
    attrs["gen_ai.request.model"] ??
    attrs["gen_ai.response.model"] ??
    attrs["llm.request.model"] ??
    span.name ??
    "unknown-model";

  /* ★ new — token usage with both gen_ai.* and llm.* fallbacks */
  const promptTokens =
    attrs["gen_ai.usage.prompt_tokens"] ?? attrs["llm.usage.prompt_tokens"];
  const completionTokens =
    attrs["gen_ai.usage.completion_tokens"] ??
    attrs["llm.usage.completion_tokens"];

  const tokensUsage =
    promptTokens != null || completionTokens != null
      ? {
          prompt: Number(promptTokens ?? 0),
          completion: Number(completionTokens ?? 0),
          total: Number(promptTokens ?? 0) + Number(completionTokens ?? 0),
        }
      : undefined;

  /* ④ status ------------------------------------------------------------ */
  const statusCode = span.status?.code ?? 0; // 0=UNSET,1=OK,2=ERROR
  const isError = statusCode === 2;

  /* ⑤ events ------------------------------------------------------------ */
  // Create start event object
  const start = {
    type: "llm" as const,
    event: "start" as const,
    runId,
    parentRunId,
    name: model,
    timestamp: tsStart,
    input,
    metadata: omitKeys(attrs),
  } as unknown as Event;

  // Create end event object
  const end = {
    type: "llm" as const,
    event: isError ? "error" : "end",
    runId,
    parentRunId,
    name: model,
    timestamp: tsEnd,
    ...(isError
      ? { error: { message: span.status?.message || "Unknown error" } }
      : {
          output,
          ...(tokensUsage ? { tokensUsage } : {}),
        }),
    metadata: omitKeys(attrs),
  } as unknown as Event;

  return [start, end];
}

otel.post("/v1/traces", async (ctx: Context) => {
  console.log("[OTEL] TRACES ENDPOINT STARTED");

  const msg =
    $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.decode(
      ctx.request.body,
    );

  const resourceSpans =
    $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.toObject(
      msg,
    ).resourceSpans;

  const events = resourceSpans.flatMap(convertOtelSpanToEvent);

  console.log(events, "events");
  await processEventsIngestion(`a5434ebd-02d4-4196-a078-00994dde404f`, events);
  ctx.status = 200;
});

otel.post("/v1/metrics", async (ctx: Context) => {
  const msg =
    $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest.decode(
      ctx.request.body,
    );
  const resourceMetrics =
    $root.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest.toObject(
      msg,
    ).resourceMetrics;

  ctx.status = 200;
});

otel.post("/v1/logs", async (ctx: Context) => {
  console.log("[OTEL] LOGS ENDPOINT STARTED");
  console.log(ctx.request.body);

  ctx.status = 200;
});

console.log(otel.stack.map((i) => i.path));

export default otel;
