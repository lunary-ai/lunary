#!/usr/bin/env python3
"""
Final comprehensive test for Pydantic AI integration
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
    service_name='lunary-final-test',
    send_to_logfire=False,
)

print("🚀 FINAL COMPREHENSIVE TEST")
print("="*60)

# Test 1: Simple agent (should be type: agent)
print("\n1️⃣ Testing simple agent...")
simple_agent = Agent(
    'openai:gpt-4o',
    system_prompt='Be very concise.',
    instrument=True
)
result = simple_agent.run_sync('Say hello')
print(f"   Result: {result.output}")

# Test 2: Agent with tools
print("\n2️⃣ Testing agent with tools...")
tool_agent = Agent(
    'openai:gpt-4o',
    system_prompt='Use tools when needed.',
    instrument=True
)

@tool_agent.tool
def multiply(ctx: RunContext[None], a: float, b: float) -> float:
    """Multiply two numbers"""
    return a * b

result = tool_agent.run_sync('What is 6 times 7?')
print(f"   Result: {result.output}")

# Wait for processing
print("\n⏳ Waiting 15 seconds for processing...")
time.sleep(15)

print("\n✅ TEST COMPLETE!")
print("\nExpected events in backend:")
print("1. Simple agent:")
print("   - Agent event (type: agent)")
print("   - LLM event (type: llm) with parentRunId pointing to agent")
print("\n2. Tool agent:")
print("   - Agent event (type: agent)")
print("   - LLM event (type: llm) with parentRunId pointing to agent")
print("   - Tool event (type: tool) with parentRunId pointing to agent")
print("   - LLM event (type: llm) with parentRunId pointing to agent")
print("\n📊 CHECK BACKEND LOGS FOR 'lunary-final-test' SERVICE!")