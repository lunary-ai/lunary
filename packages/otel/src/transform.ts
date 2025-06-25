/*
 * OpenTelemetry Gen-AI → Lunary transformer
 * ------------------------------------------------
 * Pure functions that take decoded OTLP protobuf objects (spans, logs, metrics)
 * and return Lunary-shaped Event objects (packages/backend/src/utils/ingest.ts).
 */

import {
  Span,
  KeyValue,
  AnyValue,
} from "./gen/opentelemetry/proto/trace/v1/trace.ts";
import {
  LogRecord,
} from "./gen/opentelemetry/proto/logs/v1/logs.ts";

// We don’t want a runtime dependency on the backend package inside the OTEL
// bridge, so we redefine the minimal pieces we need (shape of Event +
// ensureIsUUID helper).  Keep in sync with packages/backend/src/utils/ingest.ts.

export interface LunaryEvent {
  type: string;
  event: string;
  timestamp: string;
  runId: string;
  parentRunId?: string;
  level?: string;
  input?: unknown;
  output?: unknown;
  message?: unknown;
  name?: string;
  params?: Record<string, unknown>;
  tokensUsage?: { prompt: number | null; completion: number | null; promptCached?: number };
  error?: { message?: string; stack?: string; code?: string | number };
  metadata?: Record<string, unknown>;
  tags?: string[];
  [key: string]: unknown;
}

function ensureIsUUIDSync(id: string): string {
  // naive check – if already uuid-like keep as is else hash.
  if (/^[0-9a-fA-F-]{36}$/.test(id)) return id;
  // fallback generate random uuid (determinism not required here)
  return crypto.randomUUID();
}

/* -------------------------------------------------------------------------- */
/*                               Utils helpers                                */
/* -------------------------------------------------------------------------- */

function nsToIso(nano: bigint | number | string): string {
  const ns = typeof nano === "bigint" ? Number(nano) : Number(nano);
  const ms = Math.floor(ns / 1_000_000);
  return new Date(ms).toISOString();
}

function kvToRecord(attrs: KeyValue[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const kv of attrs) {
    const key = kv.key;
    const value = anyValueToJs(kv.value);
    out[key] = value;
  }
  return out;
}

