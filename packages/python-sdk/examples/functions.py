import openai
import os
import lunary


openai.api_key = os.environ.get("OPENAI_API_KEY")

lunary.monitor(openai)

functions = [
    {
        "name": "get_current_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA",
                },
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["location"],
        },
    }
]

completion = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "What's the weather like in Boston?"}],
    temperature=0,
    functions=functions,
)

print(completion.choices[0].message)
