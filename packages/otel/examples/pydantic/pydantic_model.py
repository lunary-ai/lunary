import os

import logfire
from pydantic import BaseModel

from pydantic_ai import Agent

from pydantic_ai.messages import SystemPromptPart 

os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"
os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"Authorization=Bearer {os.environ['LUNARY_PRIVATE_KEY']}"

logfire.configure()
logfire.instrument_pydantic_ai()


class MyModel(BaseModel):
    city: str
    country: str


model = os.getenv('PYDANTIC_AI_MODEL', 'openai:gpt-4o')
print(f'Using model: {model}')
agent = Agent(model, output_type=MyModel)

import datetime

if __name__ == '__main__':
    import datetime
    result = agent.run_sync('The windy city in the US of A.')
    print(result.output)
    print(result.usage())