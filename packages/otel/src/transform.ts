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
import { LogRecord } from "./gen/opentelemetry/proto/logs/v1/logs.ts";

import type { Event } from "../../backend/src/utils/ingest.ts";

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

// OpenTelemetry GenAI semantic convention attributes
// Based on: https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/
type GenAIAttributes = {
  // Agent attributes
  "gen_ai.agent.description"?: string;
  "gen_ai.agent.id"?: string;
  "gen_ai.agent.name"?: string;

  // Conversation attributes
  "gen_ai.conversation.id"?: string;

  // Operation attributes
  "gen_ai.operation.name"?: string;

  // System attributes
  "gen_ai.system"?: string;

  // Request attributes
  "gen_ai.request.choice.count"?: number;
  "gen_ai.request.encoding_formats"?: string[];
  "gen_ai.request.frequency_penalty"?: number;
  "gen_ai.request.max_tokens"?: number;
  "gen_ai.request.model"?: string;
  "gen_ai.request.presence_penalty"?: number;
  "gen_ai.request.seed"?: number;
  "gen_ai.request.stop_sequences"?: string[];
  "gen_ai.request.temperature"?: number;
  "gen_ai.request.top_k"?: number;
  "gen_ai.request.top_p"?: number;

  // Response attributes
  "gen_ai.response.finish_reasons"?: string[];
  "gen_ai.response.id"?: string;
  "gen_ai.response.model"?: string;

  // Tool attributes
  "gen_ai.tool.call.id"?: string;
  "gen_ai.tool.description"?: string;
  "gen_ai.tool.name"?: string;
  "gen_ai.tool.type"?: "function" | "extension" | "datastore";

  // Usage attributes
  "gen_ai.usage.input_tokens"?: number;
  "gen_ai.usage.output_tokens"?: number;
  "gen_ai.usage.prompt_tokens_cached"?: number;
  "gen_ai.token.type"?: "input" | "output";

  // Error attributes (common OpenTelemetry)
  "error.type"?: string;
  "error.message"?: string;
  "error.stack"?: string;

  // Additional Pydantic AI attributes
  "pydantic_ai.agent_name"?: string;
  "pydantic_ai.model_name"?: string;
  "pydantic_ai.run_name"?: string;
  all_messages_events?: unknown;
  events?: unknown;
  final_result?: unknown;
  tool_arguments?: unknown;
  agent_name?: string;

  // Logfire attributes
  "logfire.msg"?: string;
  "logfire.span_type"?: string;
  "logfire.log_type"?: string;

  // Lunary specific
  "lunary.project_key"?: string;

  // Allow additional attributes for flexibility
  [key: string]: unknown;
};

function kvToRecord(attrs: KeyValue[]): GenAIAttributes {
  const out: GenAIAttributes = {};
  for (const kv of attrs) {
    const key = kv.key;
    const value = anyValueToJs(kv.value);
    out[key as keyof GenAIAttributes] = value;
  }
  return out;
}

