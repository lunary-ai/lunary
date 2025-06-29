#!/usr/bin/env python3
"""
Simple Pydantic AI test to verify OTEL integration
"""

import os

# Configure OTEL BEFORE any other imports
os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"
os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer 07ff18c9-f052-4260-9e89-ea93fe9ba8c5"
os.environ["OPENAI_API_KEY"] = "your-openai-api-key-here"

import nest_asyncio
nest_asyncio.apply()

from pydantic_ai import Agent
import logfire

logfire.configure(
    service_name='lunary',
    send_to_logfire=False,
)

print("Starting simple Pydantic AI test...")

agent = Agent(
    'openai:gpt-4o',
    system_prompt='Be concise, reply with one sentence.',
    instrument=True
)

result = agent.run_sync('Where does "hello world" come from?')
print(f"Result: {result.output}")

# Give time for spans to export
import time
print("Waiting for spans to export...")
time.sleep(5)
print("Done!")