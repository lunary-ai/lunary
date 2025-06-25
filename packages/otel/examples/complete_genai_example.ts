// Complete example: Sending OpenTelemetry GenAI data to Lunary
// This demonstrates how to send traces with full GenAI semantic conventions

import {
  ExportTraceServiceRequest,
  ResourceSpans,
  ScopeSpans,
} from "../src/gen/opentelemetry/proto/collector/trace/v1/trace_service";
import { Span, Span_Event, Status_StatusCode } from "../src/gen/opentelemetry/proto/trace/v1/trace";
import { Resource } from "../src/gen/opentelemetry/proto/resource/v1/resource";
import { KeyValue, AnyValue } from "../src/gen/opentelemetry/proto/common/v1/common";

// Helper to create attributes
function attr(key: string, value: string | number | string[]): KeyValue {
  let anyValue: AnyValue;
  
  if (typeof value === "string") {
    anyValue = { stringValue: value } as AnyValue;
  } else if (typeof value === "number") {
    if (Number.isInteger(value)) {
      anyValue = { intValue: BigInt(value) } as AnyValue;
    } else {
      anyValue = { doubleValue: value } as AnyValue;
    }
  } else if (Array.isArray(value)) {
    anyValue = {
      arrayValue: {
        values: value.map(v => ({ stringValue: v } as AnyValue))
      }
    } as AnyValue;
  }
  
  return { key, value: anyValue } as KeyValue;
}

// Configuration
const OTEL_ENDPOINT = process.env.OTEL_ENDPOINT || "http://localhost:4318";
const LUNARY_PROJECT_KEY = process.env.LUNARY_PUBLIC_KEY || "your-project-key";

