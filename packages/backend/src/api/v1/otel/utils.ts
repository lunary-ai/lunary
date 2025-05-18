// utils.ts – tweaks for chains & tools: better names, extra tool args, wider token keys

/*********************************
 * Generic helpers               *
 *********************************/

import { Event } from "@/src/utils/ingest";
import {
  AnyValue,
  KeyValue,
  Span,
  SpanEvent,
  Status,
  StatusCode,
} from "./types";

export function anyValueToJs(v: AnyValue): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.intValue !== undefined) return Number(v.intValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.arrayValue) return v.arrayValue.map(anyValueToJs);
  if (v.kvlistValue) {
    const obj: Record<string, unknown> = {};
    for (const kv of v.kvlistValue) obj[kv.key] = anyValueToJs(kv.value);
    return obj;
  }
  if (v.bytesValue) return Buffer.from(v.bytesValue).toString("base64");
  return undefined;
}

export function attrsToObj(attrs: KeyValue[] = []): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const kv of attrs) obj[kv.key] = anyValueToJs(kv.value);
  return obj;
}

export const bytesToHex = (b?: Uint8Array): string | undefined =>
  b && b.length ? Buffer.from(b).toString("hex") : undefined;

export function nsToIso(nano?: number | string): string {
  if (!nano) return new Date().toISOString();
  const n = typeof nano === "string" ? Number(nano) : nano;
  return new Date(n / 1e6).toISOString();
}

/*********************************
 * Gen-AI helpers                *
 *********************************/

export function detectType(attrs: Record<string, unknown>): Event["type"] {
  if (
    "gen_ai.tool.name" in attrs ||
    "tool_arguments" in attrs ||
    "gen_ai.tool.call.id" in attrs
  )
    return "tool";
  if ("gen_ai.agent.name" in attrs || "agent_name" in attrs) return "agent";
  if (
    "gen_ai.request.model" in attrs ||
    "gen_ai.response.model" in attrs ||
    "model_name" in attrs
  )
    return "llm";
  return "chain";
}

export function buildError(status?: Status): Event["error"] {
  return status?.code === StatusCode.ERROR
    ? { message: status.message ?? "unknown error" }
    : undefined;
}

export function tokensUsage(
  attrs: Record<string, unknown>,
): Event["tokensUsage"] | undefined {
  const toNum = (v: unknown): number | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    }
    return undefined;
  };

  // Accept gen_ai.*, llm.* and plain *_tokens keys
  const promptAttr =
    attrs["gen_ai.usage.prompt_tokens"] ??
    attrs["gen_ai.usage.input_tokens"] ??
    attrs["llm.usage.prompt_tokens"] ??
    attrs["llm.usage.input_tokens"] ??
    attrs["input_tokens"];

  const completionAttr =
    attrs["gen_ai.usage.completion_tokens"] ??
    attrs["gen_ai.usage.output_tokens"] ??
    attrs["llm.usage.completion_tokens"] ??
    attrs["llm.usage.output_tokens"] ??
    attrs["output_tokens"];

  const cachedAttr =
    attrs["gen_ai.usage.cache_read_input_tokens"] ??
    attrs["llm.usage.cache_read_input_tokens"];

  const totalAttr =
    attrs["gen_ai.usage.total_tokens"] ?? attrs["llm.usage.total_tokens"];

  let prompt = toNum(promptAttr);
  let completion = toNum(completionAttr);
  const promptCached = toNum(cachedAttr);
  const total = toNum(totalAttr);

  if (total !== undefined) {
    if (prompt === undefined && completion !== undefined)
      prompt = total - completion;
    if (completion === undefined && prompt !== undefined)
      completion = total - prompt;
  }

  if (
    prompt === undefined &&
    completion === undefined &&
    promptCached === undefined
  )
    return undefined;

  return { prompt: prompt ?? 0, completion: completion ?? 0, promptCached };
}

export function extractExtra(attrs: Record<string, unknown>): unknown {
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("gen_ai.request."))
      extra[k.slice("gen_ai.request.".length)] = v;
    if (k === "model_request_parameters") extra[k] = v;
    if (k === "tool_arguments") extra[k] = v; // bring tool args into extra
  }
  return Object.keys(extra).length ? extra : undefined;
}

export function extractMetadata(attrs: Record<string, unknown>): unknown {
  const meta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (!k.startsWith("gen_ai.")) meta[k] = v;
  }
  return Object.keys(meta).length ? meta : undefined;
}

function selectName(
  type: Event["type"],
  attrs: Record<string, unknown>,
  spanName: string,
): string {
  if (type === "tool") {
    return (
      (attrs["gen_ai.tool.name"] as string | undefined) ||
      (attrs["tool_name"] as string | undefined) ||
      spanName
    );
  }
  if (type === "agent") {
    return (
      (attrs["agent_name"] as string | undefined) ||
      (attrs["gen_ai.agent.name"] as string | undefined) ||
      spanName
    );
  }
  // llm or chain
  return (
    (attrs["gen_ai.request.model"] as string | undefined) ||
    (attrs["gen_ai.response.model"] as string | undefined) ||
    (attrs["model_name"] as string | undefined) ||
    spanName
  );
}

/*********************************
 * Message helpers               *
 *********************************/

interface Msg {
  role: string;
  content: string;
}

type MsgExtraction = { input?: Msg[]; output?: Msg };

// (previous functions unchanged)...

