# OTEL Testing Instructions

## Prerequisites

Before running any OTEL tests, you MUST have both services running:

### 1. Start Backend Service
```bash
cd /Users/hughcrt/Developer/lunary/lunary/packages/backend
bun run dev
```
- Should see: `✅ Lunary API server listening on port 3333`
- Verify with: `curl http://localhost:3333/health` (returns 404 which is OK)

### 2. Start OTEL Receiver
```bash
cd /Users/hughcrt/Developer/lunary/lunary/packages/otel
bun run src/index.ts
```
- Should see: `🔭 OTLP/HTTP receiver listening on http://localhost:4318`

## Running Pydantic AI Tests

### Setup Python Environment
```bash
cd /Users/hughcrt/Developer/lunary/lunary/packages/otel
python3 -m venv test/venv
source test/venv/bin/activate
pip install nest_asyncio pydantic-ai logfire openai
```

### Available Test Scripts

1. **Simple Test**: `python test/pydantic-ai-simple.py`
   - Basic agent test with single query

2. **Full E2E Test**: `python test/pydantic-ai-e2e.py`
   - Tests simple agents, tools, nested agents, error handling

3. **Verification Test**: `python test/verify-ingestion.py`
   - Verifies integration is working with tool calls

4. **Debug Test**: `python test/debug-events.py`
   - Shows expected event shape

## Event Flow

1. Pydantic AI → OTEL Receiver (port 4318) → Backend (port 3333/ingest/otel)
2. Check logs:
   - OTEL logs: `tail -f packages/otel/otel.log`
   - Backend logs: `tail -f packages/backend/backend.log`

## Important Configuration

- OTEL endpoint: `http://localhost:4318`
- Authorization header: `Bearer 07ff18c9-f052-4260-9e89-ea93fe9ba8c5`
- Service name: `lunary`

## Troubleshooting

1. **Connection Refused**: Services not running - start them!
2. **401 Unauthorized**: Wrong endpoint - should be port 4318, not 3333
3. **No events in backend**: Check OTEL receiver logs for errors
4. **Parent run errors**: Normal - events are still processed

## Event Shape Requirements

Events MUST have:
- `type`: "llm", "tool", "agent", etc.
- `event`: "start" or "end"
- `input`: User/system messages (mandatory)
- `output`: Assistant messages/results (mandatory)
- `runId` & `parentRunId`: For trace hierarchy
- `timestamp`: ISO format