export function anyValueToJs(v?: AnyValue): unknown {
  if (!v) return undefined;
  if (v.stringValue !== undefined && v.stringValue !== null)
    return v.stringValue;
  if (v.boolValue !== undefined && v.boolValue !== null) return v.boolValue;
  if (v.intValue !== undefined && v.intValue !== null)
    return Number(v.intValue);
  if (v.doubleValue !== undefined && v.doubleValue !== null)
    return v.doubleValue;
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

type OperationName =
  | "chat"
  | "text_completion"
  | "generate_content"
  | "embeddings"
  | "execute_tool"
  | "create_agent"
  | "invoke_agent"
  | "agent_run"
  | "agent";

const OP_NAME_TO_TYPE: Record<OperationName, string> = {
  chat: "llm",
  text_completion: "llm",
  generate_content: "llm",
  embeddings: "embed",
  execute_tool: "tool",
  create_agent: "agent",
  invoke_agent: "agent",
  agent_run: "agent",
  agent: "agent",
};

// Track spans that need content from events
const spanContentMap = new Map<
  string,
  { input?: unknown; output?: unknown; messages?: any[] }
>();

// Regex helpers for prefix extraction
const REQUEST_PREFIX = "gen_ai.request.";
const RESPONSE_PREFIX = "gen_ai.response.";
const USAGE_PREFIX = "gen_ai.usage.";
const PYDANTIC_AI_PREFIX = "pydantic_ai.";
const LOGFIRE_PREFIX = "logfire.";

// Maximum size for event payloads (1MB)
const MAX_EVENT_SIZE = 1_000_000;
const MAX_CONTENT_SIZE = 100_000; // 100KB for individual content fields

function isBinaryContent(value: unknown): boolean {
  if (value instanceof Uint8Array) return true;
  if (typeof value === "string") {
    // Check for base64 data URLs or very long strings that might be binary
    return value.startsWith("data:") || value.length > MAX_CONTENT_SIZE;
  }
  return false;
}

function truncateIfNeeded(
  value: unknown,
  maxSize: number = MAX_CONTENT_SIZE,
): unknown {
  if (typeof value === "string" && value.length > maxSize) {
    return (
      value.substring(0, maxSize) +
      `... [truncated ${value.length - maxSize} chars]`
    );
  }
  if (typeof value === "object" && value !== null) {
    const jsonStr = JSON.stringify(value);
    if (jsonStr.length > maxSize) {
      return { truncated: true, original_size: jsonStr.length };
    }
  }
  return value;
}

function mapAttributes(attrs: GenAIAttributes, e: Event) {
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
      else if (sub === "prompt_tokens_cached")
        e.tokensUsage.promptCached = Number(v);
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
        // Handle Pydantic AI specific attributes
        if (k.startsWith(PYDANTIC_AI_PREFIX)) {
          const sub = k.substring(PYDANTIC_AI_PREFIX.length);
          e.metadata = {
            ...(e.metadata || {}),
            [`pydantic_${sub.replace(/\./g, "_")}`]: v,
          };
        }
        // Handle Logfire specific attributes
        else if (k.startsWith(LOGFIRE_PREFIX)) {
          const sub = k.substring(LOGFIRE_PREFIX.length);
          // Skip binary content from logfire
          if (!isBinaryContent(v)) {
            e.metadata = {
              ...(e.metadata || {}),
              [`logfire_${sub.replace(/\./g, "_")}`]: truncateIfNeeded(v),
            };
          }
        }
        // Preserve other unknown attrs under metadata
        else {
          // Check for binary content and truncate if needed
          if (!isBinaryContent(v)) {
            e.metadata = { ...(e.metadata || {}), [k]: truncateIfNeeded(v) };
          }
        }
    }
  }
}

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Ensure event doesn't exceed size limits
function protectEventSize(event: Event): Event {
  const eventStr = JSON.stringify(event);
  if (eventStr.length <= MAX_EVENT_SIZE) {
    return event;
  }

  // Event is too large, start truncating
  const protectedEvent = { ...event };

  // First try truncating large content fields
  if (
    protectedEvent.input &&
    JSON.stringify(protectedEvent.input).length > MAX_CONTENT_SIZE
  ) {
    protectedEvent.input = truncateIfNeeded(protectedEvent.input);
  }
  if (
    protectedEvent.output &&
    JSON.stringify(protectedEvent.output).length > MAX_CONTENT_SIZE
  ) {
    protectedEvent.output = truncateIfNeeded(protectedEvent.output);
  }
  if (protectedEvent.metadata) {
    // Truncate large metadata fields
    for (const [key, value] of Object.entries(protectedEvent.metadata)) {
      if (JSON.stringify(value).length > MAX_CONTENT_SIZE) {
        protectedEvent.metadata[key] = truncateIfNeeded(value);
      }
    }
  }

  // If still too large, add truncation notice
  const finalStr = JSON.stringify(protectedEvent);
  if (finalStr.length > MAX_EVENT_SIZE) {
    protectedEvent.metadata = {
      ...protectedEvent.metadata,
      truncated: true,
      original_size: eventStr.length,
    };
  }

  return protectedEvent;
}

