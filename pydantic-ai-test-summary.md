# Pydantic AI Test Results Summary

## Test Execution Results

### Test 1: Basic Agent
**Query**: "What is the capital of France?"
**Response**: "The capital of France is Paris."
**Token Usage**: 30 prompt / 7 completion / 37 total

### Test 2: Agent with Tools
**Query**: "Calculate (5 * 3) + (2^4)"
**Tool Calls**:
- `multiply(5, 3)` → 15
- `power(2, 4)` → 16  
- `add(15, 16)` → 31
**Response**: "The result of (5 × 3) + (2^4) is 31."
**Token Usage**: 328 prompt / 91 completion / 419 total

### Test 3: Complex Agent with Dependencies
**Query**: "I want to visit Paris. Should I go there now?"
**Tool Call**: `get_city_info(Paris)` → Weather: Cloudy, 15.5°C
**Response**: 
```
city='Paris' 
reason="The weather is currently cloudy with a temperature of 15.5°C. It's a good time to visit and explore the city." 
best_time_to_visit='spring or fall' 
must_see_attractions=['Eiffel Tower', 'Louvre Museum', 'Notre Dame Cathedral']
```
**Token Usage**: 318 prompt / 87 completion / 405 total

### Test 4: Nested Agent Calls (Trace Hierarchy) 
**Query**: "I need two things: 1) Calculate 15 * 7 + 3^2, and 2) Get travel advice for Tokyo"
**Execution Flow**:
1. Research agent delegates to:
   - Math agent:
     - `multiply(15, 7)` → 105
     - `power(3, 2)` → 9
     - `add(105, 9)` → 114
   - Travel agent:
     - `get_city_info(Tokyo)` → Weather: Sunny, 22.0°C

**Response**:
```
1) The result of 15 × 7 + 3^2 is 114.

2) Travel advice for Tokyo:
- City: Tokyo
- Reason: The weather is sunny, with a temperature of 22°C, making it a great time to visit.
- Best time to visit: Spring or autumn
- Must-see attractions: Senso-ji Temple, Shibuya Crossing, Tokyo Disneyland
```
**Token Usage**: 413 prompt / 143 completion / 556 total

### Test 5: Streaming (Failed)
**Error**: `TypeError: 'async for' requires an object with __aiter__ method`
- Need to update streaming API usage

### Test 6: Error Handling
**Query**: "Please divide 10 by 0"
**Tool Call**: `divide(10, 0)` → ValueError: Division by zero!
- Error properly captured in span attributes

## OTEL Event Characteristics

### Event Volume per Test
- **Basic agent**: 2 events (start/end)
- **Agent with tools**: 8 events (2 for agent + 6 for tools)
- **Complex agent**: 4 events (2 for agent + 2 for tool)
- **Nested agents**: ~36 events (multiple agents and tools)

### Trace Hierarchy Verification
✅ All events have proper `parentRunId` relationships
✅ Tool calls are nested under their parent agent runs
✅ Nested agent calls maintain hierarchy across multiple levels
✅ Custom span attributes flow through to all child spans

### Data Completeness
- ✅ Full message history in `events` field
- ✅ Tool arguments and results captured
- ✅ Model parameters and configuration
- ✅ Token usage for cost tracking
- ✅ Timing information (duration_ms)
- ✅ Error states and exceptions
- ✅ Custom attributes (user.id, session.id, tags)