export function anyValueToJs(v?: AnyValue): unknown {
  if (!v) return undefined;
  if (v.stringValue !== undefined && v.stringValue !== null) return v.stringValue;
  if (v.boolValue !== undefined && v.boolValue !== null) return v.boolValue;
  if (v.intValue !== undefined && v.intValue !== null) return Number(v.intValue);
  if (v.doubleValue !== undefined && v.doubleValue !== null) return v.doubleValue;
  if (v.arrayValue) return v.arrayValue.values.map(anyValueToJs);
  if (v.kvlistValue) {
    const obj: Record<string, unknown> = {};
    for (const kv of v.kvlistValue.values) obj[kv.key] = anyValueToJs(kv.value);
    return obj;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/*                        Attribute-specific helpers                           */
/* -------------------------------------------------------------------------- */

const OP_NAME_TO_TYPE: Record<string, string> = {
  chat: "llm",
  "text_completion": "llm",
  "generate_content": "llm",
  embeddings: "embed",
  "execute_tool": "tool",
  "create_agent": "agent",
  "invoke_agent": "agent",
};

// Track spans that need content from events
const spanContentMap = new Map<string, { input?: unknown; output?: unknown; messages?: any[] }>();

// Regex helpers for prefix extraction
const REQUEST_PREFIX = "gen_ai.request.";
const RESPONSE_PREFIX = "gen_ai.response.";
const USAGE_PREFIX = "gen_ai.usage.";

function mapAttributes(attrs: Record<string, unknown>, e: LunaryEvent) {
  // Map request params
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith(REQUEST_PREFIX)) {
      const sub = k.substring(REQUEST_PREFIX.length);
      if (!e.params) e.params = {};
      
      // Special handling for certain attributes
      if (sub === "model") {
        e.name = String(v).replace("models/", ""); // Also set name field
        e.params.model = String(v);
      } else if (sub === "stop_sequences") {
        e.params.stop = v; // Map to 'stop' for compatibility
      } else if (sub === "encoding_formats") {
        e.params.encodingFormats = v;
      } else {
        // camelCase keys for params
        e.params[toCamel(sub)] = v as any;
      }
      continue;
    }
    if (k.startsWith(RESPONSE_PREFIX)) {
      const sub = k.substring(RESPONSE_PREFIX.length);
      if (!e.metadata) e.metadata = {};
      
      // Special handling for response attributes
      if (sub === "model") {
        e.metadata.modelResponse = v;
        if (!e.name) e.name = String(v).replace("models/", "");
      } else if (sub === "finish_reasons") {
        e.metadata.finishReasons = v;
      } else if (sub === "id") {
        e.metadata.responseId = v;
      } else {
        e.metadata[sub] = v;
      }
      continue;
    }
    if (k.startsWith(USAGE_PREFIX)) {
      const sub = k.substring(USAGE_PREFIX.length);
      if (!e.tokensUsage) e.tokensUsage = { prompt: null, completion: null };
      if (sub === "input_tokens") e.tokensUsage.prompt = Number(v);
      else if (sub === "output_tokens") e.tokensUsage.completion = Number(v);
      else if (sub === "prompt_tokens_cached") e.tokensUsage.promptCached = Number(v);
      else e.metadata = { ...(e.metadata || {}), [sub]: v };
      continue;
    }

    switch (k) {
      case "lunary.project_key":
        e.metadata = { ...(e.metadata || {}), project_key: v };
        break;
      case "gen_ai.system":
        e.metadata = { ...(e.metadata || {}), system: v };
        break;
      case "gen_ai.operation.name":
        // handled elsewhere
        break;
      case "gen_ai.conversation.id":
        e.metadata = { ...(e.metadata || {}), conversationId: v };
        break;
      case "gen_ai.tool.call.id":
        e.metadata = { ...(e.metadata || {}), toolCallId: v };
        break;
      case "gen_ai.tool.name":
        e.metadata = { ...(e.metadata || {}), toolName: v };
        break;
      case "gen_ai.tool.description":
        e.metadata = { ...(e.metadata || {}), toolDescription: v };
        break;
      case "gen_ai.tool.type":
        e.metadata = { ...(e.metadata || {}), toolType: v };
        break;
      case "error.type":
        e.error = { ...(e.error || {}), code: v as any };
        e.level = "error";
        break;
      case "error.message":
        e.error = { ...(e.error || {}), message: String(v) };
        e.level = "error";
        break;
      case "error.stack":
        e.error = { ...(e.error || {}), stack: String(v) };
        break;
      default:
        // Preserve unknown attr under metadata
        e.metadata = { ...(e.metadata || {}), [k]: v };
    }
  }
}

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/* -------------------------------------------------------------------------- */
/*                       Public mapping functions                              */
/* -------------------------------------------------------------------------- */

