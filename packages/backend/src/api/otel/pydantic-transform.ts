import { Event } from "@/src/utils/ingest.ts";
import type { KeyValue } from "./gen/opentelemetry/proto/common/v1/common.ts";
import { Span } from "./gen/opentelemetry/proto/trace/v1/trace.ts";
import type { GenAIAttributes, GenAIOperationName } from "./types.ts";

export function spanToEvents(span: Span): Event[] {
  const attributes = parseAttributes(span.attributes);

  const runId = Buffer.from(span.spanId).toString("hex");
  const parentRunId = span.parentSpanId.length
    ? Buffer.from(span.parentSpanId).toString("hex")
    : undefined;

  const opName = attributes["gen_ai.operation.name"];
  let type =
    opName && opName in OP_NAME_TO_TYPE ? OP_NAME_TO_TYPE[opName] : null;

  if (attributes["agent_name"]) {
    type = "agent";
  }

  if (attributes["gen_ai.tool.name"]) {
    type = "tool";
  }
  let events = Array.isArray(attributes.events)
    ? attributes.events
    : span.events;

  // TODO: track errors
  if (type === "llm") {
    const input = events.slice(0, -1);
    const output = events.at(-1).message;
    const startEvent: Event = {
      runId,
      parentRunId,
      type: "llm",
      event: "start",
      name: attributes["gen_ai.request.model"],
      timestamp: nsToIso(span.startTimeUnixNano),
      input,
      params: {
        temperature: attributes["gen_ai.request.temperature"],
        topP: attributes["gen_ai.request.top_p"],
        maxTokens: attributes["gen_ai.request.max_tokens"],
        topK: attributes["gen_ai.request.top_k"],
        frequencyPenalty: attributes["gen_ai.request.frequency_penalty"],
        presencePenalty: attributes["gen_ai.request.presence_penalty"],
        seed: attributes["gen_ai.request.seed"],
        stopSequences: attributes["gen_ai.request.stop_sequences"],
      },
    };

    const endEvent: Event = {
      runId,
      parentRunId,
      type: "llm",
      event: "end",
      name: attributes["gen_ai.request.model"],
      timestamp: nsToIso(span.endTimeUnixNano),
      output,

      tokensUsage: {
        prompt: attributes["gen_ai.usage.input_tokens"]!,
        completion: attributes["gen_ai.usage.output_tokens"]!,
      },
    };

    return [startEvent, endEvent];
  }

  if (type === "agent") {
    const startEvent: Event = {
      runId,
      parentRunId,
      type: "agent",
      event: "start",
      name: (attributes["agent_name"] as string | undefined) || "Agent",
      input: attributes["all_messages_events"],
      timestamp: nsToIso(span.startTimeUnixNano),
    };

    const endEvent: Event = {
      runId,
      parentRunId,
      type: "agent",
      event: "end",
      name: (attributes["agent_name"] as string | undefined) || "Agent",
      timestamp: nsToIso(span.endTimeUnixNano),
      output: attributes["final_result"],
    };

    return [startEvent, endEvent];
  }

  if (type === "tool") {
    let toolInput = attributes["tool_arguments"];

    if (attributes["attributes_json_schema"]) {
      try {
        const schema =
          typeof attributes["attributes_json_schema"] === "string"
            ? JSON.parse(attributes["attributes_json_schema"])
            : attributes["attributes_json_schema"];

        if (schema.properties) {
          const input: Record<string, any> = {};
          for (const [key, _] of Object.entries(schema.properties)) {
            if (key in attributes) {
              input[key] = attributes[key];
              console.log(`Extracted ${key}:`, attributes[key]);
            }
          }
          if (Object.keys(input).length > 0) {
            toolInput = input;
            console.log("Final tool input:", toolInput);
          }
        }
      } catch (e) {
        console.warn("Failed to parse attributes_json_schema:", e);
      }
    }

    const startEvent: Event = {
      runId,
      parentRunId,
      type: "tool",
      event: "start",
      name: attributes["gen_ai.tool.name"] as string,
      timestamp: nsToIso(span.startTimeUnixNano),
      input: toolInput,
    };

    const endEvent: Event = {
      runId,
      parentRunId,
      type: "tool",
      event: "end",
      name: attributes["gen_ai.tool.name"] as string,
      timestamp: nsToIso(span.endTimeUnixNano),
      output: events?.length > 0 ? events : attributes["tool_output"],
    };

    return [startEvent, endEvent];
  }

  const startEvent: Event = {
    runId,
    parentRunId,
    type: "chain",
    event: "start",
    name: attributes["span_name"] as string,
    timestamp: nsToIso(span.startTimeUnixNano),
    input: JSON.stringify({ tools: attributes.tools }),
    metadata: {
      call_id: attributes["gen_ai.tool.call.id"],
    },
  };

  const endEvent: Event = {
    runId,
    parentRunId,
    type: "chain",
    event: "end",
    name: attributes["span_name"] as string,
    timestamp: nsToIso(span.endTimeUnixNano),
  };

  return [startEvent, endEvent];
}

function parseAttributes(spanAttributes: Span["attributes"]): GenAIAttributes {
  const out: GenAIAttributes = {};
  for (const kv of spanAttributes) {
    const key = kv.key;
    const value = anyValueToJs(kv.value);
    out[key as keyof GenAIAttributes] = value;
  }
  return out;
}

export function anyValueToJs(value?: KeyValue["value"]): unknown {
  if (!value) return undefined;
  if (value.stringValue !== undefined && value.stringValue !== null)
    try {
      return JSON.parse(value.stringValue); // sometimes the string is json
    } catch {
      return value.stringValue;
    }
  if (value.boolValue !== undefined && value.boolValue !== null)
    return value.boolValue;
  if (value.intValue !== undefined && value.intValue !== null)
    return Number(value.intValue);
  if (value.doubleValue !== undefined && value.doubleValue !== null)
    return value.doubleValue;
  if (value.arrayValue) return value.arrayValue.values.map(anyValueToJs);
  if (value.kvlistValue) {
    const obj: Record<string, unknown> = {};
    for (const kv of value.kvlistValue.values)
      obj[kv.key] = anyValueToJs(kv.value);
    return obj;
  }
  return undefined;
}

function nsToIso(nano: bigint | number | string): string {
  const ns = typeof nano === "bigint" ? Number(nano) : Number(nano);
  const ms = Math.floor(ns / 1_000_000);
  return new Date(ms).toISOString();
}

const OP_NAME_TO_TYPE: Record<GenAIOperationName, string> = {
  chat: "llm",
  text_completion: "llm",
  generate_content: "llm",
  embeddings: "embed",
  execute_tool: "tool",
  create_agent: "agent",
  invoke_agent: "agent",
};

export function orderEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.timestamp);
    const tb = Date.parse(b.timestamp);
    return ta - tb;
  });
}
