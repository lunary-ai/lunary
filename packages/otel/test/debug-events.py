#!/usr/bin/env python3
"""
Debug script to check event shape from Pydantic AI
"""

import os
import time
import json

# Configure OTEL
os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"
os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer 07ff18c9-f052-4260-9e89-ea93fe9ba8c5"
os.environ["OPENAI_API_KEY"] = "your-openai-api-key-here"

import nest_asyncio
nest_asyncio.apply()

from pydantic_ai import Agent, RunContext
import logfire

# Configure logfire
logfire.configure(
    service_name='lunary-debug',
    send_to_logfire=False,
)

print("🔍 Debug Pydantic AI Event Shape")
print("="*60)

# Simple agent test
agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are a helpful assistant. Be very concise.',
    instrument=True
)

@agent.tool
def get_time(ctx: RunContext[None]) -> str:
    """Get current time"""
    import datetime
    return f"Current time: {datetime.datetime.now().strftime('%H:%M:%S')}"

# Run test with tool
print("\n📤 Sending test with tool call...")
result = agent.run_sync('What time is it?')
print(f"✅ Result: {result.output}")

# Wait for export
print("\n⏳ Waiting 10 seconds for events to process...")
time.sleep(10)

print("\n✅ Done! Check the console output from OTEL receiver and backend")
print("\n🎯 Expected event shape:")
print(json.dumps({
    "type": "llm",
    "event": "start/end",
    "input": ["User/system messages"],
    "output": ["Assistant messages with content"],
    "metadata": {
        "model_name": "gpt-4o",
        "events": "...",
        "tool_calls": ["If any"]
    }
}, indent=2))