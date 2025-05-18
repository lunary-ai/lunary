/* ---------- helpers ---------------------------------------------------- */
import { v4 as uuid } from "uuid";
export const nsToIso = (
  ns: number | string | { high?: number; low?: number } | undefined | null,
): string => {
  // Fallback to “now” if the field is missing
  if (ns == null) return new Date().toISOString();

  // Plain string | number
  if (typeof ns === "string" || typeof ns === "number")
    return new Date(Number(BigInt(ns) / 1_000_000n)).toISOString();

  // Protobuf Long variant with high/low
  if (typeof ns.high === "number" && typeof ns.low === "number") {
    const big = (BigInt(ns.high) << 32n) | BigInt(ns.low >>> 0);
    return new Date(Number(big / 1_000_000n)).toISOString();
  }

  // Any other “Long” that only has toString()
  if (typeof (ns as any).toString === "function") {
    return new Date(
      Number(BigInt((ns as any).toString()) / 1_000_000n),
    ).toISOString();
  }

  // Worst-case fallback
  return new Date().toISOString();
};

const anyVal = (v: any): any => {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("boolValue" in v) return v.boolValue;
  if ("intValue" in v) return Number(v.intValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("bytesValue" in v) return Buffer.from(v.bytesValue).toString("base64");
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(anyVal);
  if ("kvlistValue" in v)
    return Object.fromEntries(
      (v.kvlistValue.values || []).map((kv: any) => [kv.key, anyVal(kv.value)]),
    );
  return v;
};

export const attrsToMap = (
  arr: Array<{ key: string; value: any }> | undefined,
): Record<string, any> => {
  if (!Array.isArray(arr)) return {};
  const out: Record<string, any> = {};
  for (const { key, value } of arr) out[key] = anyVal(value);
  return out;
};

/* ★ new — helper to turn indexed prompt / completion keys into arrays */
export const buildMessages = (
  prefix: string,
  attrs: Record<string, any>,
): Array<{ role: string; content: string }> | undefined => {
  const buf: Record<number, { role?: string; content?: string }> = {};

  for (const [key, val] of Object.entries(attrs)) {
    if (!key.startsWith(prefix)) continue; // skip unrelated keys
    const rest = key.slice(prefix.length); // "0.role", "0.finish_reason", …
    const [idxStr, field] = rest.split(".");
    if (field === "finish_reason") continue; // <<-- ignore this field

    const idx = Number(idxStr);
    if (!buf[idx]) buf[idx] = {};
    (buf[idx] as any)[field] = val;
  }

  const ordered = Object.keys(buf)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => buf[i]);

  return ordered.length ? (ordered as any) : undefined;
};

export const digForSpan = (obj: any): any => {
  if (!obj) return {};
  if (Array.isArray(obj.attributes)) return obj; // got it
  if (Array.isArray(obj.spans)) return digForSpan(obj.spans[0]);
  if (Array.isArray(obj.scopeSpans)) return digForSpan(obj.scopeSpans[0]);
  if (Array.isArray(obj.resourceSpans)) return digForSpan(obj.resourceSpans[0]);
  return obj; // last resort
};

/* --------------------------------------------------------------- */
/* omitKeys ⇒ drops the noisy attributes                        */
/* --------------------------------------------------------------- */
/* keys you don’t want after prefix removal */
const OMIT_KEYS = new Set([
  "prompt.0.content",
  "completion.0.role",
  "request.model",
  "usage.completion_tokens",
  "llm.usage.total_tokens",
  "prompt.0.role",
]);

/**
 *  stripAndOmit ─ remove known prefixes, then drop unwanted keys
 */
export const omitKeys = (obj: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = {};

  for (const [fullKeyOrig, value] of Object.entries(obj)) {
    /* 2.1  strip known prefixes */
    let key = fullKeyOrig;
    if (key.startsWith("gen_ai.")) key = key.slice("gen_ai.".length);
    else if (key.startsWith("genAI.")) key = key.slice("genAI.".length);
    if (key.startsWith("openai.")) key = key.slice("openai.".length);

    /* 2.2  omit by *full* key (after prefix strip) */
    if (OMIT_KEYS.has(key)) continue;

    /* 2.3  keep only the last segment */
    const tail = key.slice(key.lastIndexOf(".") + 1);
    out[tail] = value;
  }

  return out;
};

/* -------------------------------------------------------------------- */
/* bufferToUuid ⇒ 8- or 16-byte Buffer → canonical UUID string          */
/* -------------------------------------------------------------------- */
import { randomUUID } from "crypto";
import { Event } from "lunary/types";

export const bufToUuid = (buf: any): string | undefined => {
  if (!Buffer.isBuffer(buf) && !(buf instanceof Uint8Array)) return undefined;
  // convert to 32-hex string, pad if spanId is 8 bytes
  const hex = Buffer.from(buf).toString("hex").padStart(32, "0").slice(-32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
};

/* ------------ robust JSON try-parse --------------------------------- */
export const safeJson = (v: any) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

/* ------------------------------------------------------------------- */
/* flattenSpans ⇒ collect every real span that owns an `attributes`    */
/* ------------------------------------------------------------------- */
export const flattenSpans = (obj: any): any[] => {
  if (!obj) return [];

  if (Array.isArray(obj.attributes)) {
    // this *is* a span
    return [obj];
  }

  let out: any[] = [];

  if (Array.isArray(obj.spans)) {
    for (const s of obj.spans) out = out.concat(flattenSpans(s));
  }
  if (Array.isArray(obj.scopeSpans)) {
    for (const ss of obj.scopeSpans) out = out.concat(flattenSpans(ss));
  }
  if (Array.isArray(obj.resourceSpans)) {
    for (const rs of obj.resourceSpans) out = out.concat(flattenSpans(rs));
  }

  return out;
};

export function buildTraceEventsForOneSpan(span: any): Event[] {
  const span1 = digForSpan(span);
  const attrs = attrsToMap(span1.attributes);
  //   console.log(span, "span");
  /* ① basic ids & timing ------------------------------------------------ */
  const runId = bufToUuid(span.spanId) ?? randomUUID();
  const parentRunId = bufToUuid(span.parentSpanId);

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
    type: "chain" as const,
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
    type: "chain" as const,
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

export function convertOtelSpanToEvent(span: any): Event[] {
  const span1 = digForSpan(span);
  const attrs = attrsToMap(span1.attributes);
  console.log(span, "span");
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

export function convertOtelSpanToTraceEvents(obj: any): Event[] {
  // 1 ▸ collect every leaf span in this subtree -----------------------
  const spans: any[] = [];
  console.log(obj, "obj");
  const collect = (node: any) => {
    if (!node) return;

    if (Array.isArray(node.attributes)) {
      spans.push(node); // this is a real span
      return;
    }
    if (Array.isArray(node.spans)) node.spans.forEach(collect);
    if (Array.isArray(node.scopeSpans)) node.scopeSpans.forEach(collect);
    if (Array.isArray(node.resourceSpans)) node.resourceSpans.forEach(collect);
  };

  collect(obj);

  // 2 ▸ build events for each span -----------------------------------
  return spans.flatMap(buildTraceEventsForOneSpan); // helper below
}
