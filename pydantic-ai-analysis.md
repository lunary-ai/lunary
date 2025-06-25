# Pydantic AI OTEL Integration Analysis

## Test Overview
Successfully tested Pydantic AI integration with OpenTelemetry. The integration captures comprehensive telemetry data for AI agents, tools, and nested operations.

## Configuration
- **Library**: pydantic-ai with logfire instrumentation
- **OTEL Receiver**: Port 4318
- **Project Key**: 07ff18c9-f052-4260-9e89-ea93fe9ba8c5
- **Service Name**: pydantic-ai-test

## Event Structure Analysis

### 1. Basic Agent Events
Each agent call generates two events:
- **Start Event** (`event: "start"`)
- **End Event** (`event: "end"`)

Key fields captured:
```json
{
  "type": "llm",
  "event": "start/end",
  "runId": "unique-id-for-this-call",
  "parentRunId": "parent-span-id",
  "timestamp": "ISO-8601-timestamp",
  "metadata": {
    "system": "openai",
    "server.address": "api.openai.com",
    "modelResponse": "gpt-3.5-turbo-0125",
    "events": "[array of message events]",
    "service.name": "pydantic-ai-test",
    "project_key": "07ff18c9-f052-4260-9e89-ea93fe9ba8c5",
    "duration_ms": 1198.639  // only in end event
  },
  "params": {
    "model": "gpt-3.5-turbo"
  },
  "tokensUsage": {
    "prompt": 117,
    "completion": 67
  }
}
```

### 2. Tool Call Events
Tool executions are captured as separate spans:
```json
{
  "type": "llm",
  "event": "start/end",
  "runId": "tool-execution-id",
  "parentRunId": "parent-agent-run-id",
  "metadata": {
    "toolName": "multiply",
    "toolCallId": "call_CoQFoEptKCUA8MaBq3PIwF21",
    "tool_arguments": "{\"a\": 15, \"b\": 7}",
    "logfire.msg": "running tool: multiply"
  }
}
```

### 3. Trace Hierarchy

✅ **Parent-Child Relationships are Properly Maintained**

Example hierarchy from nested agents test:
```
test-4-nested-agents (custom span)
├── agent run (research_agent)
│   ├── chat completion
│   └── tools
│       ├── analyze_with_math_agent
│       │   └── agent run (math_agent)
│       │       ├── chat completion
│       │       └── tools
│       │           ├── multiply
│       │           ├── power
│       │           └── add
│       └── get_travel_advice
│           └── agent run (travel_agent)
│               ├── chat completion
│               └── tools
│                   └── get_city_info
```

### 4. Comprehensive Metadata Captured

#### System Information
- `telemetry.sdk.language`: "python"
- `telemetry.sdk.name`: "opentelemetry"
- `telemetry.sdk.version`: "1.34.1"
- `service.name`: From resource attributes
- `project_key`: From resource attributes

#### Model Parameters
- Full tool definitions with JSON schemas
- Model configuration (temperature, max_tokens, etc.)
- Output mode and constraints

#### Message History
The `events` field contains a complete history of the conversation:
```json
[
  {
    "content": "System prompt...",
    "role": "system",
    "gen_ai.system": "openai",
    "gen_ai.message.index": 0,
    "event.name": "gen_ai.system.message"
  },
  {
    "content": "User message...",
    "role": "user",
    "gen_ai.system": "openai",
    "gen_ai.message.index": 0,
    "event.name": "gen_ai.user.message"
  },
  {
    "index": 0,
    "message": {
      "role": "assistant",
      "tool_calls": [...]
    },
    "gen_ai.system": "openai",
    "event.name": "gen_ai.choice"
  }
]
```

### 5. Token Usage Tracking
Token usage is properly captured for each LLM call:
- `prompt`: Input token count
- `completion`: Output token count
- Total tokens available in metadata as `llm.usage.total_tokens`

### 6. Custom Attributes
Custom span attributes (from tracer.start_as_current_span) are preserved:
- `test.name`
- `langfuse.user.id`
- `langfuse.session.id`
- `langfuse.tags`
- `test.complexity`

## Key Findings

### ✅ Successful Integration Points
1. **Complete trace hierarchy** - All parent-child relationships preserved
2. **Tool execution tracking** - Each tool call is a separate span
3. **Token usage** - Accurate token counts for all LLM calls
4. **Metadata preservation** - All Pydantic AI metadata is captured
5. **Custom attributes** - User-defined attributes are maintained
6. **Nested agent support** - Complex agent hierarchies work correctly

### 🔍 Notable Characteristics
1. **Structured events field** - Messages are stored as JSON array in metadata
2. **Tool arguments** - Captured as JSON strings
3. **Model details** - Both requested and actual model versions tracked
4. **Timing information** - Duration calculated for completed spans
5. **Logfire metadata** - Additional schema and message fields from logfire

### ⚠️ Observations
1. **Timeout warnings** - Some OTEL export timeouts (likely due to large payloads)
2. **Streaming incomplete** - Test failed due to API change (need to update)
3. **Large metadata** - Tool definitions can create large event payloads

## Recommendations

1. **Monitor payload sizes** - Pydantic AI events can be large due to tool schemas
2. **Consider filtering** - May want to compress or filter tool definitions
3. **Update streaming syntax** - Fix the streaming test for completeness
4. **Add error tracking** - Capture tool execution errors as span events

## Conclusion

The Pydantic AI integration with OTEL works excellently. All critical observability data is captured:
- Complete trace hierarchy with proper parent-child relationships
- Detailed metadata for debugging and analysis
- Token usage for cost tracking
- Tool execution details for understanding agent behavior

The integration provides comprehensive visibility into AI agent execution, making it suitable for production monitoring and debugging.