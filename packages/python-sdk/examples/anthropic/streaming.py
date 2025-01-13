import os
from anthropic import Anthropic
import lunary

client = Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY"),  
)
lunary.monitor(client)


stream = client.messages.create(
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Hello, Claude",
        }
    ],
    model="claude-3-opus-20240229",
    stream=True
)

for event in stream:
  pass

  