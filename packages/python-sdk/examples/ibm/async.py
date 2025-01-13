import os, asyncio
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

async def main():
  messages = [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Who won the world series in 2020?"}
  ]
  response = await model.achat(messages=messages)
  print(response)

asyncio.run(main())