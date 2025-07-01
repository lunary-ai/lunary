import os
import logfire
from pydantic import BaseModel
from pydantic_ai import Agent

from pydantic_ai.messages import SystemPromptPart 

os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:3333"
os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer {os.environ['LUNARY_PRIVATE_KEY']}"

logfire.configure(send_to_logfire=False)
logfire.instrument_pydantic_ai()


class MyModel(BaseModel):
    city: str
    country: str

agent = Agent(model='open:gpt-4.1', output_type=MyModel, model_settings={'temperature': 0.7})

if __name__ == '__main__':
    result = agent.run_sync('The windy city in the US of A.')
    print(result.output)