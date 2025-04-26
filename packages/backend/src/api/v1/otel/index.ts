import Context from "@/src/utils/koa";
import Router from "koa-router";
import { $root } from "./proto";
import { $ } from "bun";
import { Event } from "lunary/types";

const otel = new Router({
  prefix: "/otel",
});

function convertOtelSpanToEvent(span: any): Event[] {
  console.log(span);
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
