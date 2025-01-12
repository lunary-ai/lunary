import json, logging
import anthropic

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

class AnthropicUtils:
    @staticmethod
    def parse_message(message):
        tool_calls = getattr(message, "tool_calls")

        if tool_calls is not None:
            tool_calls = [
                json.loads(tool_calls.model_dump_json(index=2, exclude_unset=True))
                for tool_calls in tool_calls 
            ]
        # TODO: audio?
        # audio = getattr(message, "audio") 
        # if audio is not None:
        #     audio = json.loads(audio.model_dump_json(indent=2, exclude_unset=True))        

        parsed_message = {
            "role": getattr(message, "role"),
            "content": getattr(message, "content"),
            "refusal": getattr(message, "refusal"),
            # TODO: "audio": audio?
            # TODO: function_calls?
            "tool_calls": getattr(message, "tool_calls")
        }
        return parsed_message


    @staticmethod
    def parse_input(*args, **kwargs):
        try:
            messages = [AnthropicUtils.parse_message(message) for message in kwargs["messages"]]
            name = kwargs.get("model")
            extra = {key: kwargs[key] for key in KWARGS_TO_CAPTURE if key in kwargs}

            extra = {k: v for k, v in kwargs.items() if k in KWARGS_TO_CAPTURE}
            return {"name": name, "input": messages, "extra": extra}
        except Exception as e:
            logger.error("Error parsing input: ", e)

    @staticmethod
    def parse_output(message, stream=False):
        try:
            parsed_output = {
                "output": AnthropicUtils.parse_message(message),
                "tokenUsage": {
                    "prompt": getattr(message.usage, "input_tokens"),
                    "completion": getattr(message.usage, "output_tokens") 
                }
            } 
        except Exception as e:
            logger.error("Error parsing output: ", e)