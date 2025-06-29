#!/usr/bin/env python3
"""
Print exact event structure to verify input/output fields
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
    service_name='lunary-event-print',
    send_to_logfire=False,
)

print("🔍 PRINTING EVENT STRUCTURE")
print("="*60)

# Simple agent test
agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are a helpful assistant. Answer in one sentence.',
    instrument=True
)

# Run test
print("\n📤 Sending test query...")
result = agent.run_sync('What is the capital of France?')
print(f"✅ Result: {result.output}")

# Wait for export
print("\n⏳ Waiting 5 seconds for processing...")
time.sleep(5)

print("\n✅ CHECK BACKEND LOGS FOR EVENT STRUCTURE WITH INPUT/OUTPUT!")
print("Look for 'lunary-event-print' service name")