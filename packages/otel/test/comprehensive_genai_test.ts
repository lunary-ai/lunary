// Comprehensive test for OpenTelemetry GenAI → Lunary transformation
// Tests all major features: content extraction, streaming, tools, errors

import { spanToEvents, logToEvents } from "../src/transform";
import { Span, Span_Event } from "../src/gen/opentelemetry/proto/trace/v1/trace.ts";
import { LogRecord } from "../src/gen/opentelemetry/proto/logs/v1/logs.ts";
import { AnyValue, KeyValue } from "../src/gen/opentelemetry/proto/common/v1/common.ts";

// Helper functions
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

function doubleKV(key: string, value: number): KeyValue {
  return {
    key,
    value: { doubleValue: value } as AnyValue,
  } as KeyValue;
}

function arrayKV(key: string, values: string[]): KeyValue {
  return {
    key,
    value: {
      arrayValue: {
        values: values.map(v => ({ stringValue: v } as AnyValue))
      }
    } as AnyValue,
  } as KeyValue;
}

console.log("🧪 Running comprehensive GenAI transformation tests...\n");

// Test 1: Full LLM span with content events
console.log("Test 1: LLM span with prompt/completion events");
const start = BigInt(Date.now() * 1_000_000);
const end = start + BigInt(500_000_000); // +500ms

const llmSpan: Span = {
  traceId: new Uint8Array(16).fill(1),
  spanId: new Uint8Array(8).fill(2),
  name: "chat",
  startTimeUnixNano: start,
  endTimeUnixNano: end,
  attributes: [
    strKV("gen_ai.operation.name", "chat"),
    strKV("gen_ai.system", "openai"),
    strKV("gen_ai.request.model", "gpt-4-turbo"),
    doubleKV("gen_ai.request.temperature", 0.7),
    intKV("gen_ai.request.max_tokens", 1000),
    doubleKV("gen_ai.request.top_p", 0.95),
    arrayKV("gen_ai.request.stop_sequences", ["\\n\\n", "END"]),
    strKV("gen_ai.response.model", "gpt-4-turbo-2024-04-09"),
    arrayKV("gen_ai.response.finish_reasons", ["stop"]),
    strKV("gen_ai.response.id", "chatcmpl-123456"),
    intKV("gen_ai.usage.input_tokens", 150),
    intKV("gen_ai.usage.output_tokens", 250),
    intKV("gen_ai.usage.prompt_tokens_cached", 50),
    strKV("lunary.project_key", "test_project_123"),
  ],
  events: [
    {
      name: "gen_ai.content.prompt",
      timeUnixNano: start + BigInt(1_000_000),
      attributes: [
        strKV("gen_ai.prompt", "Explain quantum computing in simple terms")
      ],
    } as Span_Event,
    {
      name: "gen_ai.content.completion", 
      timeUnixNano: start + BigInt(400_000_000),
      attributes: [
        strKV("gen_ai.completion", "Quantum computing uses quantum bits (qubits) that can be both 0 and 1 simultaneously...")
      ],
    } as Span_Event,
  ],
} as Span;

const llmEvents = spanToEvents(llmSpan, {});
console.log(`Generated ${llmEvents.length} events from LLM span:`);
llmEvents.forEach((e, i) => {
  console.log(`  Event ${i + 1}:`);
  console.log(`    - Type: ${e.type}, Event: ${e.event}`);
  console.log(`    - Name: ${e.name}`);
  console.log(`    - Has input: ${!!e.input}`);
  console.log(`    - Has output: ${!!e.output}`);
  console.log(`    - Tokens: prompt=${e.tokensUsage?.prompt}, completion=${e.tokensUsage?.completion}, cached=${e.tokensUsage?.promptCached}`);
});

// Verify expectations
if (llmEvents.length !== 2) throw new Error("Expected 2 events (start/end)");
if (llmEvents[0].event !== "start") throw new Error("First event should be start");
if (llmEvents[1].event !== "end") throw new Error("Second event should be end");
if (llmEvents[0].name !== "gpt-4-turbo") throw new Error("Model name not mapped correctly");
if (!llmEvents[0].input) throw new Error("Start event missing input");
if (!llmEvents[1].output) throw new Error("End event missing output");
if (llmEvents[1].tokensUsage?.promptCached !== 50) throw new Error("Cached tokens not mapped");

console.log("✅ Test 1 passed!\n");