function parseIndexedMessages(
  attrs: Record<string, unknown>,
  prefix: string,
): Msg[] {
  const map: Record<string, Partial<Msg>> = {};
  const re = new RegExp(`^${prefix}\\.(\\d+)\\.(role|content)$`);
  for (const [k, v] of Object.entries(attrs)) {
    const m = re.exec(k);
    if (!m) continue;
    const idx = m[1];
    const field = m[2] as "role" | "content";
    if (!map[idx]) map[idx] = {};
    map[idx][field] = v as string;
  }
  return Object.keys(map)
    .sort((a, b) => Number(a) - Number(b))
    .flatMap((idx) => {
      const msg = map[idx];
      return msg.role && msg.content
        ? [{ role: msg.role, content: msg.content }]
        : [];
    });
}

// messagesFromEventsArray, messagesFromEvents, parseJsonEventAttributes remain unchanged...

function messagesFromEventsArray(list: unknown[]): MsgExtraction {
  const input: Msg[] = [];
  let output: Msg | undefined;

  for (const item of list) {
    if (typeof item !== "object" || !item) continue;
    const ev = item as Record<string, any>;
    const name = ev["event.name"] as string | undefined;
    if (!name) continue;

    switch (name) {
      case "gen_ai.system.message":
      case "gen_ai.user.message":
      case "gen_ai.tool.message": {
        const role = (ev.role as string | undefined) ?? name.split(".")[0];
        const content = ev.content;
        if (content)
          input.push({
            role,
            content:
              typeof content === "string" ? content : JSON.stringify(content),
          });
        break;
      }
      case "gen_ai.assistant.message": {
        const content = ev.content;
        if (content && !output)
          output = {
            role: "assistant",
            content:
              typeof content === "string" ? content : JSON.stringify(content),
          };
        break;
      }
      case "gen_ai.choice": {
        const msg = ev.message as Record<string, any> | undefined;
        if (!msg) break;
        const content = msg.content;
        const role = (msg.role as string | undefined) ?? "assistant";
        if (content && !output) output = { role, content };
        break;
      }
    }
  }

  return { input: input.length ? input : undefined, output };
}

function messagesFromEvents(events: SpanEvent[]): MsgExtraction {
  const input: Msg[] = [];
  let output: Msg | undefined;
  for (const ev of events) {
    const evAttrs = attrsToObj(ev.attributes);
    const content = evAttrs["content"] as string | undefined;
    if (!content) continue;

    const name = ev.name;
    if (
      name === "gen_ai.system.message" ||
      name === "gen_ai.user.message" ||
      name === "gen_ai.tool.message"
    ) {
      const role =
        (evAttrs["role"] as string | undefined) ?? name.split(".")[0];
      input.push({ role, content });
      continue;
    }
    if (
      (name === "gen_ai.assistant.message" || name === "gen_ai.choice") &&
      !output
    ) {
      output = { role: "assistant", content };
    }
  }
  return { input: input.length ? input : undefined, output };
}

function parseJsonEventAttributes(
  attrs: Record<string, unknown>,
): MsgExtraction | null {
  for (const key of ["events", "all_messages_events", "messages_events"]) {
    const raw = attrs[key];
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
      try {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return messagesFromEventsArray(list);
      } catch {
        /* swallow */
      }
    }
  }
  return null;
}

export function pullMessages(
  span: Span,
  attrs: Record<string, unknown>,
): MsgExtraction {
  if (Object.keys(attrs).some((k) => k.startsWith("gen_ai.prompt."))) {
    const input = parseIndexedMessages(attrs, "gen_ai.prompt");
    const outputMsgs = parseIndexedMessages(attrs, "gen_ai.completion");
    return { input: input.length ? input : undefined, output: outputMsgs[0] };
  }
  const jsonExtract = parseJsonEventAttributes(attrs);
  if (jsonExtract) return jsonExtract;
  return messagesFromEvents(span.events);
}

/*********************************
 * Span → two Lunary events      *
 *********************************/

export function spanToLunary(
  span: Span,
  resourceAttrs: Record<string, unknown>,
): Event[] {
  const spanAttrs = attrsToObj(span.attributes);
  const allAttrs = { ...resourceAttrs, ...spanAttrs };

  const type = detectType(allAttrs);
  const name = selectName(type, allAttrs, span.name);

  // ----------- messages / arguments → input / output -------------
  const { input: msgInput, output } = pullMessages(span, allAttrs);
  let input = msgInput;

  if (!input && type === "tool") {
    const raw = allAttrs["tool_arguments"];
    if (raw !== undefined) {
      const content = typeof raw === "string" ? raw : JSON.stringify(raw);
      input = [{ role: "tool", content }];
    }
  }

  if (!input && type === "chain") {
    const raw = allAttrs["tools"];
    if (raw !== undefined) {
      const content = Array.isArray(raw)
        ? JSON.stringify(raw)
        : typeof raw === "string"
          ? raw
          : JSON.stringify(raw);
      input = [{ role: "system", content }];
    }
  }

  const runId = bytesToHex(span.spanId);
  const parentRunId = bytesToHex(span.parentSpanId);

  const startEvt: Event = {
    type,
    event: "start",
    runId,
    parentRunId,
    timestamp: nsToIso(span.startTimeUnixNano),
    input,
    name,
    extra: extractExtra(allAttrs),
    metadata: extractMetadata(allAttrs),
  };

  const endEvt: Event = {
    type,
    event: buildError(span.status) ? "error" : "end",
    runId,
    parentRunId,
    timestamp: nsToIso(span.endTimeUnixNano),
    output,
    name,
    tokensUsage: tokensUsage(allAttrs),
    extra: extractExtra(allAttrs),
    metadata: extractMetadata(allAttrs),
    error: buildError(span.status),
  };

  return [startEvt, endEvt];
}
