#!/usr/bin/env python3
"""
Check for null input/output fields
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
    service_name='lunary-null-check',
    send_to_logfire=False,
)

print("🔍 CHECKING FOR NULL INPUT/OUTPUT FIELDS")
print("="*60)

# Test 1: Simple agent
print("\n1️⃣ Simple Agent Test")
agent = Agent(
    'openai:gpt-4o',
    system_prompt='Be concise.',
    instrument=True
)
result = agent.run_sync('Hello')
print(f"Result: {result.output}")

# Test 2: Agent with tools
print("\n2️⃣ Agent with Tools Test")
tool_agent = Agent(
    'openai:gpt-4o',
    system_prompt='Use tools when asked.',
    instrument=True
)

@tool_agent.tool
def get_date(ctx: RunContext[None]) -> str:
    """Get current date"""
    return "2025-06-25"

result = tool_agent.run_sync('What is the date?')
print(f"Result: {result.output}")

# Test 3: Empty/minimal agent
print("\n3️⃣ Minimal Agent Test")
minimal_agent = Agent('openai:gpt-4o', instrument=True)
result = minimal_agent.run_sync('Hi')
print(f"Result: {result.output}")

print("\n⏳ Waiting 10 seconds...")
time.sleep(10)

print("\n✅ CHECK BACKEND LOGS FOR ANY NULL INPUT/OUTPUT!")