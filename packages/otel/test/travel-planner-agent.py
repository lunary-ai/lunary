#!/usr/bin/env python3
"""
Travel planner agent test - demonstrates nested agents and complex tool usage
"""

import os
import time
from typing import Dict, Any, List
from datetime import datetime, timedelta

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
    service_name='lunary-travel-planner',
    send_to_logfire=False,
)

print("✈️ TRAVEL PLANNER AGENT TEST")
print("="*60)

# Mock data
FLIGHTS = {
    ("New York", "Paris"): [
        {"airline": "Air France", "price": 650, "duration": "8h"},
        {"airline": "Delta", "price": 720, "duration": "7h 30m"}
    ],
    ("London", "Tokyo"): [
        {"airline": "JAL", "price": 980, "duration": "11h 30m"},
        {"airline": "British Airways", "price": 1050, "duration": "12h"}
    ],
    ("San Francisco", "Sydney"): [
        {"airline": "Qantas", "price": 1200, "duration": "14h 30m"},
        {"airline": "United", "price": 1150, "duration": "15h"}
    ]
}

HOTELS = {
    "Paris": [
        {"name": "Hotel Le Marais", "price": 180, "rating": 4.5},
        {"name": "Eiffel Tower View Hotel", "price": 250, "rating": 4.7}
    ],
    "Tokyo": [
        {"name": "Tokyo Station Hotel", "price": 220, "rating": 4.6},
        {"name": "Shibuya Grand Hotel", "price": 190, "rating": 4.4}
    ],
    "Sydney": [
        {"name": "Sydney Harbour Hotel", "price": 200, "rating": 4.5},
        {"name": "Opera House Suites", "price": 280, "rating": 4.8}
    ]
}

ACTIVITIES = {
    "Paris": ["Eiffel Tower Tour", "Louvre Museum", "Seine River Cruise"],
    "Tokyo": ["Mount Fuji Day Trip", "Senso-ji Temple", "Akihabara Tour"],
    "Sydney": ["Opera House Tour", "Harbour Bridge Climb", "Bondi Beach"]
}

# Create travel planner agent
travel_agent = Agent(
    'openai:gpt-4o',
    system_prompt='You are a helpful travel planning assistant. Help users plan their trips by finding flights, hotels, and activities.',
    instrument=True
)

@travel_agent.tool
def search_flights(ctx: RunContext[None], origin: str, destination: str) -> List[Dict[str, Any]]:
    """Search for flights between two cities"""
    print(f"✈️ Searching flights: {origin} → {destination}")
    
    key = (origin, destination)
    if key in FLIGHTS:
        return FLIGHTS[key]
    else:
        return [{"error": f"No flights found from {origin} to {destination}"}]

@travel_agent.tool
def search_hotels(ctx: RunContext[None], city: str, check_in: str = None, check_out: str = None) -> List[Dict[str, Any]]:
    """Search for hotels in a city"""
    print(f"🏨 Searching hotels in: {city}")
    
    if city in HOTELS:
        hotels = HOTELS[city]
        # Add availability info
        for hotel in hotels:
            hotel["available"] = True
            if check_in and check_out:
                hotel["dates"] = f"{check_in} to {check_out}"
        return hotels
    else:
        return [{"error": f"No hotels found in {city}"}]

@travel_agent.tool
def get_activities(ctx: RunContext[None], city: str) -> List[str]:
    """Get popular activities in a city"""
    print(f"🎭 Getting activities for: {city}")
    
    if city in ACTIVITIES:
        return ACTIVITIES[city]
    else:
        return [f"No activities data available for {city}"]

@travel_agent.tool
def calculate_trip_cost(ctx: RunContext[None], flight_price: float, hotel_price: float, nights: int, activities_budget: float = 100) -> Dict[str, Any]:
    """Calculate total trip cost"""
    print(f"💰 Calculating trip cost...")
    
    hotel_total = hotel_price * nights
    total = flight_price + hotel_total + activities_budget
    
    return {
        "flight_cost": flight_price,
        "hotel_cost": hotel_total,
        "activities_budget": activities_budget,
        "total_cost": total,
        "cost_per_day": total / (nights + 1)
    }

# Test scenarios
print("\n🌍 Test 1: Simple trip planning")
result1 = travel_agent.run_sync(
    "I want to travel from New York to Paris. Find me flights and hotels."
)
print(f"Result: {result1.output[:200]}...")

print("\n🌍 Test 2: Complex trip with activities")
result2 = travel_agent.run_sync(
    "Plan a 5-day trip from London to Tokyo. I need flights, hotels, activities, and total cost estimate."
)
print(f"Result: {result2.output[:200]}...")

print("\n🌍 Test 3: Multi-city comparison")
result3 = travel_agent.run_sync(
    "Compare travel options from San Francisco to either Sydney or Tokyo. Which is better for a week-long trip?"
)
print(f"Result: {result3.output[:200]}...")

print("\n🌍 Test 4: Budget planning")
result4 = travel_agent.run_sync(
    "I have a budget of $2000. Can I afford a 4-day trip from New York to Paris including flights, hotels, and activities?"
)
print(f"Result: {result4.output[:200]}...")

# Create a sub-agent for weather (demonstrates nested agents)
weather_agent = Agent(
    'openai:gpt-4o',
    system_prompt='You provide weather information for travel planning.',
    instrument=True
)

@weather_agent.tool
def get_weather_for_travel(ctx: RunContext[None], city: str, travel_date: str = None) -> Dict[str, str]:
    """Get weather forecast for travel planning"""
    # Mock weather data
    weather_data = {
        "Paris": {"forecast": "Partly cloudy, 68°F", "recommendation": "Pack light jacket"},
        "Tokyo": {"forecast": "Clear skies, 72°F", "recommendation": "Perfect weather for sightseeing"},
        "Sydney": {"forecast": "Sunny, 77°F", "recommendation": "Don't forget sunscreen"}
    }
    
    return weather_data.get(city, {"forecast": "No data", "recommendation": "Check local forecast"})

print("\n🌍 Test 5: Combined travel and weather planning")
# First get weather
weather_result = weather_agent.run_sync("What's the weather like in Paris next week?")
print(f"Weather: {weather_result.output}")

# Then plan travel based on weather
travel_result = travel_agent.run_sync(
    f"Plan a trip to Paris. {weather_result.output} Find flights from New York and suggest appropriate hotels."
)
print(f"Travel plan: {travel_result.output[:200]}...")

# Wait for processing
print("\n⏳ Waiting 20 seconds for OTEL processing...")
time.sleep(20)

print("\n✅ TEST COMPLETE!")
print("\nExpected events in Lunary:")
print("- Multiple Agent spans for travel planning")
print("- Nested tool calls for flights, hotels, activities, and cost calculation")
print("- Weather agent as a separate trace")
print("- All events properly typed and with parent-child relationships")
print("\n🔍 Check Lunary UI for 'lunary-travel-planner' service traces!")