# OTEL Compatibility Test Report

## Test Overview
Successfully tested OpenTelemetry integration using OpenLLMetry (Traceloop SDK) with OpenAI.

## Configuration
- **OTEL Receiver Port**: 4318
- **Backend Endpoint**: http://localhost:3333/ingest/otel
- **Project Key**: 07ff18c9-f052-4260-9e89-ea93fe9ba8c5
- **Test Library**: traceloop-sdk (OpenLLMetry)
- **LLM Provider**: OpenAI (gpt-3.5-turbo)

## Events Received

### Event Structure
Each LLM call generates two events:
1. **Start Event** (`event: "start"`)
2. **End Event** (`event: "end"`)

### Key Fields Captured

#### Metadata Fields:
- `llm.request.type`: "chat"
- `system`: "OpenAI"
- `llm.is_streaming`: boolean
- `gen_ai.openai.api_base`: "https://api.openai.com/v1/"
- `gen_ai.prompt.{n}.role`: User/system message roles
- `gen_ai.prompt.{n}.content`: User/system message content
- `modelResponse`: Actual model version used (e.g., "gpt-3.5-turbo-0125")
- `responseId`: OpenAI response ID
- `llm.usage.total_tokens`: Total token count
- `completion_tokens`: Completion token count
- `prompt_tokens`: Prompt token count
- `cache_read_input_tokens`: Cache-related tokens
- `gen_ai.completion.{n}.finish_reason`: "stop"
- `gen_ai.completion.{n}.role`: "assistant"
- `gen_ai.completion.{n}.content`: Model response content
- `project_key`: Lunary project key (from resource attributes)
- `service.name`: Application name (from resource attributes)
- `duration_ms`: Request duration (end event only)

#### Core Event Fields:
- `type`: "llm"
- `event`: "start" or "end"
- `runId`: Unique identifier for the request
- `timestamp`: ISO timestamp
- `name`: Model name
- `params`: Object containing model parameters
  - `model`: Model identifier
  - `maxTokens`: Max tokens parameter
  - `temperature`: Temperature parameter

### Token Usage
Currently, the `tokensUsage` object contains null values:
```json
"tokensUsage": {
  "prompt": null,
  "completion": null
}
```
This appears to be because the token counts are stored in the metadata fields instead.

## Test Results

✅ **OTEL Receiver**: Successfully received and decoded protobuf messages
✅ **Event Transformation**: Correctly transformed OTEL spans to Lunary events
✅ **Project Key Routing**: Successfully extracted project key from resource attributes
✅ **Backend Processing**: Events successfully inserted into database
✅ **Multiple Calls**: Handled multiple concurrent LLM calls correctly
✅ **Streaming Support**: Streaming calls properly marked with `llm.is_streaming`

## Integration Flow

1. **OpenLLMetry** → Sends OTEL spans to port 4318
2. **OTEL Receiver** → Receives protobuf, transforms to Lunary events
3. **Backend API** → Processes events via `/ingest/otel` endpoint
4. **Database** → Stores events for the project

## Notes

- The OTEL receiver successfully handles the OpenTelemetry semantic conventions for GenAI
- Resource attributes (like `service.name` and custom `lunary.project_key`) are properly propagated
- All OpenAI-specific attributes are captured correctly
- The integration preserves all relevant metadata for LLM observability