// Test 2: Message events via logs
console.log("Test 2: Message events via log records");
const spanId = new Uint8Array(8).fill(3);
const messageTimestamp = start + BigInt(100_000_000);

const systemMessageLog: LogRecord = {
  timeUnixNano: messageTimestamp,
  name: "gen_ai.system.message",
  body: { stringValue: "You are a helpful AI assistant." },
  spanId: spanId,
  attributes: [],
} as LogRecord;

const userMessageLog: LogRecord = {
  timeUnixNano: messageTimestamp + BigInt(10_000_000),
  name: "gen_ai.user.message",
  body: { stringValue: "What is the capital of France?" },
  spanId: spanId,
  attributes: [],
} as LogRecord;

const assistantMessageLog: LogRecord = {
  timeUnixNano: messageTimestamp + BigInt(20_000_000),
  name: "gen_ai.assistant.message",
  body: { stringValue: "The capital of France is Paris." },
  spanId: spanId,
  attributes: [],
} as LogRecord;

const messageEvents = [
  ...logToEvents(systemMessageLog, {}),
  ...logToEvents(userMessageLog, {}),
  ...logToEvents(assistantMessageLog, {}),
];

console.log(`Generated ${messageEvents.length} message events:`);
messageEvents.forEach((e, i) => {
  console.log(`  Event ${i + 1}: type=${e.type}, event=${e.event}, message=${e.message}`);
});

if (messageEvents.length !== 3) throw new Error("Expected 3 message events");
if (messageEvents[0].event !== "system") throw new Error("Wrong role for system message");
if (messageEvents[1].event !== "user") throw new Error("Wrong role for user message");
if (messageEvents[2].event !== "assistant") throw new Error("Wrong role for assistant message");

console.log("✅ Test 2 passed!\n");

// Test 3: Tool execution
console.log("Test 3: Tool execution flow");
const toolLog: LogRecord = {
  timeUnixNano: start + BigInt(200_000_000),
  name: "gen_ai.tool.message",
  body: { stringValue: JSON.stringify({ temperature: 22, unit: "celsius" }) },
  spanId: spanId,
  attributes: [
    strKV("gen_ai.tool.call.id", "call_abc123"),
    strKV("gen_ai.tool.name", "get_weather"),
  ],
} as LogRecord;

const toolEvents = logToEvents(toolLog, {});
console.log(`Generated ${toolEvents.length} tool event:`);
const toolEvent = toolEvents[0];
console.log(`  - Type: ${toolEvent.type}`);
console.log(`  - Name: ${toolEvent.name}`);
console.log(`  - Output: ${JSON.stringify(toolEvent.output)}`);
console.log(`  - Tool call ID: ${toolEvent.metadata?.toolCallId}`);

if (toolEvent.type !== "tool") throw new Error("Wrong type for tool event");
if (toolEvent.name !== "get_weather") throw new Error("Tool name not mapped");
if (!toolEvent.output?.temperature) throw new Error("Tool output not parsed");

console.log("✅ Test 3 passed!\n");

// Test 4: Streaming with choice events
console.log("Test 4: Streaming choice events");
const streamLog1: LogRecord = {
  timeUnixNano: start + BigInt(150_000_000),
  name: "gen_ai.choice",
  body: { stringValue: JSON.stringify({ delta: { content: "The answer is" } }) },
  spanId: spanId,
  attributes: [
    intKV("gen_ai.choice.index", 0),
  ],
} as LogRecord;

const streamLog2: LogRecord = {
  timeUnixNano: start + BigInt(250_000_000),
  name: "gen_ai.choice",
  body: { stringValue: JSON.stringify({ delta: { content: " 42." } }) },
  spanId: spanId,
  attributes: [
    intKV("gen_ai.choice.index", 0),
    strKV("gen_ai.choice.finish_reason", "stop"),
  ],
} as LogRecord;

const streamEvents = [
  ...logToEvents(streamLog1, {}),
  ...logToEvents(streamLog2, {}),
];

console.log(`Generated ${streamEvents.length} streaming events:`);
streamEvents.forEach((e, i) => {
  console.log(`  Event ${i + 1}: event=${e.event}, finishReasons=${e.metadata?.finishReasons}`);
});

if (streamEvents[0].event !== "stream") throw new Error("First choice should be stream");
if (streamEvents[1].event !== "end") throw new Error("Choice with finish_reason should be end");
if (!streamEvents[1].metadata?.finishReasons) throw new Error("Finish reasons not mapped");