async function sendGenAITrace() {
  console.log("📤 Sending OpenTelemetry GenAI trace to Lunary...\n");

  // Create trace and span IDs
  const traceId = crypto.getRandomValues(new Uint8Array(16));
  const spanId = crypto.getRandomValues(new Uint8Array(8));
  const startTime = BigInt(Date.now() * 1_000_000);
  const endTime = startTime + BigInt(1_500_000_000); // 1.5 seconds later

  // Create the main LLM span with all GenAI attributes
  const llmSpan: Span = {
    traceId,
    spanId,
    traceState: "",
    parentSpanId: new Uint8Array(),
    name: "openai.chat.completions",
    kind: 3, // CLIENT
    startTimeUnixNano: startTime,
    endTimeUnixNano: endTime,
    attributes: [
      // GenAI semantic conventions
      attr("gen_ai.operation.name", "chat"),
      attr("gen_ai.system", "openai"),
      attr("gen_ai.request.model", "gpt-4-turbo-preview"),
      attr("gen_ai.request.temperature", 0.7),
      attr("gen_ai.request.max_tokens", 2000),
      attr("gen_ai.request.top_p", 0.95),
      attr("gen_ai.request.frequency_penalty", 0.2),
      attr("gen_ai.request.presence_penalty", 0.1),
      attr("gen_ai.request.stop_sequences", ["\\n\\n", "END"]),
      
      // Response attributes
      attr("gen_ai.response.model", "gpt-4-0125-preview"),
      attr("gen_ai.response.id", "chatcmpl-8xKl8kLm9n0pQrSTN2HlNfzM1Bvn"),
      attr("gen_ai.response.finish_reasons", ["stop"]),
      
      // Usage metrics
      attr("gen_ai.usage.input_tokens", 523),
      attr("gen_ai.usage.output_tokens", 847),
      attr("gen_ai.usage.prompt_tokens_cached", 120),
      
      // Additional metadata
      attr("gen_ai.conversation.id", "conv_abc123"),
      attr("http.method", "POST"),
      attr("http.url", "https://api.openai.com/v1/chat/completions"),
      attr("http.status_code", 200),
    ],
    events: [
      // System message event
      {
        timeUnixNano: startTime,
        name: "gen_ai.system.message",
        attributes: [
          attr("gen_ai.message.content", "You are a helpful AI assistant specialized in explaining complex technical topics in simple terms.")
        ],
      } as Span_Event,
      
      // User message event
      {
        timeUnixNano: startTime + BigInt(10_000_000),
        name: "gen_ai.user.message", 
        attributes: [
          attr("gen_ai.message.content", "Can you explain how OpenTelemetry works with LLMs?")
        ],
      } as Span_Event,
      
      // Assistant response event
      {
        timeUnixNano: startTime + BigInt(1_400_000_000),
        name: "gen_ai.assistant.message",
        attributes: [
          attr("gen_ai.message.content", "OpenTelemetry is an observability framework that helps track and monitor applications. When used with LLMs (Large Language Models), it provides several key benefits:\n\n1. **Request Tracking**: OpenTelemetry can trace each request to an LLM, capturing details like the model used, parameters, and timing.\n\n2. **Performance Monitoring**: It measures latency, token usage, and response times, helping identify bottlenecks.\n\n3. **Error Tracking**: Any failures or rate limits are automatically captured with full context.\n\n4. **Cost Attribution**: By tracking token usage per request, you can monitor and optimize LLM costs.\n\n5. **Standardization**: The GenAI semantic conventions ensure consistent telemetry across different LLM providers.\n\nThis telemetry data flows through collectors to observability platforms like Lunary, where you can visualize, analyze, and alert on your LLM usage.")
        ],
      } as Span_Event,
    ],
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
    status: {
      code: Status_StatusCode.STATUS_CODE_OK,
      message: "",
    },
  } as Span;

  // Create a tool execution span
  const toolSpanId = crypto.getRandomValues(new Uint8Array(8));
  const toolStartTime = startTime + BigInt(500_000_000);
  const toolEndTime = toolStartTime + BigInt(200_000_000);
  
  const toolSpan: Span = {
    traceId,
    spanId: toolSpanId,
    traceState: "",
    parentSpanId: spanId, // Child of the main LLM span
    name: "get_current_weather",
    kind: 3, // CLIENT
    startTimeUnixNano: toolStartTime,
    endTimeUnixNano: toolEndTime,
    attributes: [
      attr("gen_ai.operation.name", "execute_tool"),
      attr("gen_ai.tool.name", "get_current_weather"),
      attr("gen_ai.tool.description", "Get the current weather for a given location"),
      attr("gen_ai.tool.call.id", "call_xyz789"),
    ],
    events: [
      {
        timeUnixNano: toolEndTime,
        name: "gen_ai.tool.message",
        attributes: [
          attr("gen_ai.message.content", JSON.stringify({
            location: "San Francisco, CA",
            temperature: 65,
            unit: "fahrenheit",
            conditions: "Partly cloudy"
          }))
        ],
      } as Span_Event,
    ],
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
    status: {
      code: Status_StatusCode.STATUS_CODE_OK,
      message: "",
    },
  } as Span;

  // Create the OTLP request
  const request: ExportTraceServiceRequest = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            attr("service.name", "example-genai-app"),
            attr("service.version", "1.0.0"),
            attr("lunary.project_key", LUNARY_PROJECT_KEY),
          ],
        } as Resource,
        scopeSpans: [
          {
            scope: {
              name: "opentelemetry-genai",
              version: "0.1.0",
            },
            spans: [llmSpan, toolSpan],
          } as ScopeSpans,
        ],
      } as ResourceSpans,
    ],
  };

  // Encode and send the request
  const body = ExportTraceServiceRequest.encode(request).finish();
  
  try {
    const response = await fetch(`${OTEL_ENDPOINT}/v1/traces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-protobuf",
      },
      body,
    });

    if (response.ok) {
      console.log("✅ Trace sent successfully!");
      console.log("\nWhat was sent:");
      console.log("- 1 LLM span with chat completion");
      console.log("- 3 message events (system, user, assistant)");
      console.log("- 1 tool execution span");
      console.log("- Full GenAI semantic conventions");
      console.log("\nThis will appear in Lunary as:");
      console.log("- Start event for the LLM call with the input messages");
      console.log("- End event with the output and token usage");
      console.log("- Tool execution with the weather data");
    } else {
      console.error("❌ Failed to send trace:", response.status, await response.text());
    }
  } catch (error) {
    console.error("❌ Error sending trace:", error);
  }
}

// Run the example
sendGenAITrace();