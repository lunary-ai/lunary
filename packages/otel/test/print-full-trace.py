#!/usr/bin/env python3
"""
Print a complete trace to verify parent-child relationships
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
    service_name='lunary-trace-test',
    send_to_logfire=False,
)

print("🔍 CREATING SIMPLE TRACE WITH AGENT AND TOOL")
print("="*60)

# Create agent with tools
agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are a helpful math assistant.',
    instrument=True
)

@agent.tool
def add(ctx: RunContext[None], a: float, b: float) -> float:
    """Add two numbers"""
    return a + b

# Run test
print("\n📤 Running agent with tool...")
result = agent.run_sync('What is 5 + 3?')
print(f"✅ Result: {result.output}")

# Wait for export
print("\n⏳ Waiting 10 seconds for processing...")
time.sleep(10)

print("\n✅ CHECK BACKEND LOGS FOR TRACE HIERARCHY!")
print("Look for 'lunary-trace-test' service name")
print("\nExpected structure:")
print("- Agent (type: agent)")
print("  ↳ LLM call (type: llm)")
print("  ↳ Tool execution (type: tool)")
print("  ↳ LLM call (type: llm)")