console.log("✅ Test 4 passed!\n");

// Test 5: Error handling
console.log("Test 5: Error span");
const errorSpan: Span = {
  traceId: new Uint8Array(16).fill(1),
  spanId: new Uint8Array(8).fill(4),
  name: "chat_error",
  startTimeUnixNano: start,
  endTimeUnixNano: end,
  attributes: [
    strKV("gen_ai.operation.name", "chat"),
    strKV("gen_ai.system", "openai"),
    strKV("gen_ai.request.model", "gpt-4"),
    strKV("error.type", "RateLimitError"),
    strKV("error.message", "Rate limit exceeded"),
  ],
  status: {
    code: 2, // ERROR
    message: "Rate limit exceeded for model",
  },
} as Span;

const errorEvents = spanToEvents(errorSpan, {});
const errorEvent = errorEvents.find(e => e.event === "end");
console.log(`Error event:`);
console.log(`  - Level: ${errorEvent?.level}`);
console.log(`  - Error code: ${errorEvent?.error?.code}`);
console.log(`  - Error message: ${errorEvent?.error?.message}`);

if (errorEvent?.level !== "error") throw new Error("Error level not set");
if (errorEvent?.error?.code !== 2) throw new Error("Status code not mapped");
if (!errorEvent?.error?.message?.includes("Rate limit")) throw new Error("Error message not mapped");

console.log("✅ Test 5 passed!\n");

// Test 6: Complex span with multiple message events
console.log("Test 6: Complex span with multiple messages");
const complexSpan: Span = {
  traceId: new Uint8Array(16).fill(1),
  spanId: new Uint8Array(8).fill(5),
  name: "multi_turn_chat",
  startTimeUnixNano: start,
  endTimeUnixNano: end,
  attributes: [
    strKV("gen_ai.operation.name", "chat"),
    strKV("gen_ai.system", "anthropic"),
    strKV("gen_ai.request.model", "claude-3-opus"),
    strKV("gen_ai.conversation.id", "conv_123"),
    arrayKV("gen_ai.request.encoding_formats", ["utf-8"]),
  ],
  events: [
    {
      name: "gen_ai.system.message",
      timeUnixNano: start,
      attributes: [
        strKV("gen_ai.message.content", "You are Claude, an AI assistant.")
      ],
    } as Span_Event,
    {
      name: "gen_ai.user.message",
      timeUnixNano: start + BigInt(10_000_000),
      attributes: [
        strKV("gen_ai.message.content", "Hello Claude!")
      ],
    } as Span_Event,
    {
      name: "gen_ai.assistant.message",
      timeUnixNano: start + BigInt(100_000_000),
      attributes: [
        strKV("gen_ai.message.content", "Hello! How can I help you today?")
      ],
    } as Span_Event,
    {
      name: "gen_ai.user.message",
      timeUnixNano: start + BigInt(200_000_000),
      attributes: [
        strKV("gen_ai.message.content", "What's 2+2?")
      ],
    } as Span_Event,
    {
      name: "gen_ai.assistant.message",
      timeUnixNano: start + BigInt(300_000_000),
      attributes: [
        strKV("gen_ai.message.content", "2 + 2 = 4")
      ],
    } as Span_Event,
  ],
} as Span;

const complexEvents = spanToEvents(complexSpan, {});
console.log(`Generated ${complexEvents.length} events from complex span`);
const startEvent = complexEvents.find(e => e.event === "start");
const endEvent = complexEvents.find(e => e.event === "end");

console.log(`Start event input messages: ${Array.isArray(startEvent?.input) ? startEvent.input.length : 0}`);
console.log(`End event output messages: ${Array.isArray(endEvent?.output) ? endEvent.output.length : 0}`);
console.log(`Conversation ID: ${startEvent?.metadata?.conversationId}`);
console.log(`Encoding formats: ${startEvent?.params?.encodingFormats}`);

if (!Array.isArray(startEvent?.input) || startEvent.input.length !== 3) {
  throw new Error("Start event should have 3 input messages (system + 2 user)");
}
if (!Array.isArray(endEvent?.output) || endEvent.output.length !== 2) {
  throw new Error("End event should have 2 output messages");
}

console.log("✅ Test 6 passed!\n");

console.log("🎉 All tests passed! The OpenTelemetry GenAI to Lunary transformation is working correctly.");