from openai import OpenAI
import lunary

client = OpenAI()
lunary.monitor(client)


tools = [
  {
      "type": "function",
      "function": {
          "name": "get_weather",
          "parameters": {
              "type": "object",
              "properties": {
                  "location": {"type": "string"}
              },
          },
      },
  }
]
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What's the weather like in Paris today?"},
    {
        "role": "assistant",
        "tool_calls": [
            {
                "id": "call_abc123",
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "arguments": "{\"location\": \"Paris\"}"
                }
            }
        ]
    },
    {
        "role": "tool",
        "tool_call_id": "call_abc123",
        "name": "get_weather",
        "content": "12 degrees celsius"
    },
    {
      "role": "user",
      "content": "Is it cold then?"
    }
]


completion = client.chat.completions.create(
  model="gpt-5",
  messages=messages,
  tools=tools,
)

print(completion)