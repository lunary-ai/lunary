// Basic sanity test for the Gen-AI OTLP → Lunary transformer.

import { spanToEvents } from "../src/transform";

import { Span } from "../src/gen/opentelemetry/proto/trace/v1/trace.ts";
import { AnyValue, KeyValue } from "../src/gen/opentelemetry/proto/common/v1/common.ts";

function strKV(key: string, value: string): KeyValue {
  return {
    key,
    value: { stringValue: value } as AnyValue,
  } as KeyValue;
}

function intKV(key: string, value: number): KeyValue {
  return {
    key,
    value: { intValue: BigInt(value) } as AnyValue,
  } as KeyValue;
}

// Build a minimal Gen-AI "chat" span compatible with the semantic conventions.
const start = BigInt(Date.now() * 1_000_000);
const end = start + BigInt(2_000_000); // +2 ms

const span: Span = {
  traceId: new Uint8Array(16).fill(1),
  spanId: new Uint8Array(8).fill(2),
  name: "chat",
  startTimeUnixNano: start,
  endTimeUnixNano: end,
  attributes: [
    strKV("gen_ai.operation.name", "chat"),
    strKV("gen_ai.system", "openai"),
    strKV("gen_ai.request.model", "gpt-4"),
    strKV("gen_ai.request.prompt", "Hello!"),
    strKV("gen_ai.response.completion", "Hi there!"),
    intKV("gen_ai.usage.input_tokens", 5),
    intKV("gen_ai.usage.output_tokens", 7),
    strKV("lunary.project_key", "test_key_123"),
  ],
} as Span;

// Resource attributes can add further metadata; for this test we leave empty.
const events = spanToEvents(span, {});

if (events.length !== 2)
  throw new Error(`Expected exactly 2 events (start/end), got ${events.length}`);

// Check start event
const startEvent = events[0] as any;
if (startEvent.type !== "llm" || startEvent.event !== "start")
  throw new Error("Unexpected type/event mapping for start event");

// Check end event  
const endEvent = events[1] as any;
if (endEvent.type !== "llm" || endEvent.event !== "end")
  throw new Error("Unexpected type/event mapping for end event");

// Token usage should be on both events
if (endEvent.tokensUsage?.prompt !== 5 || endEvent.tokensUsage?.completion !== 7)
  throw new Error("Token usage mapping incorrect");

// Model name should be set from gen_ai.request.model
if (startEvent.name !== "gpt-4" && endEvent.name !== "gpt-4")
  throw new Error("Model name not mapped correctly");

// Check params and metadata mappings
if (startEvent.params?.prompt !== "Hello!")
  throw new Error("Prompt not mapped to params");

if (endEvent.metadata?.completion !== "Hi there!")
  throw new Error("Completion not mapped to metadata.completion");

console.log("✅ genai_transform test passed – produced events:");
console.log("Start event:", JSON.stringify(startEvent, null, 2));
console.log("End event:", JSON.stringify(endEvent, null, 2));
