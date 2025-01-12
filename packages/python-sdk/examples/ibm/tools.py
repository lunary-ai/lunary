import os
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
import lunary

model = ModelInference(
    model_id="meta-llama/llama-3-1-8b-instruct",
    credentials=Credentials(
        api_key=os.environ.get("IBM_API_KEY"), 
        url = "https://us-south.ml.cloud.ibm.com"),
        project_id=os.environ.get("IBM_PROJECT_ID")
    )
lunary.monitor(model)

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
    {"role": "user", "content": "What's the weather like in Paris today?"}
]
response = model.chat(
  messages=messages, 
  tools=tools,
)
