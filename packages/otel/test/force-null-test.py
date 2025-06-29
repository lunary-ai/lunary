#!/usr/bin/env python3
"""
Test case to potentially trigger null input/output
"""

import os
import time

# Configure OTEL
os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"
os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer 07ff18c9-f052-4260-9e89-ea93fe9ba8c5"
os.environ["OPENAI_API_KEY"] = "your-openai-api-key-here"

import logfire
from opentelemetry import trace

# Configure logfire  
logfire.configure(
    service_name='lunary-force-null',
    send_to_logfire=False,
)

print("🔍 TESTING EDGE CASES FOR NULL INPUT/OUTPUT")
print("="*60)

# Test 1: Manual span without attributes
print("\n1️⃣ Manual Span Test")
tracer = trace.get_tracer(__name__)
with tracer.start_as_current_span("manual_span") as span:
    span.set_attribute("gen_ai.operation.name", "chat")  # Mark as LLM type
    span.set_attribute("gen_ai.request.model", "gpt-4o")
    # No events, no messages - might trigger null
    time.sleep(0.1)
print("Manual span completed")

# Test 2: Span with empty events
print("\n2️⃣ Empty Events Span Test")
with tracer.start_as_current_span("empty_events_span") as span:
    span.set_attribute("gen_ai.operation.name", "chat")
    span.set_attribute("gen_ai.request.model", "gpt-4o")
    span.set_attribute("events", "[]")  # Empty events array
    span.set_attribute("all_messages_events", "[]")  # Empty messages
    time.sleep(0.1)
print("Empty events span completed")

# Test 3: Tool span without proper attributes
print("\n3️⃣ Tool Span Test")
with tracer.start_as_current_span("tool_span") as span:
    span.set_attribute("gen_ai.operation.name", "tool")
    span.set_attribute("gen_ai.tool.name", "test_tool")
    # No tool arguments or results
    time.sleep(0.1)
print("Tool span completed")

print("\n⏳ Waiting 10 seconds...")
time.sleep(10)

print("\n✅ CHECK BACKEND LOGS FOR NULL INPUT/OUTPUT!")
print("Look for events from 'lunary-force-null' service")