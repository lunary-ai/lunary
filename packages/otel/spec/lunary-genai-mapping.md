# Lunary ↔︎ OpenTelemetry Gen-AI mapping

This document describes **how every OpenTelemetry Gen-AI attribute, span, log
and metric is translated to a Lunary `Event` object** so that data emitted by
any OTel-instrumented Gen-AI SDK can be ingested by Lunary without changes.

The mapping is exhaustive as of the upstream spec snapshot dated **2024-06-23**
(see `otel-genai-spec.md`).

## 1  Resource-level attributes → Project / user context

| OTel attribute                 | Lunary field                | Notes |
|--------------------------------|-----------------------------|-------|
| `service.name`                 | project resolution          | look-up via `<service.namespace>::<service.name>` when `lunary.project_key` missing |
| `service.namespace`            | project resolution          | idem |
| `lunary.project_key`           | `X-Lunary-Api-Key` header   | short-circuit project look-up |
| `enduser.id` / `gen_ai.user_id`| `userId`                    | will up-sert `external_user` |

## 2  Span mapping (tables cover **all** Gen-AI span types)

### 2.1 Common span fields

| Span field                     | Lunary field                        | Conversion |
|--------------------------------|-------------------------------------|------------|
| `span_id`                      | `runId`                              | hex → uuid-like via `ensureIsUUID` |
| `parent_span_id`               | `parentRunId`                        | idem |
| `start_time_unix_nano`         | `timestamp`                          | ns → ISO-8601 |
| `status.code != OK`            | `error.code`, `level="error"`       | `status.message` → `error.message` |

### 2.2 Attribute-to-field mapping

| OTel attribute                              | Lunary field                                    |
|---------------------------------------------|-------------------------------------------------|
| `gen_ai.operation.name`                     | `event` when `type=llm`; else kept in `metadata.operation` |
| `gen_ai.system`                             | `metadata.system`                                |
| `gen_ai.conversation.id`                    | `threadId` (internally stored on parent `thread` run) |
| `gen_ai.request.model`                      | `params.model`                                   |
| `gen_ai.response.model`                     | `metadata.modelResponse`                         |
| `gen_ai.output.type`                        | `params.outputType`                              |
| `gen_ai.request.choice.count`               | `params.choiceCount`                            |
| `gen_ai.request.seed`                       | `params.seed`                                   |
| `gen_ai.request.max_tokens`                 | `params.maxTokens`                              |
| `gen_ai.request.frequency_penalty`          | `params.frequencyPenalty`                       |
| `gen_ai.request.presence_penalty`           | `params.presencePenalty`                        |
| `gen_ai.request.temperature`                | `params.temperature`                            |
| `gen_ai.request.top_p`                      | `params.topP`                                   |
| `gen_ai.request.top_k`                      | `params.topK`                                   |
| `gen_ai.request.stop_sequences`             | `params.stop`                                   |
| `gen_ai.request.encoding_formats`           | `params.encodingFormats`                        |
| `gen_ai.response.finish_reasons`            | `metadata.finishReasons`                        |
| `gen_ai.response.id`                        | `metadata.responseId`                           |
| `gen_ai.usage.input_tokens`                 | `tokensUsage.prompt`                            |
| `gen_ai.usage.output_tokens`                | `tokensUsage.completion`                        |
| `gen_ai.tool.call.id`                       | `metadata.toolCallId`                           |
| `gen_ai.tool.name`                          | `metadata.toolName` / `toolCalls[].function.name`|
| `gen_ai.tool.description`                   | `metadata.toolDescription`                      |
| `gen_ai.tool.type`                          | `metadata.toolType`                             |
| **Any `error.type` attribute**              | `error.code`                                    |
| Any unknown attribute                       | `metadata.<key>`                                |

### 2.3 Input / output payloads

| OTel attribute                                     | Lunary field |
|----------------------------------------------------|--------------|
| **Events** `gen_ai.*.message` bodies (JSON)        | `input` / `output` depending on message role  |
| Span attribute `gen_ai.prompt` (deprecated)        | `input` (string) |
| Span attribute `gen_ai.completion` (deprecated)    | `output` (string) |

Lunary expects **arrays of OpenAI-style chat messages**; when only string
payloads are provided they are wrapped into `[ { role:"user", content: <str> } ]`.

## 3  Logs → Streaming support & tool calls

| OTLP LogRecord condition                     | Lunary event            | Notes |
|---------------------------------------------|-------------------------|-------|
| `event.name == "gen_ai.tool.message"`       | `type="tool"`          | Forward body as `output` |
| `event.name == "gen_ai.choice"` (streaming) | `event="stream"`        | Each chunk appended; last one becomes `complete` |

## 4  Metrics

* `gen_ai.client.token.usage` → no transformation, values are aggregated by
  Lunary billing/analytics back-end using the `tokensUsage.*` fields already
  extracted from spans.
* `gen_ai.client.operation.duration` → stored in
  `metadata.duration_ms` (converted from seconds histogram).  The max value of
  the histogram is used for the single run record.

Server-side metrics (`gen_ai.server.*`) are **not** persisted at the moment.

## 5  Unmapped / future attributes

Attributes introduced in future versions of the spec are passed through into
`Event.metadata` so **no data is lost**.  The transformer contains a unit test
that fails whenever a *known* upstream attribute is missing from the table
above – ensuring we keep parity with the spec.

---

_Last updated: 2024-06-23_
