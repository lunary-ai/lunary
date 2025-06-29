#!/usr/bin/env python3
"""
Weather agent test for Pydantic AI integration with Lunary
Based on: https://ai.pydantic.dev/examples/weather-agent/
"""

import os
import time
from datetime import datetime

# Configure OTEL
# os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"
# os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer 07ff18c9-f052-4260-9e89-ea93fe9ba8c5"
os.environ["OPENAI_API_KEY"] = "your-openai-api-key-here"

import nest_asyncio
nest_asyncio.apply()

from typing import Dict, Any
from pydantic_ai import Agent, RunContext
import logfire

# Configure logfire  
logfire.configure(
    token="pylf_v1_us_h8y0WnpnSCKg62LFr0Fqpc009nnR6p9l9NTQdS7pbM1T"
)

print("🌦️ WEATHER AGENT TEST")
print("="*60)

# Create weather agent with tools
weather_agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are a helpful weather assistant. Use the tools to get weather information for the user.',
    instrument=True
)

# Mock weather data
WEATHER_DATA = {
    "New York": {"temp": 72, "condition": "Partly Cloudy", "humidity": 65},
    "London": {"temp": 59, "condition": "Rainy", "humidity": 85},
    "Tokyo": {"temp": 68, "condition": "Clear", "humidity": 55},
    "Sydney": {"temp": 77, "condition": "Sunny", "humidity": 60},
    "Paris": {"temp": 63, "condition": "Cloudy", "humidity": 70},
}

@weather_agent.tool
def get_current_weather(ctx: RunContext[None], city: str) -> Dict[str, Any]:
    """Get the current weather for a given city"""
    print(f"🔍 Getting weather for: {city}")
    
    # Normalize city name
    city_normalized = city.title()
    
    if city_normalized in WEATHER_DATA:
        weather = WEATHER_DATA[city_normalized]
        return {
            "city": city_normalized,
            "temperature": weather["temp"],
            "condition": weather["condition"],
            "humidity": weather["humidity"],
            "unit": "fahrenheit"
        }
    else:
        return {
            "city": city,
            "error": f"Weather data not available for {city}"
        }

@weather_agent.tool  
def get_weather_forecast(ctx: RunContext[None], city: str, days: int = 3) -> Dict[str, Any]:
    """Get weather forecast for a given city"""
    print(f"📅 Getting {days}-day forecast for: {city}")
    
    # Mock forecast data
    city_normalized = city.title()
    
    if city_normalized in WEATHER_DATA:
        current = WEATHER_DATA[city_normalized]
        forecast = []
        
        for i in range(days):
            # Simple mock forecast - vary temp slightly
            forecast.append({
                "day": i + 1,
                "high": current["temp"] + (i * 2),
                "low": current["temp"] - 5 + i,
                "condition": current["condition"] if i == 0 else "Partly Cloudy"
            })
        
        return {
            "city": city_normalized,
            "forecast": forecast,
            "unit": "fahrenheit"
        }
    else:
        return {
            "city": city,
            "error": f"Forecast not available for {city}"
        }

@weather_agent.tool
def compare_weather(ctx: RunContext[None], city1: str, city2: str) -> Dict[str, Any]:
    """Compare weather between two cities"""
    print(f"🔄 Comparing weather: {city1} vs {city2}")
    
    city1_normalized = city1.title()
    city2_normalized = city2.title()
    
    weather1 = WEATHER_DATA.get(city1_normalized, None)
    weather2 = WEATHER_DATA.get(city2_normalized, None)
    
    if weather1 and weather2:
        return {
            "comparison": {
                city1_normalized: {
                    "temperature": weather1["temp"],
                    "condition": weather1["condition"]
                },
                city2_normalized: {
                    "temperature": weather2["temp"],
                    "condition": weather2["condition"]
                },
                "temperature_difference": abs(weather1["temp"] - weather2["temp"]),
                "warmer_city": city1_normalized if weather1["temp"] > weather2["temp"] else city2_normalized
            }
        }
    else:
        return {
            "error": "Could not compare - missing data for one or both cities"
        }

# Test scenarios
print("\n📍 Test 1: Simple weather query")
result1 = weather_agent.run_sync('What\'s the weather like in New York?')
print(f"Result: {result1.output}")

print("\n📍 Test 2: Weather comparison")
result2 = weather_agent.run_sync('Compare the weather between London and Tokyo')
print(f"Result: {result2.output}")

print("\n📍 Test 3: Weather forecast")
result3 = weather_agent.run_sync('Give me a 5-day forecast for Paris')
print(f"Result: {result3.output}")

print("\n📍 Test 4: Multiple tool calls")
result4 = weather_agent.run_sync('What\'s the current weather in Sydney and give me a forecast for London?')
print(f"Result: {result4.output}")

print("\n📍 Test 5: Error handling")
result5 = weather_agent.run_sync('What\'s the weather in Antarctica?')
print(f"Result: {result5.output}")

# Wait for processing
print("\n⏳ Waiting 15 seconds for OTEL processing...")
time.sleep(15)

print("\n✅ TEST COMPLETE!")
print("\nExpected events in Lunary:")
print("- 5 Agent spans (one for each test)")
print("- Multiple LLM and tool calls as children of each agent")
print("- Tool calls should show as type 'tool' with proper input/output")
print("- All events should have proper parent-child relationships")
print("\n🔍 Check Lunary UI for 'lunary-weather-agent' service traces!")