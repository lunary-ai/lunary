import json, logging

logger = logging.getLogger(__name__)

# TODO: make sure it's the correct list
KWARGS_TO_CAPTURE = [
    "frequency_penalty",
    "functions",
    "logit_bias",
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
    "logprobs",
    "prediction",
    "service_tier",
    "parallel_tool_calls"
]

class IBMUtils:
    @staticmethod
    def parse_message(message):
        parsed_message = {
            "role": message.get("role"),
            "content": message.get("content"), 
            "tool_calls": message.get("tool_calls", None),
            "tool_call_id": message.get("tool_call_id", None)
        }
        return parsed_message


    @staticmethod
    def parse_input(*args, **kwargs):
        try:
            messages = [IBMUtils.parse_message(message) for message in kwargs["messages"]]
            name = kwargs.get("model")
            extra = {key: kwargs[key] for key in KWARGS_TO_CAPTURE if key in kwargs}

            extra = {k: v for k, v in kwargs.items() if k in KWARGS_TO_CAPTURE}
            return {"name": name, "input": messages, "extra": extra}
        except Exception as e:
            logger.error("Error parsing input: ", e)

    @staticmethod
    def parse_output(output, stream=False):
        try:
            parsed_output = {
                "output": IBMUtils.parse_message(output['choices'][0]['message']), # TODO: safe access for all keys 
                "tokensUsage": {
                    "prompt": output['usage']['prompt_tokens'],
                    "completion": output['usage']['completion_tokens'],
                },
                "name": output['model']
            } 
            # TODO: get name from input
            return parsed_output
        except Exception as e:
            logger.error("Error parsing output: ", e)