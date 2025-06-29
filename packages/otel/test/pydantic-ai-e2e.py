#!/usr/bin/env python3
"""
End-to-end test for Pydantic AI integration with Lunary OTEL
"""

import os

# Set OTEL environment variables BEFORE importing anything else
LUNARY_PUBLIC_KEY = "07ff18c9-f052-4260-9e89-ea93fe9ba8c5"
os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"
os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer {LUNARY_PUBLIC_KEY}"

# Set OpenAI key from backend .env
os.environ["OPENAI_API_KEY"] = "your-openai-api-key-here"

import nest_asyncio
nest_asyncio.apply()

from pydantic_ai import Agent, RunContext
import logfire

# Configure logfire with Lunary as the service name
logfire.configure(
    service_name='lunary',
    send_to_logfire=False,
)

print("🚀 Pydantic AI E2E Test for Lunary OTEL")
print("="*60)

# Test 1: Simple agent
print("\n✅ Test 1: Simple Agent")
print("-"*40)

simple_agent = Agent(
    'openai:gpt-4o',
    system_prompt='Be concise, reply with one sentence.',
    instrument=True
)

result = simple_agent.run_sync('Where does "hello world" come from?')
print(f"Result: {result.output}")

# Test 2: Agent with tools
print("\n✅ Test 2: Agent with Tools")
print("-"*40)

math_agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are a calculator. Use tools to perform calculations.',
    instrument=True
)

@math_agent.tool
def add(ctx: RunContext[None], a: float, b: float) -> float:
    """Add two numbers"""
    print(f"  → Tool called: add({a}, {b}) = {a + b}")
    return a + b

@math_agent.tool
def multiply(ctx: RunContext[None], a: float, b: float) -> float:
    """Multiply two numbers"""
    print(f"  → Tool called: multiply({a}, {b}) = {a * b}")
    return a * b

result = math_agent.run_sync('Calculate 15 + 25, then multiply the result by 2')
print(f"Result: {result.output}")

# Test 3: Nested agents
print("\n✅ Test 3: Nested Agents")
print("-"*40)

coordinator_agent = Agent(
    'openai:gpt-4o',
    system_prompt='You coordinate between different agents to solve complex problems.',
    instrument=True
)

@coordinator_agent.tool
def delegate_calculation(ctx: RunContext[None], expression: str) -> str:
    """Delegate calculation to math agent"""
    print(f"  → Delegating calculation: {expression}")
    result = math_agent.run_sync(expression)
    return f"Calculation result: {result.output}"

result = coordinator_agent.run_sync('I need help calculating: (10 + 20) * 3')
print(f"Result: {result.output}")

# Test 4: Error handling
print("\n✅ Test 4: Error Handling")
print("-"*40)

error_agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are an agent that tests error scenarios.',
    instrument=True
)

@error_agent.tool
def divide(ctx: RunContext[None], a: float, b: float) -> float:
    """Divide two numbers"""
    if b == 0:
        raise ValueError("Cannot divide by zero!")
    return a / b

try:
    result = error_agent.run_sync('Divide 10 by 0')
    print(f"Result: {result.output}")
except Exception as e:
    print(f"Error caught: {e}")

print("\n" + "="*60)
print("🎉 E2E Test Complete!")
print("\nExpected Backend Events:")
print("1. ✅ Simple agent: LLM start/end events with metadata")
print("2. ✅ Agent with tools: Tool execution events aggregated")
print("3. ✅ Nested agents: Parent-child relationships via parentRunId")
print("4. ✅ Error handling: Error events with stack traces")
print("\n📍 Check backend logs at packages/backend/backend.log")
print("📍 Also check OTEL receiver logs at packages/otel/otel.log")

# Give time for spans to export
import time
time.sleep(2)