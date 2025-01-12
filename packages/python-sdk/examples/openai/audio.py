import lunary
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

lunary.monitor(client)

completion = client.chat.completions.create(
    model="gpt-4o-audio-preview",
    modalities=["audio", "text"],
    audio={"voice": "alloy", "format": "wav"},
    messages=[{"role": "user", "content": "Tell me a short story"}],
)

print(completion.choices[0])