export function spanToEvents(
  span: Span,
  resourceAttrs: Record<string, unknown>,
): LunaryEvent[] {
  const attrs = kvToRecord(span.attributes ?? []);
  // Merge resource attrs (but span attrs override resource)
  for (const [k, v] of Object.entries(resourceAttrs)) {
    if (!(k in attrs)) attrs[k] = v;
  }

  const spanIdHex = span.spanId ? Buffer.from(span.spanId).toString("hex") : crypto.randomUUID();
  const runId = ensureIsUUIDSync(spanIdHex);
  const parentIdHex = span.parentSpanId ? Buffer.from(span.parentSpanId).toString("hex") : undefined;
  const parentRunId = parentIdHex ? ensureIsUUIDSync(parentIdHex) : undefined;

  const opName = (attrs["gen_ai.operation.name"] as string | undefined) || "chat";
  const type = OP_NAME_TO_TYPE[opName] || "llm";

  const events: LunaryEvent[] = [];
  
  // Process span events to extract content
  const messages: any[] = [];
  let hasPromptEvent = false;
  let hasCompletionEvent = false;
  
  if (span.events) {
    for (const event of span.events) {
      const eventAttrs = kvToRecord(event.attributes ?? []);
      
      // Handle GenAI content events
      if (event.name === "gen_ai.content.prompt") {
        hasPromptEvent = true;
        const content = eventAttrs["gen_ai.prompt"];
        if (content) {
          messages.push({ role: "user", content: String(content) });
        }
      } else if (event.name === "gen_ai.content.completion") {
        hasCompletionEvent = true;
        const content = eventAttrs["gen_ai.completion"];
        if (content) {
          messages.push({ role: "assistant", content: String(content) });
        }
      } else if (event.name?.startsWith("gen_ai.") && event.name.endsWith(".message")) {
        // Handle message events like gen_ai.system.message, gen_ai.user.message, etc.
        const role = event.name.split(".")[1]; // Extract role from event name
        const content = eventAttrs["gen_ai.message.content"];
        if (content) {
          messages.push({ role, content: tryJsonParse(content) || content });
        }
      }
    }
  }
  
  // Store content for this span if we need to wait for log events
  if (messages.length > 0 || span.events?.length) {
    spanContentMap.set(spanIdHex, { messages });
  }

  // Create start event if this is a span with duration
  if (span.startTimeUnixNano && span.endTimeUnixNano) {
    const startEvent: LunaryEvent = {
      type,
      event: "start",
      runId: runId!,
      parentRunId: parentRunId as any,
      timestamp: nsToIso(span.startTimeUnixNano),
    } as any;
    
    mapAttributes(attrs, startEvent);
    
    // Add input from messages if available
    const userMessages = messages.filter(m => m.role === "user" || m.role === "system");
    if (userMessages.length > 0) {
      startEvent.input = userMessages.length === 1 && typeof userMessages[0].content === "string" 
        ? userMessages[0].content 
        : userMessages;
    }
    
    events.push(startEvent);
    
    // Create end event
    const endEvent: LunaryEvent = {
      type,
      event: "end",
      runId: runId!,
      parentRunId: parentRunId as any,
      timestamp: nsToIso(span.endTimeUnixNano),
    } as any;
    
    mapAttributes(attrs, endEvent);
    
    // Add output from messages if available
    const assistantMessages = messages.filter(m => m.role === "assistant" || m.role === "tool");
    if (assistantMessages.length > 0) {
      endEvent.output = assistantMessages.length === 1 && typeof assistantMessages[0].content === "string"
        ? assistantMessages[0].content
        : assistantMessages;
    }
    
    // Add duration
    const durNs = BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano);
    const ms = Number(durNs) / 1_000_000;
    endEvent.metadata = { ...(endEvent.metadata || {}), duration_ms: ms };
    
    // Status mapping
    if (span.status && span.status.code && span.status.code !== 0) {
      endEvent.level = "error";
      endEvent.error = {
        ...(endEvent.error || {}),
        code: span.status.code,
        message: span.status.message || endEvent.error?.message,
      };
    }
    
    events.push(endEvent);
  } else {
    // Single event for spans without clear start/end
    const e: LunaryEvent = {
      type,
      event: "complete",
      runId: runId!,
      parentRunId: parentRunId as any,
      timestamp: nsToIso(span.startTimeUnixNano || 0),
    } as any;

    mapAttributes(attrs, e);
    
    // Add any messages as input/output
    if (messages.length > 0) {
      const userMessages = messages.filter(m => m.role === "user" || m.role === "system");
      const assistantMessages = messages.filter(m => m.role === "assistant" || m.role === "tool");
      
      if (userMessages.length > 0) {
        e.input = userMessages.length === 1 && typeof userMessages[0].content === "string"
          ? userMessages[0].content
          : userMessages;
      }
      
      if (assistantMessages.length > 0) {
        e.output = assistantMessages.length === 1 && typeof assistantMessages[0].content === "string"
          ? assistantMessages[0].content
          : assistantMessages;
      }
    }

    // Status mapping
    if (span.status && span.status.code && span.status.code !== 0) {
      e.level = "error";
      e.error = {
        ...(e.error || {}),
        code: span.status.code,
        message: span.status.message || e.error?.message,
      };
    }

    events.push(e);
  }

  return events;
}

