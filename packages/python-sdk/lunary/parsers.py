from typing import Any, Dict
import jsonpickle
from pydantic import BaseModel, Field



def default_input_parser(*args, **kwargs):
    def serialize(args, kwargs):
        if not args and not kwargs:
            return None

        if len(args) == 1 and not kwargs:
            return args[0]

        input = list(args)
        if kwargs:
            input.append(kwargs)

        return input

    return {"input": serialize(args, kwargs)}

def method_input_parser(*args, **kwargs):
    def serialize(args, kwargs):
        args = args[1:]

        if not args and not kwargs:
            return None

        if len(args) == 1 and not kwargs:
            return args[0]

        input_list = list(args)
        if kwargs:
            input_list.append(kwargs)

        return input_list

    return {"input": serialize(args, kwargs)}


def default_output_parser(output, *args, **kwargs):
    return {"output": getattr(output, "content", output), "tokensUsage": None}

class PydanticHandler(jsonpickle.handlers.BaseHandler):
    def flatten(self, obj, data):
        """Convert Pydantic model to a JSON-friendly dict using model_dump_json()"""
        return jsonpickle.loads(obj.model_dump_json(), safe=True)

PARAMS_TO_CAPTURE = [
  "frequency_penalty",
  "function_call", 
  "functions",
  "logit_bias",
  "logprobs",
  "max_tokens",
  "max_completion_tokens",
  "n",
  "presence_penalty", 
  "response_format",
  "seed",
  "stop",
  "stream",
  "audio",
  "modalities",
  "temperature",
  "tool_choice",
  "tools",
  "tool_calls",
  "top_p",
  "top_k",
  "top_logprobs",
  "prediction",
  "service_tier",
  "parallel_tool_calls",
  # Additional params
  "extra_headers",
  "extra_query", 
  "extra_body",
  "timeout"
]

def filter_params(params: Dict[str, Any]) -> Dict[str, Any]:
    filtered_params = {key: value for key, value in params.items() if key in PARAMS_TO_CAPTURE}
    return filtered_params