// Aggregate tool calls from events for better structure
function aggregateToolCalls(events: Event[]): void {
  // Group events by parent run ID
  const eventsByParent = new Map<string, Event[]>();

  for (const event of events) {
    if (event.parentRunId) {
      const key = event.parentRunId;
      if (!eventsByParent.has(key)) {
        eventsByParent.set(key, []);
      }
      eventsByParent.get(key)!.push(event);
    }
  }

  // For each parent, check if it has tool call children
  for (const [parentId, childEvents] of eventsByParent.entries()) {
    const toolCalls = childEvents.filter(
      (e) =>
        e.type === "tool" && e.metadata?.toolCallId && e.metadata?.toolName,
    );

    if (toolCalls.length > 0) {
      // Find the parent event
      const parentEvent = events.find(
        (e) => e.runId === parentId && e.event === "end",
      );
      if (parentEvent) {
        // Aggregate tool calls into array format
        const toolCallArray = toolCalls.map((tc) => ({
          id: tc.metadata?.toolCallId,
          name: tc.metadata?.toolName,
          arguments: tc.metadata?.tool_arguments || tc.input,
          result: tc.output,
        }));

        // Add to parent's output
        if (!parentEvent.output) {
          parentEvent.output = {};
        }
        if (
          typeof parentEvent.output === "object" &&
          !Array.isArray(parentEvent.output)
        ) {
          parentEvent.output = {
            ...parentEvent.output,
            tool_calls: toolCallArray,
          };
        }
      }
    }
  }
}

// export function spanToEvents(span: Span): Event[] {
//   const attrs = kvToRecord(span.attributes ?? []);

//   const runId = Buffer.from(span.spanId).toString("hex");
//   const parentRunId = span.parentSpanId.length
//     ? Buffer.from(span.parentSpanId).toString("hex")
//     : null;

//   const opName = attrs["gen_ai.operation.name"];
//   let type =
//     opName && opName in OP_NAME_TO_TYPE
//       ? OP_NAME_TO_TYPE[opName as OperationName]
//       : null;

//   // for Pydantic AI
//   if (attrs["agent_name"]) {
//     type = "agent";
//   }

//   // Check if this is a tool span
//   // if (
//   //   attrs["gen_ai.tool.name"] ||
//   //   attrs["logfire_msg"]?.toString().includes("running tool:")
//   // ) {
//   //   type = "tool";
//   // }

//   // IMPORTANT: Also check if this is an orchestration span BEFORE setting type
//   // const logfireMsgCheck = attrs["logfire_msg"]?.toString() || "";
//   // if (
//   //   logfireMsgCheck === "running 1 tool" ||
//   //   logfireMsgCheck === "running 1 tools" ||
//   //   logfireMsgCheck.match(/^running \d+ tools?$/)
//   // ) {
//   //   // This is an orchestration span, skip it
//   //   return [];
//   // }

//   // Skip orchestration spans that just say "running X tools" or "running X tool"
//   // const logfireMsg = attrs["logfire_msg"]?.toString() || "";
//   // if (logfireMsg.match(/^running \d+ tools?$/i)) {
//   //   console.log(`Skipping orchestration span: ${logfireMsg}`);
//   //   return [];
//   // }

//   const messages: any[] = [];
//   let hasPromptEvent = false;
//   let hasCompletionEvent = false;

//   // why isn't span.events used by pydantic? Is it used by other SDK?
//   if (typeof attrs.events === "string") {
//     const events = JSON.parse(attrs.events);
//     for (const event of events) {
//       console.log(event);
//     }
//   }

//   const startEvent: Event = {
//     event: "start"
//     type,

//   }
//   return;

//   if (span.events) {
//     for (const event of span.events) {
//       const eventAttrs = kvToRecord(event.attributes ?? []);

//       // Handle GenAI content events
//       if (event.name === "gen_ai.content.prompt") {
//         hasPromptEvent = true;
//         const content = eventAttrs["gen_ai.prompt"];
//         if (content) {
//           messages.push({ role: "user", content: String(content) });
//         }
//       } else if (event.name === "gen_ai.content.completion") {
//         hasCompletionEvent = true;
//         const content = eventAttrs["gen_ai.completion"];
//         if (content) {
//           messages.push({ role: "assistant", content: String(content) });
//         }
//       } else if (
//         event.name?.startsWith("gen_ai.") &&
//         event.name.endsWith(".message")
//       ) {
//         // Handle message events like gen_ai.system.message, gen_ai.user.message, etc.
//         const role = event.name.split(".")[1]; // Extract role from event name
//         const content = eventAttrs["gen_ai.message.content"];
//         if (content) {
//           messages.push({ role, content: tryJsonParse(content) || content });
//         }
//       }
//     }
//   }

//   // Store content for this span if we need to wait for log events
//   if (messages.length > 0 || span.events?.length) {
//     spanContentMap.set(spanIdHex, { messages });
//   }

