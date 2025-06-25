# OpenTelemetry GenAI Compatibility Report for Lunary

## Executive Summary

After analyzing the OpenTelemetry GenAI specification and Lunary's implementation, I found that the current implementation has basic compatibility but is missing several key features required for full OpenTelemetry GenAI compliance.

## Current Implementation Status

### ✅ What's Working

1. **Basic Span Transformation**
   - Converts OTel spans to Lunary events
   - Maps span IDs to run IDs correctly
   - Handles timestamps and duration calculations
   - Basic attribute mapping for common fields

2. **Core Attributes Mapped**
   - `gen_ai.operation.name` → type determination
   - `gen_ai.system` → metadata.system
   - `gen_ai.request.*` → params.*
   - `gen_ai.response.*` → metadata.*
   - `gen_ai.usage.input_tokens` → tokensUsage.prompt
   - `gen_ai.usage.output_tokens` → tokensUsage.completion
   - Error handling with status codes

3. **Test Coverage**
   - Basic test exists and passes
   - Validates core transformation logic

### ❌ Major Gaps

1. **Missing Input/Output Content**
   - The transformer doesn't handle message content from OTel events
   - `gen_ai.content.prompt` and `gen_ai.content.completion` events are not processed
   - No extraction of actual prompts/completions from span events
   - The test shows `params.prompt` but actual prompt content should be in `input` field

2. **Incomplete Event Handling**
   - Only processes spans, not log records with GenAI events
   - Missing support for streaming events (`gen_ai.choice`)
   - No handling of tool messages (`gen_ai.tool.message`)
   - System/user/assistant message events not captured

3. **Missing Attributes**
   - `gen_ai.request.model` not mapped to `name` field
   - `gen_ai.response.finish_reasons` not mapped
   - `gen_ai.response.id` not captured
   - Tool-related attributes partially mapped

4. **Structural Issues**
   - Events always marked as "complete" - no start/end event separation
   - No support for streaming chunks
   - Thread/conversation management incomplete

## Required Fixes

### 1. Input/Output Content Extraction

The transformer needs to:
- Process OTel LogRecords containing `gen_ai.*.message` events
- Extract message content and map to Lunary's `input`/`output` fields
- Handle OpenAI-style message format conversion

### 2. Model Name Mapping

```typescript
// In mapAttributes function
case "gen_ai.request.model":
  e.name = String(v);
  break;
```

### 3. Event Type Handling

- Implement proper start/end event separation based on span lifecycle
- Add streaming support for `gen_ai.choice` events
- Handle tool execution flows

### 4. Complete Attribute Mapping

Add missing mappings:
- `gen_ai.response.finish_reasons`
- `gen_ai.response.id`
- `gen_ai.request.encoding_formats`
- Cached token support

### 5. Message Content Processing

The current implementation doesn't extract actual prompt/completion content. According to OTel spec, this comes from:
- Span events with names like `gen_ai.content.prompt`
- LogRecords with `gen_ai.*.message` event names
- Event body contains the actual content

## Recommendations

1. **Immediate Priority**: Fix input/output content extraction to capture actual prompts and completions
2. **High Priority**: Add model name mapping and complete attribute coverage
3. **Medium Priority**: Implement proper event lifecycle (start/end) handling
4. **Future**: Add full streaming and tool calling support

## Test Improvements Needed

The current test is too basic. It should:
- Test actual message content extraction
- Verify all OTel attributes are mapped correctly
- Test error scenarios
- Test streaming events
- Test tool calling flows

## Conclusion

While the basic infrastructure is in place, the implementation requires significant enhancements to be fully compatible with the OpenTelemetry GenAI specification. The most critical gap is the lack of actual content (prompts/completions) extraction from OTel data.