import json, logging

logger = logging.getLogger(__name__)
MONITORED_KEYS = [
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

class OpenAIUtils:
    @staticmethod
    def parse_role(role):
        if role == "assistant":
            return "ai"
        else:
            return role

    @staticmethod
    def get_property(object, property):
        if isinstance(object, dict):
            return None if not object.get(property) else object.get(property)
        else:
            return getattr(object, property, None)

    @staticmethod
    def parse_message(message):

        audio = OpenAIUtils.get_property(message, "audio")
        if audio is not None:
            audio = json.loads(audio.model_dump_json(indent=2, exclude_unset=True))

        parsed_message = {
            "role": OpenAIUtils.get_property(message, "role"),
            "content": OpenAIUtils.get_property(message, "content"),
            "refusal": OpenAIUtils.get_property(message, "refusal"),
            "audio": audio,
            "tool_calls": OpenAIUtils.get_property(message, "tool_calls"),
            "tool_call_id": OpenAIUtils.get_property(message, "tool_call_id"),
        }
        return parsed_message

    @staticmethod
    def parse_input(*args, **kwargs):
        messages = [
            OpenAIUtils.parse_message(message) for message in kwargs["messages"]
        ]
        name = (
            kwargs.get("model", None)
            or kwargs.get("engine", None)
            or kwargs.get("deployment_id", None)
        )
        extra = {key: kwargs[key] for key in MONITORED_KEYS if key in kwargs}
        
        return {"name": name, "input": messages, "extra": extra}

    @staticmethod
    def parse_output(output, stream=False):
        try:
            return {
                "output": OpenAIUtils.parse_message(output.choices[0].message),
                "tokensUsage": {
                    "completion": output.usage.completion_tokens,
                    "prompt": output.usage.prompt_tokens,
                    "promptCached": OpenAIUtils.get_property(OpenAIUtils.get_property(output.usage, "prompt_tokens_details"), "cached_tokens")
                },
            }
        except Exception as e:
            logging.info("[Lunary] Error parsing output: ", e)
