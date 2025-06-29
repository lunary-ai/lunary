#!/usr/bin/env python3
"""
Verify Pydantic AI events are properly ingested into Lunary
"""

import os
import time

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
    service_name='lunary-verification',
    send_to_logfire=False,
)

print("🔍 Verifying Pydantic AI → Lunary Integration")
print("="*60)

# Create an agent with tools
agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are a helpful assistant that can perform calculations.',
    instrument=True
)

@agent.tool
def calculate(ctx: RunContext[None], expression: str) -> str:
    """Evaluate a mathematical expression"""
    print(f"  → Calculating: {expression}")
    try:
        result = eval(expression)
        return f"The result is {result}"
    except Exception as e:
        return f"Error: {e}"

# Run a test
print("\n📤 Sending test event...")
result = agent.run_sync('What is 42 + 58?')
print(f"✅ Result: {result.output}")

print("\n⏳ Waiting for spans to export...")
time.sleep(5)

print("\n🎯 Verification Complete!")
print("\nTo verify ingestion:")
print("1. Check OTEL receiver output for received spans")
print("2. Check backend logs for processed events")
print("3. Events should have proper parent-child relationships")
print("4. Tool calls should be aggregated in output.tool_calls")