//   // Create start event if this is a span with duration
//   if (span.startTimeUnixNano && span.endTimeUnixNano) {
//     const startEvent: Event = {
//       type,
//       event: "start",
//       runId: runId!,
//       parentRunId: parentRunId as any,
//       timestamp: nsToIso(span.startTimeUnixNano),
//     } as any;

//     mapAttributes(attrs, startEvent);

//     // Extract input from Pydantic AI format
//     if (attrs["all_messages_events"]) {
//       // Parse all_messages_events which contains the full conversation
//       const allMessages = tryJsonParse(attrs["all_messages_events"]);
//       if (Array.isArray(allMessages)) {
//         const inputMessages = allMessages.filter(
//           (m: any) => m.role === "user" || m.role === "system",
//         );
//         if (inputMessages.length > 0) {
//           startEvent.input = inputMessages.map((m: any) => ({
//             role: m.role,
//             content: m.content,
//           }));
//         }
//       }
//     } else if (attrs["events"]) {
//       // Pydantic AI also uses 'events' field for messages
//       const eventMessages = tryJsonParse(attrs["events"]);
//       if (Array.isArray(eventMessages)) {
//         const inputMessages = eventMessages.filter(
//           (m: any) =>
//             m.role === "user" ||
//             m.role === "system" ||
//             (m["event.name"] &&
//               (m["event.name"].includes("user.message") ||
//                 m["event.name"].includes("system.message"))),
//         );
//         if (inputMessages.length > 0) {
//           startEvent.input = inputMessages.map((m: any) => ({
//             role:
//               m.role ||
//               (m["event.name"]?.includes("system") ? "system" : "user"),
//             content: m.content,
//           }));
//         }
//       }
//     } else if (messages.length > 0) {
//       // Fallback to standard message extraction
//       const userMessages = messages.filter(
//         (m) => m.role === "user" || m.role === "system",
//       );
//       if (userMessages.length > 0) {
//         startEvent.input =
//           userMessages.length === 1 &&
//           typeof userMessages[0].content === "string"
//             ? userMessages[0].content
//             : userMessages;
//       }
//     }

//     // For tool calls, extract input from tool_arguments
//     if (type === "tool" && attrs["tool_arguments"]) {
//       startEvent.input =
//         tryJsonParse(attrs["tool_arguments"]) || attrs["tool_arguments"];
//     }

//     // Ensure input is never null for mandatory field
//     if (!startEvent.input) {
//       // Default to empty object for tools, empty array for LLM
//       startEvent.input = type === "tool" ? {} : [];
//     }

//     events.push(startEvent);

//     // Create end event
//     const endEvent: Event = {
//       type,
//       event: "end",
//       runId: runId!,
//       parentRunId: parentRunId as any,
//       timestamp: nsToIso(span.endTimeUnixNano),
//     } as any;

//     mapAttributes(attrs, endEvent);

//     // Extract output from Pydantic AI format
//     if (attrs["final_result"]) {
//       // Pydantic AI stores the final result here
//       endEvent.output = attrs["final_result"];
//     } else if (attrs["all_messages_events"]) {
//       // Parse all_messages_events which contains the full conversation
//       const allMessages = tryJsonParse(attrs["all_messages_events"]);
//       if (Array.isArray(allMessages)) {
//         const outputMessages = allMessages.filter(
//           (m: any) => m.role === "assistant" || m.role === "tool",
//         );
//         if (outputMessages.length > 0) {
//           endEvent.output = outputMessages.map((m: any) => ({
//             role: m.role,
//             content: m.content,
//             tool_calls: m.tool_calls,
//           }));
//         }
//       }
//     } else if (attrs["events"]) {
//       // Pydantic AI also uses 'events' field for messages
//       const eventMessages = tryJsonParse(attrs["events"]);
//       if (Array.isArray(eventMessages)) {
//         const outputMessages = eventMessages.filter(
//           (m: any) =>
//             m.role === "assistant" ||
//             (m["event.name"] &&
//               m["event.name"].includes("assistant.message")) ||
//             (m["event.name"] === "gen_ai.choice" && m.message),
//         );
//         if (outputMessages.length > 0) {
//           endEvent.output = outputMessages.map(
//             (m: any) =>
//               m.message || {
//                 role: m.role || "assistant",
//                 content: m.content,
//               },
//           );
//         }
//       }
//     } else if (messages.length > 0) {
//       // Fallback to standard message extraction
//       const assistantMessages = messages.filter(
//         (m) => m.role === "assistant" || m.role === "tool",
//       );
//       if (assistantMessages.length > 0) {
//         endEvent.output =
//           assistantMessages.length === 1 &&
//           typeof assistantMessages[0].content === "string"
//             ? assistantMessages[0].content
//             : assistantMessages;
//       }
//     }

