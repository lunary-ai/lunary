#!/usr/bin/env python3
"""
Check tool types in events
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
    service_name='lunary-tool-check',
    send_to_logfire=False,
)

print("🔍 CHECKING TOOL TYPE DETECTION")
print("="*60)

# Create agent with tools
agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are a calculator assistant.',
    instrument=True
)

@agent.tool
def calculate(ctx: RunContext[None], expression: str) -> str:
    """Calculate a mathematical expression"""
    try:
        result = eval(expression)
        return f"The result is {result}"
    except:
        return "Invalid expression"

# Run test
print("\n📤 Running agent with tool...")
result = agent.run_sync('Calculate 10 * 5 + 3')
print(f"✅ Result: {result.output}")

# Wait for processing
print("\n⏳ Waiting 10 seconds for processing...")
time.sleep(10)

print("\n✅ CHECK BACKEND LOGS!")
print("\nExpected structure:")
print("- Agent (type: agent, runId: X)")
print("  ↳ LLM call (type: llm, parentRunId: X)")
print("  ↳ Tool call (type: tool, parentRunId: X)")  
print("  ↳ LLM call (type: llm, parentRunId: X)")
print("\nLook for 'lunary-tool-check' service name")