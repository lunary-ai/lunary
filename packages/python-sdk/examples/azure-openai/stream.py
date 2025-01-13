import os
from openai import AzureOpenAI
import lunary

DEPLOYMENT_ID = os.environ.get("AZURE_OPENAI_DEPLOYMENT_ID")
RESOURCE_NAME = os.environ.get("AZURE_OPENAI_RESOURCE_NAME")
API_KEY = os.environ.get("AZURE_OPENAI_API_KEY")


client = AzureOpenAI(
    api_version="2023-07-01-preview",
    api_key=API_KEY,
    azure_endpoint=f"https://{DEPLOYMENT_ID}.openai.azure.com",
)

lunary.monitor(client)

stream = client.chat.completions.create(
    model=RESOURCE_NAME,
    stream=True,
    messages=[
        {
            "role": "user",
            "content": "Say sync stream",
        },
    ],
)
for chunk in stream:
    if not chunk.choices:
      continue
    print(chunk.choices[0].delta.content, end="")