import Context from "@/src/utils/koa";
import Router from "koa-router";
import { $root } from "./proto";
import { ExportTraceServiceRequest } from "./types";
import { attrsToObj, spanToLunary } from "./utils";
import { processEventsIngestion } from "../runs/ingest";
import { Event } from "@/src/utils/ingest";
const otel = new Router({
  prefix: "/otel",
});

otel.post("/v1/traces", async (ctx: Context) => {
  const message =
    $root.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest.decode(
      ctx.request.body,
    ) as ExportTraceServiceRequest;

  let events: Event[] = [];
  console.log(JSON.stringify(message, null, 2));
  for (const resourceSpan of message.resourceSpans) {
    for (const scopeSpan of resourceSpan.scopeSpans) {
      const resAttrs = attrsToObj(resourceSpan.resource?.attributes);

      for (const span of scopeSpan.spans) {
        const [startEvent, endEvent] = spanToLunary(span, resAttrs);
        events.push(startEvent);
        events.push(endEvent);
      }
    }
  }

  console.log(events);
  await processEventsIngestion(ctx.state.projectId, events);
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