//     // For tool calls, use the result as output
//     if (type === "tool" && endEvent.metadata?.toolName) {
//       // Tool output might be in metadata or need to be extracted from events
//       endEvent.output = endEvent.output || "Tool executed successfully";
//     }

//     // Ensure output is never null for mandatory field
//     if (!endEvent.output) {
//       // Default to empty string for tools, empty array for LLM
//       endEvent.output = type === "tool" ? "" : [];
//     }

//     // Add duration
//     const durNs = BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano);
//     const ms = Number(durNs) / 1_000_000;
//     endEvent.metadata = { ...(endEvent.metadata || {}), duration_ms: ms };

//     // Status mapping
//     if (span.status && span.status.code && span.status.code !== 0) {
//       endEvent.level = "error";
//       endEvent.error = {
//         ...(endEvent.error || {}),
//         code: span.status.code,
//         message: span.status.message || endEvent.error?.message,
//       };
//     }

//     events.push(endEvent);
//   } else {
//     // Single event for spans without clear start/end
//     const e: Event = {
//       type,
//       event: "complete",
//       runId: runId!,
//       parentRunId: parentRunId as any,
//       timestamp: nsToIso(span.startTimeUnixNano || 0),
//     } as any;

//     mapAttributes(attrs, e);

//     // Add any messages as input/output
//     if (messages.length > 0) {
//       const userMessages = messages.filter(
//         (m) => m.role === "user" || m.role === "system",
//       );
//       const assistantMessages = messages.filter(
//         (m) => m.role === "assistant" || m.role === "tool",
//       );

//       if (userMessages.length > 0) {
//         e.input =
//           userMessages.length === 1 &&
//           typeof userMessages[0].content === "string"
//             ? userMessages[0].content
//             : userMessages;
//       }

//       if (assistantMessages.length > 0) {
//         e.output =
//           assistantMessages.length === 1 &&
//           typeof assistantMessages[0].content === "string"
//             ? assistantMessages[0].content
//             : assistantMessages;
//       }
//     }

//     // Ensure input/output are never null for mandatory fields
//     if (!e.input) {
//       e.input = type === "tool" ? {} : [];
//     }
//     if (!e.output) {
//       e.output = type === "tool" ? "" : [];
//     }

//     // Status mapping
//     if (span.status && span.status.code && span.status.code !== 0) {
//       e.level = "error";
//       e.error = {
//         ...(e.error || {}),
//         code: span.status.code,
//         message: span.status.message || e.error?.message,
//       };
//     }

//     events.push(e);
//   }

//   // Apply size protection to all events
//   const protectedEvents = events.map(protectEventSize);

//   // Aggregate tool calls if applicable
//   aggregateToolCalls(protectedEvents);

//   return protectedEvents;
// }

export function logToEvents(
  log: LogRecord,
  resourceAttrs: Record<string, unknown>,
): Event[] {
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

  const events: Event[] = [];
  const body = log.body?.stringValue;

  // Extract span context if available
  const spanId = log.spanId
    ? Buffer.from(log.spanId).toString("hex")
    : undefined;
  const traceId = log.traceId
    ? Buffer.from(log.traceId).toString("hex")
    : undefined;

  switch (name) {
    case "gen_ai.tool.message": {
      const content = body ? tryJsonParse(body) : undefined;
      const toolCallId = attrs["gen_ai.tool.call.id"] as string;
      const toolName = attrs["gen_ai.tool.name"] as string;

      const e: Event = {
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

      const e: Event = {
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
          existing.input = existing.messages.filter(
            (m) => m.role === "user" || m.role === "system",
          );
        } else if (role === "assistant") {
          existing.output = existing.messages.filter(
            (m) => m.role === "assistant",
          );
        }

        spanContentMap.set(spanId, existing);
      }

      // Also create a message event
      const e: Event = {
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
      const e: Event = {
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
export function getSpanContent(
  spanId: string,
): { input?: unknown; output?: unknown; messages?: any[] } | undefined {
  const content = spanContentMap.get(spanId);
  if (content) {
    spanContentMap.delete(spanId);
  }
  return content;
}