export function logToEvents(
  log: LogRecord,
  resourceAttrs: Record<string, unknown>,
): LunaryEvent[] {
  const attrs = kvToRecord(log.attributes ?? []);
  // Merge resource attrs
  for (const [k, v] of Object.entries(resourceAttrs)) {
    if (!(k in attrs)) attrs[k] = v;
  }
  
  if (!log.timeUnixNano) return [];

  const timestamp = nsToIso(log.timeUnixNano);
  const name = log.name || "";

  // We only map GenAI related logs (events) for now
  if (!name.startsWith("gen_ai.")) return [];

  const events: LunaryEvent[] = [];
  const body = log.body?.stringValue;
  
  // Extract span context if available
  const spanId = log.spanId ? Buffer.from(log.spanId).toString("hex") : undefined;
  const traceId = log.traceId ? Buffer.from(log.traceId).toString("hex") : undefined;
  
  switch (name) {
    case "gen_ai.tool.message": {
      const content = body ? tryJsonParse(body) : undefined;
      const toolCallId = attrs["gen_ai.tool.call.id"] as string;
      const toolName = attrs["gen_ai.tool.name"] as string;
      
      const e: LunaryEvent = {
        type: "tool",
        event: "complete",
        runId: ensureIsUUIDSync(toolCallId || spanId || crypto.randomUUID()),
        timestamp,
        name: toolName,
        output: content,
      } as any;
      
      if (spanId) {
        e.parentRunId = ensureIsUUIDSync(spanId);
      }
      
      mapAttributes(attrs, e);
      events.push(e);
      break;
    }
    case "gen_ai.choice": {
      // Handle streaming choice events
      const choiceIndex = attrs["gen_ai.choice.index"] as number;
      const finishReason = attrs["gen_ai.choice.finish_reason"] as string;
      const content = body ? tryJsonParse(body) : undefined;
      
      const e: LunaryEvent = {
        type: "llm",
        event: finishReason ? "end" : "stream",
        runId: ensureIsUUIDSync(spanId || crypto.randomUUID()),
        timestamp,
        output: content,
      } as any;
      
      if (finishReason) {
        e.metadata = { ...(e.metadata || {}), finishReasons: [finishReason] };
      }
      
      mapAttributes(attrs, e);
      events.push(e);
      break;
    }
    case "gen_ai.system.message":
    case "gen_ai.user.message":
    case "gen_ai.assistant.message": {
      // Extract role from event name
      const role = name.split(".")[1];
      const content = body ? tryJsonParse(body) : body;
      
      // If we have a span context, update the span's content map
      if (spanId) {
        const existing = spanContentMap.get(spanId) || { messages: [] };
        existing.messages = existing.messages || [];
        existing.messages.push({ role, content });
        
        // Categorize by role for input/output
        if (role === "user" || role === "system") {
          existing.input = existing.messages.filter(m => m.role === "user" || m.role === "system");
        } else if (role === "assistant") {
          existing.output = existing.messages.filter(m => m.role === "assistant");
        }
        
        spanContentMap.set(spanId, existing);
      }
      
      // Also create a message event
      const e: LunaryEvent = {
        type: "message",
        event: role,
        runId: ensureIsUUIDSync(spanId || crypto.randomUUID()),
        timestamp,
        message: content,
      } as any;
      
      mapAttributes(attrs, e);
      events.push(e);
      break;
    }
    default: {
      // Other gen_ai events
      const e: LunaryEvent = {
        type: "log",
        event: name.split(".").pop() || "log",
        runId: ensureIsUUIDSync(spanId || crypto.randomUUID()),
        timestamp,
        message: body,
      } as any;
      mapAttributes(attrs, e);
      events.push(e);
    }
  }

  return events;
}

function tryJsonParse(str?: string) {
  if (!str) return undefined;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

// Export helper to retrieve and clear span content after processing
export function getSpanContent(spanId: string): { input?: unknown; output?: unknown; messages?: any[] } | undefined {
  const content = spanContentMap.get(spanId);
  if (content) {
    spanContentMap.delete(spanId);
  }
  return content;
}
