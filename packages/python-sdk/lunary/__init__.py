from inspect import signature
import traceback, logging, copy, time, chevron, aiohttp, copy
from functools import wraps


from packaging import version
from importlib.metadata import PackageNotFoundError
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Optional, Any, Callable, Union
import jsonpickle
from pydantic import BaseModel
import humps

from .exceptions import *
from .parsers import default_input_parser, default_output_parser, filter_params, method_input_parser, PydanticHandler
from .openai_utils import OpenAIUtils
from .ibm_utils import IBMUtils
from .event_queue import EventQueue
from .thread import Thread
from .utils import clean_nones, create_uuid_from_string
from .config import get_config, set_config
from .run_manager import RunManager

from .users import (
    user_ctx,
    user_props_ctx,
    identify,
)  # DO NOT REMOVE `identify`` import
from .tags import tags_ctx, tags  # DO NOT REMOVE `tags` import
from .parent import parent_ctx, parent # DO NOT REMOVE `parent` import
from .project import project_ctx  # DO NOT REMOVE `project` import

logging.basicConfig()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


event_queue_ctx = ContextVar("event_queue_ctx")
event_queue_ctx.set(EventQueue())
queue = event_queue_ctx.get()

run_manager = RunManager()

from contextvars import ContextVar

class LunaryException(Exception):
    pass

jsonpickle.handlers.register(BaseModel, PydanticHandler, base=True)

def config(
    app_id: str | None = None,
    verbose: str | None = None,
    api_url: str | None = None,
    disable_ssl_verify: bool | None = None,
    ssl_verify: bool | str | None = None,
):
    set_config(app_id, verbose, api_url, disable_ssl_verify, ssl_verify)


def get_parent_run_id(parent_run_id: str, run_type: str, app_id: str, run_id: str):
    if parent_run_id == "None":
        parent_run_id = None

    parent_from_ctx = parent_ctx.get().get("message_id") if parent_ctx.get() else None
    if not parent_run_id and parent_from_ctx and run_type != "thread":
        return str(create_uuid_from_string(str(parent_from_ctx) + str(app_id)))

    if parent_run_id:
        return str(create_uuid_from_string(str(parent_run_id) + str(app_id)))

    if parent_run_id is not None:
        return str(create_uuid_from_string(str(parent_run_id) + str(app_id)))


def track_event(
    run_type,
    event_name,
    run_id: str,
    parent_run_id=None,
    name=None,
    input=None,
    output=None,
    message=None,
    error=None,
    token_usage=None,
    user_id=None,
    user_props=None,
    tags=None,
    timestamp=None,
    thread_tags=None,
    feedback=None,
    template_id=None,
    metadata=None,
    params=None,
    runtime=None,
    app_id=None, 
    api_url=None,
    callback_queue=None,
):
    try:
        config = get_config()
        custom_app_id = app_id
        project_id = app_id or config.app_id # used to generate a unique run_id 
        api_url = api_url or config.api_url


        parent_run_id = get_parent_run_id(
            parent_run_id, run_type, app_id=project_id, run_id=run_id
        )
        # We need to generate a UUID that is unique by run_id / project_id pair in case of multiple concurrent callback handler use
        run_id = str(create_uuid_from_string(str(run_id) + str(project_id)))

        event = {
            "event": event_name,
            "type": run_type,
            "name": name,
            "userId": user_id or user_ctx.get(),
            "userProps": user_props or user_props_ctx.get(),
            "tags": tags or tags_ctx.get(),
            "threadTags": thread_tags,
            "runId": run_id,
            "parentRunId": parent_run_id,
            "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
            "message": message,
            "input": input,
            "output": output,
            "error": error,
            "feedback": feedback,
            "runtime": runtime or "lunary-py",
            "tokensUsage": token_usage,
            "metadata": metadata,
            "params": params,
            "templateId": template_id,
            "appId": custom_app_id, # should only be set when a custom app_id is provided, otherwise the app_id is set in consumer.py 
        }

        if callback_queue is not None:
            callback_queue.append(event)
        else:
            queue.append(event)

        if config.verbose:
            try:
                serialized_event = jsonpickle.encode(clean_nones(event), unpicklable=False, indent=4)
                logger.info(
                    f"\nAdd event: {serialized_event}\n"
                )
            except Exception as e:
                logger.warning(f"Could not serialize event: {event}\n {e}")


    except Exception as e:
        logger.exception("Error in `track_event`", e)


def default_stream_handler(fn, run_id, name, type, *args, **kwargs):
    try:
        stream = fn(*args, **kwargs)

        choices = []
        tokens = 0

        for chunk in stream:
            tokens += 1
            if not chunk.choices:
                # Azure
                continue

            choice = chunk.choices[0]
            index = choice.index

            content = choice.delta.content
            role = choice.delta.role
            function_call = choice.delta.function_call
            tool_calls = choice.delta.tool_calls

            if len(choices) <= index:
                choices.append(
                    {
                        "message": {
                            "role": role,
                            "content": content or "",
                            "function_call": {},
                            "tool_calls": [],
                        }
                    }
                )

            if content:
                choices[index]["message"]["content"] += content

            if role:
                choices[index]["message"]["role"] = role

            if hasattr(function_call, "name"):
                choices[index]["message"]["function_call"]["name"] = function_call.name

            if hasattr(function_call, "arguments"):
                choices[index]["message"]["function_call"].setdefault("arguments", "")
                choices[index]["message"]["function_call"][
                    "arguments"
                ] += function_call.arguments

            if isinstance(tool_calls, list):
                for tool_call in tool_calls:
                    existing_call_index = next(
                        (
                            index
                            for (index, tc) in enumerate(
                                choices[index]["message"]["tool_calls"]
                            )
                            if tc.index == tool_call.index
                        ),
                        -1,
                    )

                if existing_call_index == -1:
                    choices[index]["message"]["tool_calls"].append(tool_call)

                else:
                    existing_call = choices[index]["message"]["tool_calls"][
                        existing_call_index
                    ]
                    if hasattr(tool_call, "function") and hasattr(
                        tool_call.function, "arguments"
                    ):
                        existing_call.function.arguments += tool_call.function.arguments

            yield chunk
    finally:
        stream.close()

    output = OpenAIUtils.parse_message(choices[0]["message"])
    track_event(
        type,
        "end",
        run_id,
        name=name,
        output=output,
        token_usage={"completion": tokens, "prompt": None},
    )
    return


async def async_stream_handler(fn, run_id, name, type, *args, **kwargs):
    stream = await fn(*args, **kwargs)

    choices = []
    tokens = 0

    async for chunk in stream:
        tokens += 1
        if not chunk.choices:
            # Happens with Azure
            continue

        choice = chunk.choices[0]
        index = choice.index

        content = choice.delta.content
        role = choice.delta.role
        tool_calls = choice.delta.tool_calls

        if len(choices) <= index:
            choices.append(
                {
                    "message": {
                        "role": role,
                        "content": content or "",
                        "function_call": {},
                        "tool_calls": [],
                    }
                }
            )

        if content:
            choices[index]["message"]["content"] += content

        if role:
            choices[index]["message"]["role"] = role

        if isinstance(tool_calls, list):
            for tool_call in tool_calls:
                existing_call_index = next(
                    (
                        index
                        for (index, tc) in enumerate(
                            choices[index]["message"]["tool_calls"]
                        )
                        if tc.index == tool_call.index
                    ),
                    -1,
                )

            if existing_call_index == -1:
                choices[index]["message"]["tool_calls"].append(tool_call)

            else:
                existing_call = choices[index]["message"]["tool_calls"][
                    existing_call_index
                ]
                if hasattr(tool_call, "function") and hasattr(
                    tool_call.function, "arguments"
                ):
                    existing_call.function.arguments += tool_call.function.arguments

        yield chunk

    output = OpenAIUtils.parse_message(choices[0]["message"])
    track_event(
        type,
        "end",
        run_id,
        name=name,
        output=output,
        token_usage={"completion": tokens, "prompt": None},
    )
    return

def ibm_stream_handler(fn, run_id, name, type, *args, **kwargs):
    try:
        stream = fn(*args, **kwargs)

        content = ""
        tool_call = {} ## TODO: handle multiple tool calls in response
        prompt_tokens = 0
        completion_tokens = 0

        for chunk in stream:
            prompt_tokens = chunk['usage']['prompt_tokens']
            completion_tokens = chunk['usage'].get('completion_tokens', 0)

            delta = chunk['choices'][0]['delta']
            content += delta.get('content', '')

            if 'tool_calls' in delta:
                if delta['tool_calls'][0].get('id'):
                    tool_call['id'] = delta['tool_calls'][0]['id']
                if delta['tool_calls'][0].get('type'):
                    tool_call['type'] = delta['tool_calls'][0]['type']
                if delta['tool_calls'][0].get('function'):
                    if tool_call.get('function') is None:
                        tool_call['function'] = {
                            "name": '',
                            "arguments": ''
                        }
                    tool_call['function']["name"] += delta['tool_calls'][0]['function']['name']
                    tool_call['function']["arguments"] += delta['tool_calls'][0]['function']['arguments']

            yield chunk
    finally:
        stream.close()

    output = {
        "role": "assistant",
        "content": content,
        "tool_calls": [tool_call] if tool_call else None
    } 
    token_usage = {
        "prompt": prompt_tokens,
        "completion": completion_tokens
    }
    track_event(
        type,
        "end",
        run_id,
        name=name,
        output=output,
        token_usage=token_usage
    )
    return


def wrap(
    fn,
    type=None,
    run_id=None,
    name=None,
    user_id=None,
    user_props=None,
    tags=None,
    input_parser=default_input_parser,
    output_parser=default_output_parser,
    app_id=None,
    stream: bool = False,
    stream_handler=default_stream_handler, # TODO: this is not the default, it's only used for OpenAI, so pass it directly in monitor()
):
    def sync_wrapper(*args, **kwargs):
        output = None
        nonlocal stream
        stream = stream or kwargs.get("stream", False)

        parent_run_id = kwargs.pop("parent", run_manager.current_run_id) 
        run = run_manager.start_run(run_id, parent_run_id)

        try:
            try:
                params = filter_params(kwargs)
                metadata = kwargs.pop("metadata", None)
                parsed_input = input_parser(*args, **kwargs)

                track_event(
                    type,
                    "start",
                    run_id=run.id,
                    parent_run_id=parent_run_id,
                    input=parsed_input["input"],
                    name=name or parsed_input["name"],
                    user_id=kwargs.pop("user_id", None)
                    or user_ctx.get()
                    or user_id,
                    user_props=kwargs.pop("user_props", None)
                    or user_props
                    or user_props_ctx.get(),
                    params=params,
                    metadata=metadata,
                    tags=kwargs.pop("tags", None) or tags or tags_ctx.get(),
                    template_id=kwargs.get("extra_headers", {}).get(
                        "Template-Id", None
                    ),
                    app_id=app_id,
                )
            except Exception as e:
                logging.exception(e)

            if stream == True:
                return stream_handler(
                    fn, run.id, name or parsed_input["name"], type, *args, **kwargs
                )

            try:
                output = fn(*args, **kwargs)

            except Exception as e:
                track_event(
                    type,
                    "error",
                    run.id,
                    error={"message": str(e), "stack": traceback.format_exc()},
                    app_id=app_id,
                )

                # rethrow error
                raise e

            try:
                parsed_output = output_parser(output, stream)

                track_event(
                    type,
                    "end",
                    run.id,
                    name=name
                    or parsed_input[
                        "name"
                    ],  # Need name in case need to compute tokens usage server side
                    output=parsed_output["output"],
                    token_usage=parsed_output["tokensUsage"],
                    app_id=app_id
                )
                return output
            except Exception as e:
                logger.exception(e)(e)
            finally:
                return output
        finally:
            run_manager.end_run(run.id)

    return sync_wrapper


def async_wrap(
    fn,
    type=None,
    name=None,
    user_id=None,
    user_props=None,
    tags=None,
    input_parser=default_input_parser,
    output_parser=default_output_parser,
    app_id=None,
    stream: bool = False,
):
    async def wrapper(*args, **kwargs):
        async def async_wrapper(*args, **kwargs):
            output = None

            parent_run_id = kwargs.pop("parent", run_manager.current_run_id) 
            run = run_manager.start_run(parent_run_id=parent_run_id)


            try:
                try:
                    params = filter_params(kwargs)
                    metadata = kwargs.pop("metadata", None)
                    parsed_input = input_parser(*args, **kwargs)

                    track_event(
                        type,
                        "start",
                        run_id=run.id,
                        parent_run_id=parent_run_id,
                        input=parsed_input["input"],
                        name=name or parsed_input["name"],
                        user_id=kwargs.pop("user_id", None)
                        or user_ctx.get()
                        or user_id,
                        user_props=kwargs.pop("user_props", None)
                        or user_props
                        or user_props_ctx.get(),
                        params=params,
                        metadata=metadata,
                        tags=kwargs.pop("tags", None) or tags or tags_ctx.get(),
                        template_id=kwargs.get("extra_headers", {}).get(
                            "Template-Id", None
                        ),
                        app_id=app_id,
                    )
                except Exception as e:
                    logger.exception(e)

                try:
                    output = await fn(*args, **kwargs)

                except Exception as e:
                    track_event(
                        type,
                        "error",
                        run.id,
                        error={"message": str(e), "stack": traceback.format_exc()},
                        app_id=app_id,
                    )

                    # rethrow error
                    raise e

                try:
                    parsed_output = output_parser(output, kwargs.get("stream", False))

                    track_event(
                        type,
                        "end",
                        run.id,
                        name=name
                        or parsed_input[
                            "name"
                        ],  # Need name in case need to compute tokens usage server side
                        output=parsed_output["output"],
                        token_usage=parsed_output["tokensUsage"],
                        app_id=app_id
                    )
                    return output
                except Exception as e:
                    logger.exception(e)(e)
                finally:
                    return output
            finally:
                run_manager.end_run(run.id)

        def async_stream_wrapper(*args, **kwargs):
            parent_run_id = kwargs.pop("parent", run_manager.current_run_id) 
            run = run_manager.start_run(parent_run_id=parent_run_id)

            try:
                try:
                    params = filter_params(kwargs)
                    metadata = kwargs.pop("metadata", None)
                    parsed_input = input_parser(*args, **kwargs)

                    track_event(
                        type,
                        "start",
                        run_id=run.id,
                        parent_run_id=parent_run_id,
                        input=parsed_input["input"],
                        name=name or parsed_input["name"],
                        user_id=kwargs.pop("user_id", None)
                        or user_ctx.get()
                        or user_id,
                        user_props=kwargs.pop("user_props", None)
                        or user_props
                        or user_props_ctx.get(),
                        tags=kwargs.pop("tags", None) or tags or tags_ctx.get(),
                        params=params,
                        metadata=metadata,
                        template_id=kwargs.get("extra_headers", {}).get(
                            "Template-Id", None
                        ),
                        app_id=app_id
                    )
                except Exception as e:
                    logger.exception(e)

                return async_stream_handler(
                    fn, run.id, name or parsed_input["name"], type, *args, **kwargs
                )
            finally:
                run_manager.end_run(run.id)

        nonlocal stream
        stream = stream or kwargs.get("stream", False)
        if stream == True:
            return async_stream_wrapper(*args, **kwargs)
        else:
            return await async_wrapper(*args, **kwargs)

    return wrapper


def monitor(object):
    try:
        package_name = object.__class__.__module__.split(".")[0]

        if package_name == "ibm_watsonx_ai":
            installed_version = importlib.metadata.version("ibm-watsonx-ai")
            if version.parse(installed_version) >= version.parse("1.0.0"):
                model_name= object.model_id.split('/')[1]
                object.chat = wrap(
                    object.chat,
                    "llm",
                    input_parser=IBMUtils.parse_input,
                    output_parser=IBMUtils.parse_output,
                    name=model_name,
                )
                object.chat_stream = wrap(
                    object.chat_stream,
                    "llm",
                    input_parser=IBMUtils.parse_input,
                    output_parser=IBMUtils.parse_output,
                    name=model_name,
                    stream=True,
                    stream_handler=ibm_stream_handler,
                )
                object.achat = async_wrap(
                    object.achat,
                    "llm",
                    input_parser=IBMUtils.parse_input,
                    output_parser=IBMUtils.parse_output,
                    name=model_name,
                )
            else:
                logging.warning("Version 1.0.0 or higher of ibm-watsonx-ai is required")
            return

        if package_name == "openai":    
            installed_version = importlib.metadata.version("openai")
            if version.parse(installed_version) >= version.parse("1.0.0"):
                client_name = getattr(type(object), "__name__", None)
                if client_name == "openai" or client_name == "OpenAI" or client_name == "AzureOpenAI":
                    try:
                        object.chat.completions.create = wrap(
                            object.chat.completions.create,
                            "llm",
                            input_parser=OpenAIUtils.parse_input,
                            output_parser=OpenAIUtils.parse_output,
                        )
                    except Exception as e:
                        logging.info(
                            "Please use `lunary.monitor(openai)` or `lunary.monitor(client)` after setting the OpenAI api key"
                        )
                elif client_name == "AsyncOpenAI" or client_name == "AsyncAzureOpenAI":
                    object.chat.completions.create = async_wrap(
                        object.chat.completions.create,
                        "llm",
                        input_parser=OpenAIUtils.parse_input,
                        output_parser=OpenAIUtils.parse_output,
                    )
                return
    except PackageNotFoundError:
        logging.warning("You need to install either `openai` or `ibm-watsonx-ai` to monitor your LLM calls.")


def agent(name=None, user_id=None, user_props=None, tags=None, app_id=None):
    def decorator(fn):
        return wrap(
            fn,
            "agent",
            name=name or fn.__name__,
            user_id=user_id,
            user_props=user_props,
            tags=tags,
            input_parser=default_input_parser,
            app_id=app_id
        )

    return decorator

def chain(
    name: Optional[str] = None,
    user_id: Optional[str] = None,
    user_props: Optional[dict] = None,
    tags: Optional[list] = None,
    app_id: Optional[str] = None,
    input_arg: Optional[str] = None
):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if input_arg is not None:
                from inspect import signature
                sig = signature(fn)
                param_names = list(sig.parameters.keys())
                
                input_value = None
                
                if input_arg in param_names:
                    arg_index = param_names.index(input_arg)
                    if arg_index < len(args):
                        input_value = args[arg_index]
                
                if input_arg in kwargs:
                    input_value = kwargs[input_arg]
                
                if input_value is None:
                    raise ValueError(f"Specified input argument '{input_arg}' not found in function call")
                
                parsed_input = {"input": input_value}
            else:
                raw_input = default_input_parser(*args, **kwargs)
                parsed_input = {"input": raw_input}
            
            return wrap(
                fn,
                "chain",
                name=name or fn.__name__,
                user_id=user_id,
                user_props=user_props,
                tags=tags,
                input_parser=lambda *a, **kw: parsed_input,
                app_id=app_id
            )(*args, **kwargs)
        
        return wrapper
    return decorator

def class_chain(
    name: Optional[str] = None,
    user_id: Optional[str] = None,
    user_props: Optional[dict] = None,
    tags: Optional[list] = None,
    app_id: Optional[str | Callable] = None,
    input_arg: Optional[str] = None
):
    def decorator(fn):
        @wraps(fn)
        def wrapper(self, *args, **kwargs):
            actual_app_id = app_id(self) if callable(app_id) else app_id

            if input_arg is not None:
                sig = signature(fn)
                param_names = list(sig.parameters.keys())[1:]  # Skip 'self'
                
                input_value = None
                
                if input_arg in param_names:
                    arg_index = param_names.index(input_arg)
                    if arg_index < len(args):
                        input_value = args[arg_index]
                
                if input_arg in kwargs:
                    input_value = kwargs[input_arg]
                
                if input_value is None:
                    raise ValueError(f"Specified input argument '{input_arg}' not found in method call")
                
                parsed_input = {"input": input_value}
                custom_parser = lambda self, *a, **kw: parsed_input
            else:
                custom_parser = lambda self, *a, **kw: {"input": method_input_parser(self, *a, **kw)}

            return wrap(
                fn,
                "chain",
                name=name or fn.__name__,
                user_id=user_id,
                user_props=user_props,
                tags=tags,
                input_parser=custom_parser,
                app_id=actual_app_id
            )(self, *args, **kwargs)
        return wrapper
    return decorator

def tool(name=None, user_id=None, user_props=None, tags=None, app_id=None):
    def decorator(fn):
        return wrap(
            fn,
            "tool",
            name=name or fn.__name__,
            user_id=user_id,
            user_props=user_props,
            tags=tags,
            input_parser=default_input_parser,
            app_id=app_id
        )

    return decorator


try:
    import importlib.metadata
    import logging
    import os
    import traceback
    import warnings
    from contextvars import ContextVar
    from typing import Any, Dict, List, Union, cast, Sequence, Optional, TypedDict
    from uuid import UUID

    import requests
    from langchain_core.agents import AgentFinish
    from langchain_core.callbacks import BaseCallbackHandler
    from langchain_core.messages import BaseMessage, BaseMessageChunk, ToolMessage
    from langchain_core.documents import Document
    from langchain_core.outputs import LLMResult
    from langchain_core.load import dumps
    from packaging.version import parse

    logger = logging.getLogger(__name__)

    DEFAULT_API_URL = "https://api.lunary.ai"

    user_ctx = ContextVar[Union[str, None]]("user_ctx", default=None)
    user_props_ctx = ContextVar[Union[str, None]]("user_props_ctx", default=None)

    spans: Dict[str, Any] = {}

    class UserContextManager:
        """Context manager for Lunary user context."""

        def __init__(self, user_id: str, user_props: Any = None) -> None:
            user_ctx.set(user_id)
            user_props_ctx.set(user_props)

        def __enter__(self) -> Any:
            pass

        def __exit__(self, exc_type: Any, exc_value: Any, exc_tb: Any) -> Any:
            user_ctx.set(None)
            user_props_ctx.set(None)

    def identify(user_id: str, user_props: Any = None) -> UserContextManager:
        """Builds a Lunary UserContextManager

        Parameters:
            - `user_id`: The user id.
            - `user_props`: The user properties.

        Returns:
            A context manager that sets the user context.
        """
        return UserContextManager(user_id, user_props)

    def _serialize(data: Any):
        if not data:
            return None

        if hasattr(data, "messages"):
            return _serialize(data.messages)
        if isinstance(data, BaseMessage) or isinstance(data, BaseMessageChunk):
            return _parse_lc_message(data)
        elif isinstance(data, dict):
            return {key: _serialize(value) for key, value in data.items()}
        elif isinstance(data, list):
            if len(data) == 1:
                return _serialize(data[0])
            else:
                return [_serialize(item) for item in data]
        elif isinstance(data, (str, int, float, bool)):
            return data
        else:
            return dumps(data)

    def _parse_input(raw_input: Any) -> Any:
        serialized = _serialize(raw_input)
        if isinstance(serialized, dict):
            if serialized.get("input"):
                return serialized["input"]

        return serialized

    def _parse_output(raw_output: dict) -> Any:
        serialized = _serialize(raw_output)
        if isinstance(serialized, dict):
            if serialized.get("output"):
                return serialized["output"]

        return serialized

    def _parse_lc_role(
        role: str,
    ) -> str:
        if role == "human":
            return "user"
        elif role == "ai":
            return "assistant"
        else:
            return role

    def _get_user_id(metadata: Any) -> Any:
        if user_ctx.get() is not None:
            return user_ctx.get()

        metadata = metadata or {}
        user_id = metadata.get("user_id")
        return user_id

    def _get_user_props(metadata: Any) -> Any:
        if user_props_ctx.get() is not None:
            return user_props_ctx.get()

        metadata = metadata or {}
        return metadata.get("user_props", None)

    def _parse_tool_call(tool_call: Dict[str, Any]):
        tool_call = {
            "id": tool_call.get("id"),
            "type": "function",
            "function": {
                "name": tool_call.get("name"),
                "arguments": str(tool_call.get("args")),
            },
        }
        return tool_call

    def _parse_tool_message(tool_message: ToolMessage):
        tool_message = {
            "role": "tool",
            "content": getattr(tool_message, "content", None),
            "name": getattr(tool_message, "name", None),
            "tool_call_id": getattr(tool_message, "tool_call_id", None),
        }
        return tool_message

    def _parse_lc_message(message: BaseMessage) -> Dict[str, Any]:
        if message.type == "tool":
            return _parse_tool_message(message)

        parsed = {"content": message.content, "role": _parse_lc_role(message.type)}

        # For tool calls in input
        tool_calls = getattr(message, "tool_calls", None)
        if tool_calls:
            parsed["tool_calls"] = [
                _parse_tool_call(tool_call) for tool_call in tool_calls
            ]

        # For tool calls in output
        keys = ["function_call", "tool_calls", "tool_call_id", "name"]
        parsed.update(
            {
                key: cast(Any, message.additional_kwargs.get(key))
                for key in keys
                if message.additional_kwargs.get(key) is not None
            }
        )

        return parsed

    def _parse_lc_messages(
        messages: Union[List[BaseMessage], Any]
    ) -> List[Dict[str, Any]]:
        return [_parse_lc_message(message) for message in messages]

    class IgnoreRule(TypedDict, total=False):
        type: str
        name: List[str]

    class LunaryCallbackHandler(BaseCallbackHandler):
        """Callback Handler for Lunary`.

        #### Parameters:
            - `app_id`: The app id of the app you want to report to. Defaults to
            `None`, which means that `LUNARY_PUBLIC_KEY` will be used.
            - `api_url`: The url of the Lunary API. Defaults to `None`,
            which means that either `LUNARY_API_URL` environment variable
            or `https://api.lunary.ai` will be used.
            - `ignore`: List of rules to filter out events. Each rule can specify:
                - `type`: The type of event to ignore (e.g., "agent", "tool", "llm", "chain")
                - `name`: List of names to ignore (supports wildcards with *)
                Events matching these rules and their children will not be sent to Lunary.

        #### Raises:
            - `ValueError`: if `app_id` is not provided either as an
            argument or as an environment variable.
            - `ConnectionError`: if the connection to the API fails.


        #### Example:
        ```python
        from langchain_openai.chat_models import ChatOpenAI
        from lunary import LunaryCallbackHandler

        handler = LunaryCallbackHandler(ignore=[
            {"type": "agent", "name": ["ResearchAgent", "DebugAgent"]},
            {"type": "tool", "name": ["search_*", "debug_*"]},
            {"name": ["_internal_*"]}  # Matches any type
        ])
        llm = ChatOpenAI(callbacks=[handler],
                    metadata={"userId": "user-123"})
        llm.predict("Hello, how are you?")
        ```
        """

        __app_id: str
        __api_url: str
        __ignore_rules: List[IgnoreRule]

        def __init__(
            self,
            app_id: Union[str, None] = None,
            api_url: Union[str, None] = None,
            ignore: Union[List[IgnoreRule], None] = None,
        ) -> None:
            super().__init__()
            config = get_config()
            try:
                import lunary

                self.__lunary_version = importlib.metadata.version("lunary")
                self.__track_event = lunary.track_event

            except ImportError:
                logger.warning(
                    """To use the Lunary callback handler you need to 
                    have the `lunary` Python package installed. Please install it 
                    with `pip install lunary`"""
                )
                self.__has_valid_config = False
                return

            if parse(self.__lunary_version) < parse("0.0.32"):
                logger.warning(
                    f"""The installed `lunary` version is
                    {self.__lunary_version}
                    but `LunaryCallbackHandler` requires at least version 0.1.1
                    upgrade `lunary` with `pip install --upgrade lunary`"""
                )
                self.__has_valid_config = False

            self.__has_valid_config = True

            self.__app_id = app_id or config.app_id
            if self.__app_id is None:
                logger.warning(
                    """app_id must be provided either as an argument or 
                    as an environment variable"""
                )
                self.__has_valid_config = False

            self.__api_url = api_url or config.api_url or None
            self.__ignore_rules = ignore or []

            self.queue = queue

            if self.__has_valid_config is False:
                return None

        def _should_ignore_run(self, run_id: str, run_type: str = None, name: str = None) -> bool:
            """
            Check if a run should be ignored based on filtering rules or parent hierarchy.
            Returns True if the run or any of its ancestors should be ignored.
            """
            if not self.__ignore_rules:
                return False
            
            for rule in self.__ignore_rules:
                if "type" in rule and rule["type"] == "agent":
                    rule["type"] = "chain"  # Agents are treated as chains in Lunary
                if "type" in rule and run_type and rule["type"] != run_type:
                    continue
                
                if "name" in rule and isinstance(rule["name"], list):
                    if name and self._matches_any_pattern(name, rule["name"]):
                        return True
            
            run = run_manager.runs.get(str(run_id))
            while run:
                if hasattr(run, '_ignored') and run._ignored:
                    return True
                
                if run.parent_run_id:
                    run = run_manager.runs.get(run.parent_run_id)
                else:
                    break
            
            return False
        
        def _matches_any_pattern(self, name: str, patterns: List[str]) -> bool:
            """Check if name matches any of the patterns (supports * wildcard)."""
            import fnmatch
            for pattern in patterns:
                if fnmatch.fnmatch(name, pattern):
                    return True
            return False

        def on_llm_start(
            self,
            serialized: Dict[str, Any],
            prompts: List[str],
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            tags: Union[List[str], None] = None,
            metadata: Union[Dict[str, Any], None] = None,
            **kwargs: Any,
        ) -> None:
            try:
                if parent_run_id is None:
                    parent_run_id = run_manager.current_run_id
                run = run_manager.start_run(run_id, parent_run_id)
                
                if self._should_ignore_run(run.id, run_type="llm"):
                    self.__track_event(
                        "llm",
                        "start",
                        run_id=run.id,
                        parent_run_id=run.parent_run_id,
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    return 

                user_id = _get_user_id(metadata)
                user_props = _get_user_props(metadata)

                params = kwargs.get("invocation_params", {})
                params.update(
                    serialized.get("kwargs", {})
                )  # Sometimes, for example with ChatAnthropic, `invocation_params` is empty

                name = (
                    metadata.get("model_name") # custom model name 
                    or metadata.get("ls_model_name") # for Azure OpenAI
                    or params.get("model")
                    or params.get("model_name")
                    or params.get("model_id")
                    or params.get("deployment_name")
                    or params.get("azure_deployment")
                )

                if not name and "anthropic" in params.get("_type"):
                    name = "claude-2"

                params = filter_params(params)
                input = _parse_input(prompts)

                self.__track_event(
                    "llm",
                    "start",
                    user_id=user_id,
                    run_id=run.id,
                    parent_run_id=run.parent_run_id,
                    name=name,
                    input=input,
                    tags=tags,
                    metadata=metadata,
                    params=params,
                    user_props=user_props,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_llm_start`: {e}")

        def on_chat_model_start(
            self,
            serialized: Dict[str, Any],
            messages: List[List[BaseMessage]],
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            tags: Union[List[str], None] = None,
            metadata: Union[Dict[str, Any], None] = None,
            **kwargs: Any,
        ) -> Any:
            try:
                if parent_run_id is None:
                    parent_run_id = run_manager.current_run_id
                run = run_manager.start_run(run_id, parent_run_id)
                
                if self._should_ignore_run(run.id, run_type="llm"):
                    self.__track_event(
                        "llm",
                        "start",
                        run_id=run.id,
                        parent_run_id=run.parent_run_id,
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    return

                user_id = _get_user_id(metadata)
                user_props = _get_user_props(metadata)

                params = kwargs.get("invocation_params", {})
                params.update(
                    serialized.get("kwargs", {})
                )  # Sometimes, for example with ChatAnthropic, `invocation_params` is empty

                name = (
                    metadata.get("model_name") # custom model name
                    or metadata.get("ls_model_name") # for Azure OpenAI
                    or params.get("model")
                    or params.get("model_name")
                    or params.get("model_id")
                    or params.get("deployment_name")
                    or params.get("azure_deployment")
                )

                if not name and "anthropic" in params.get("_type"):
                    name = "claude-2"

                params = filter_params(params)
                input = _parse_lc_messages(messages[0])

                self.__track_event(
                    "llm",
                    "start",
                    user_id=user_id,
                    run_id=run.id,
                    parent_run_id=run.parent_run_id,
                    name=name,
                    input=input,
                    tags=tags,
                    metadata=metadata,
                    params=params,
                    user_props=user_props,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_chat_model_start`: {e}")

        def on_llm_end(
            self,
            response: LLMResult,
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            **kwargs: Any,
        ) -> None:
            try:
                if self._should_ignore_run(str(run_id), run_type="llm"):
                    self.__track_event(
                        "llm",
                        "end",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    run_manager.end_run(run_id)
                    return
                    
                run_id = run_manager.end_run(run_id)

                token_usage = (response.llm_output or {}).get("token_usage", {})

                parsed_output: Any = [
                    (
                        _parse_lc_message(generation.message)
                        if hasattr(generation, "message")
                        else generation.text
                    )
                    for generation in response.generations[0]
                ]

                # if it's an array of 1, just parse the first element
                if len(parsed_output) == 1:
                    parsed_output = parsed_output[0]

                self.__track_event(
                    "llm",
                    "end",
                    run_id=run_id,
                    output=parsed_output,
                    token_usage={
                        "prompt": token_usage.get("prompt_tokens"),
                        "completion": token_usage.get("completion_tokens"),
                        "promptCached": token_usage.get("prompt_tokens_details", {}).get("cached_tokens", 0)
                    },
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_llm_end`: {e}")

        def on_tool_start(
            self,
            serialized: Dict[str, Any],
            input_str: str,
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            tags: Union[List[str], None] = None,
            metadata: Union[Dict[str, Any], None] = None,
            **kwargs: Any,
        ) -> None:
            try:
                if parent_run_id is None:
                    parent_run_id = run_manager.current_run_id
                run = run_manager.start_run(run_id, parent_run_id)
                
                if self._should_ignore_run(run.id, run_type="tool", name=serialized.get("name")):
                    self.__track_event(
                        "tool",
                        "start",
                        run_id=run.id,
                        parent_run_id=run.parent_run_id,
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    return

                user_id = _get_user_id(metadata)
                user_props = _get_user_props(metadata)
                name = serialized.get("name")

                self.__track_event(
                    "tool",
                    "start",
                    user_id=user_id,
                    run_id=run.id,
                    parent_run_id=run.parent_run_id,
                    name=name,
                    input=input_str,
                    tags=tags,
                    metadata=metadata,
                    user_props=user_props,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_tool_start`: {e}")

        def on_tool_end(
            self,
            output: str,
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            tags: Union[List[str], None] = None,
            **kwargs: Any,
        ) -> None:
            try:
                if self._should_ignore_run(str(run_id), run_type="tool"):
                    self.__track_event(
                        "tool",
                        "end",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    run_manager.end_run(run_id)
                    return
                    
                run_id = run_manager.end_run(run_id)
                self.__track_event(
                    "tool",
                    "end",
                    run_id=run_id,
                    output=output,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_tool_end`: {e}")

        def on_chain_start(
            self,
            serialized: Dict[str, Any],
            inputs: Dict[str, Any],
            *args,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            tags: Union[List[str], None] = None,
            metadata: Union[Dict[str, Any], None] = None,
            name: Union[str, None] = None,
            **kwargs: Any,
        ) -> Any:
            try:
                if parent_run_id is None:
                    parent_run_id = run_manager.current_run_id
                run = run_manager.start_run(run_id, parent_run_id)

                if name is None and serialized:
                    name = (
                        serialized.get("id", [None, None, None, None])[3]
                        if len(serialized.get("id", [])) > 3
                        else None
                    )

                type = "chain"
                metadata = metadata or {}

                agent_name = metadata.get("agent_name", metadata.get("agentName"))

                if name == "AgentExecutor" or name == "PlanAndExecute" or name == "LangGraph":
                    type = "agent"
                if agent_name is not None:
                    type = "agent"
                    name = agent_name
                if parent_run_id is not None and type != "agent":
                    type = "chain"
                    name = kwargs.get("name", name)

                if self._should_ignore_run(run.id, run_type=type, name=name):
                    run._ignored = True
                    self.__track_event(
                        type,
                        "start",
                        run_id=run.id,
                        parent_run_id=run.parent_run_id,
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    return

                user_id = _get_user_id(metadata)
                user_props = _get_user_props(metadata)
                input = _parse_input(inputs)

                self.__track_event(
                    type,
                    "start",
                    user_id=user_id,
                    run_id=run.id,
                    parent_run_id=run.parent_run_id,
                    name=name,
                    input=input,
                    tags=tags,
                    metadata=metadata,
                    user_props=user_props,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_chain_start`: {e}")

        def on_chain_end(
            self,
            outputs: Dict[str, Any],
            *args,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            **kwargs: Any,
        ) -> Any:
            try:
                if self._should_ignore_run(str(run_id), run_type="chain"):
                    self.__track_event(
                        "chain",
                        "end",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    run_manager.end_run(run_id)
                    return
                    
                run_id = run_manager.end_run(run_id)

                output = _parse_output(outputs)

                self.__track_event(
                    "chain",
                    "end",
                    run_id=run_id,
                    output=output,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_chain_end`: {e}")

        def on_agent_finish(
            self,
            finish: AgentFinish,
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            **kwargs: Any,
        ) -> Any:
            try:
                if self._should_ignore_run(str(run_id), run_type="agent"):
                    self.__track_event(
                        "agent",
                        "end",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    run_manager.end_run(run_id)
                    return
                    
                run_id = run_manager.end_run(run_id)

                output = _parse_output(finish.return_values)

                self.__track_event(
                    "agent",
                    "end",
                    run_id=run_id,
                    output=output,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_agent_finish`: {e}")

        def on_chain_error(
            self,
            error: BaseException,
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            **kwargs: Any,
        ) -> Any:
            try:
                if self._should_ignore_run(str(run_id), run_type="chain"):
                    self.__track_event(
                        "chain",
                        "error",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    run_manager.end_run(run_id)
                    return
                    
                run_id = run_manager.end_run(run_id)

                self.__track_event(
                    "chain",
                    "error",
                    run_id=run_id,
                    error={"message": str(error) or "Unknown error", "stack": traceback.format_exc() or "No stack trace available"},
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_chain_error`: {e}")

        def on_tool_error(
            self,
            error: BaseException,
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            **kwargs: Any,
        ) -> Any:
            try:
                if self._should_ignore_run(str(run_id), run_type="tool"):
                    self.__track_event(
                        "tool",
                        "error",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    run_manager.end_run(run_id)
                    return
                    
                run_id = run_manager.end_run(run_id)

                self.__track_event(
                    "tool",
                    "error",
                    run_id=run_id,
                    error={"message": str(error) or "Unknown error", "stack": traceback.format_exc() or "No stack trace available"},
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_tool_error`: {e}")

        def on_llm_error(
            self,
            error: BaseException,
            *,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            **kwargs: Any,
        ) -> Any:
            try:
                if self._should_ignore_run(str(run_id), run_type="llm"):
                    self.__track_event(
                        "llm",
                        "error",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    run_manager.end_run(run_id)
                    return
                    
                run_id = run_manager.end_run(run_id)

                self.__track_event(
                    "llm",
                    "error",
                    run_id=run_id,
                    error={"message": str(error) or "Unknown error", "stack": traceback.format_exc() or "No stack trace available"},
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_llm_error`: {e}")

        def on_retriever_start(
            self,
            serialized: Dict[str, Any],
            query: str,
            run_id: Optional[UUID] = None,
            parent_run_id: Optional[UUID] = None,
            name: Union[str, None] = None,
            **kwargs: Any,
        ) -> None:
            try:
                if parent_run_id is None:
                    parent_run_id = run_manager.current_run_id
                run = run_manager.start_run(run_id, parent_run_id)
                
                if self._should_ignore_run(run.id, run_type="retriever", name=name or (serialized.get("name") if serialized else None)):
                    self.__track_event(
                        "retriever",
                        "start",
                        run_id=run.id,
                        parent_run_id=run.parent_run_id,
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    return

                user_id = _get_user_id(kwargs.get("metadata"))
                user_props = _get_user_props(kwargs.get("metadata"))

                if name is None and serialized:
                    name = serialized.get("name")

                self.__track_event(
                    "retriever",
                    "start",
                    user_id=user_id,
                    user_props=user_props,
                    run_id=run.id,
                    parent_run_id=run.parent_run_id,
                    name=name,
                    input=query,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_retriever_start`: {e}")

        def on_retriever_end(
            self,
            documents: Sequence[Document],
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            **kwargs: Any,
        ) -> None:
            try:
                if self._should_ignore_run(str(run_id), run_type="retriever"):
                    self.__track_event(
                        "retriever",
                        "end",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    return
                    
                run = run_manager.start_run(run_id, parent_run_id)

                # only report the metadata
                doc_metadata = [
                    (
                        doc.metadata
                        if doc.metadata
                        else {"summary": doc.page_content[:100]}
                    )
                    for doc in documents
                ]

                self.__track_event(
                    "retriever",
                    "end",
                    run_id=run.id,
                    parent_run_id=run.parent_run_id,
                    output=doc_metadata,
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_retriever_end`: {e}")

        def on_retriever_error(
            self,
            error: BaseException,
            run_id: UUID,
            parent_run_id: Union[UUID, None] = None,
            **kwargs: Any,
        ) -> None:
            try:
                if self._should_ignore_run(str(run_id), run_type="retriever"):
                    self.__track_event(
                        "retriever",
                        "error",
                        run_id=str(run_id),
                        input="__NOT_INGESTED__",
                        output="__NOT_INGESTED__",
                        app_id=self.__app_id,
                        api_url=self.__api_url,
                        callback_queue=self.queue,
                        runtime="langchain-py",
                    )
                    run_manager.end_run(run_id)
                    return
                    
                run_id = run_manager.end_run(run_id)

                self.__track_event(
                    "retriever",
                    "error",
                    run_id=run_id,
                    error={"message": str(error) or "Unknown error", "stack": traceback.format_exc() or "No stack trace available"},
                    app_id=self.__app_id,
                    api_url=self.__api_url,
                    callback_queue=self.queue,
                    runtime="langchain-py",
                )
            except Exception as e:
                logger.exception(f"An error occurred in `on_retriever_error`: {e}")

except Exception as e:
    # Do not raise or print error for users that do not have Langchain installed
    pass

def open_thread(id: Optional[str] = None, tags: Optional[List[str]] = None, app_id: str | None = None, user_id: str | None = None, user_props: Any | None = None):
    """
    Opens a new thread or connects to an existing one.

    Args:
        id: Optional thread identifier
        tags: Optional list of tags for the thread
        app_id: Optional app ID override

    Returns:
        Thread object

    Raises:
        ThreadError: If there's any error creating or connecting to the thread
    """
    try:
        config = get_config()
        token = app_id or config.app_id

        if not token:
            raise ThreadError("API token is required")

        return Thread(track_event=track_event, id=id, tags=tags, user_id=user_id, user_props=user_props, app_id=token)
    except Exception as e:
        raise ThreadError(f"Error opening thread: {str(e)}")

def track_feedback(run_id: str, feedback: Dict[str, Any] | Any):
    """
    Tracks feedback for a specific run.

    Args:
        run_id: The ID of the run to track feedback for
        feedback: Feedback data, must be a dictionary

    Raises:
        FeedbackError: If there's any error with the feedback data or tracking
    """
    try:
        if not run_id:
            raise FeedbackError("No message ID provided to track feedback")

        if not isinstance(feedback, dict):
            raise FeedbackError("Invalid feedback provided. Pass a valid dictionary")

        track_event(None, "feedback", run_id=run_id, feedback=feedback)
    except Exception as e:
        raise FeedbackError(f"Error tracking feedback: {str(e)}")


templateCache = {}
def get_raw_template(slug: str, app_id: str | None = None, api_url: str | None = None):
    """
    Fetches the latest version of a template based on a given slug.
    If a cached version is available and recent (less than 60 seconds old), 
    it will return the cached data. Otherwise, it makes an HTTP GET request
    to fetch the template from the specified or default API.

    Parameters:
        slug (str): Unique identifier for the template.
        app_id (str, optional): Application ID for authentication. Defaults to config's app ID.
        api_url (str, optional): API base URL. Defaults to config's API URL.

    Returns:
        dict: JSON response containing template data.
    
    Raises:
        TemplateError: If fetching the template fails.
    """
    try:
        config = get_config()
        token = app_id or config.app_id
        base_url = api_url or config.api_url

        if not token:
            raise TemplateError("No authentication token provided")

        global templateCache
        now = time.time() * 1000
        cache_entry = templateCache.get(slug)

        if cache_entry and now - cache_entry["timestamp"] < 60000:
            return cache_entry["data"]

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{base_url}/v1/template_versions/latest?slug={slug}",
            headers=headers,
            verify=config.ssl_verify,
        )
        
        if response.status_code == 401:
            raise TemplateError("Invalid or unauthorized API credentials")
        
        if not response.ok:
            raise TemplateError(f"Error fetching template: {response.status_code} - {response.text}")

        data = response.json()
        templateCache[slug] = {"timestamp": now, "data": data}
        return data
        
    except requests.exceptions.RequestException as e:
        raise TemplateError(f"Network error while fetching template: {str(e)}")
    except Exception as e:
        raise TemplateError(f"Error fetching template: {str(e)}")

async def get_raw_template_async(slug: str, app_id: str | None = None, api_url: str | None = None):
    """
    Asynchronously fetches the latest version of a template based on a given slug.
    Similar to `get_raw_template`, but uses asynchronous requests.

    Parameters:
        slug (str): Unique identifier for the template.
        app_id (str, optional): Application ID for authentication. Defaults to config's app ID.
        api_url (str, optional): API base URL. Defaults to config's API URL.

    Returns:
        dict: JSON response containing template data.
    
    Raises:
        TemplateError: If fetching the template fails.
    """
    try:
        config = get_config()
        token = app_id or config.app_id
        api_url = api_url or config.api_url



        global templateCache
        now = time.time() * 1000
        cache_entry = templateCache.get(slug)

        if cache_entry and now - cache_entry["timestamp"] < 60000:
            return cache_entry["data"]

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{api_url}/v1/template_versions/latest?slug={slug}",
                headers=headers
            ) as response:
                if not response.ok:
                    raise TemplateError(
                        f"Error fetching template: {response.status} - {await response.text()}"
                    )

                data = await response.json()
                templateCache[slug] = {"timestamp": now, "data": data}
                return data

    except TemplateError:
        raise
    except Exception as e:
        raise TemplateError(f"Error fetching template: {str(e)}")

def render_template(slug: str, data={}, app_id: str | None = None, api_url: str | None = None):
    """
    Renders a template by populating it with the provided data.
    Retrieves the raw template, then uses `chevron.render` to substitute variables.

    Parameters:
        slug (str): Template identifier.
        data (dict): Data for template rendering.
        app_id (str, optional): Application ID for authentication.
        api_url (str, optional): API base URL.

    Returns:
        dict: Rendered template with headers and extra metadata.

    Raises:
        TemplateError: If rendering fails.
    """
    try: 
        raw_template = get_raw_template(slug, app_id, api_url)

        if raw_template.get("message") == "Template not found, is the project ID correct?":
            raise TemplateError("Template not found, are the project ID and slug correct?")

        template_id = copy.deepcopy(raw_template["id"])
        content = copy.deepcopy(raw_template["content"])
        extra = copy.deepcopy(raw_template["extra"])
        text_mode = isinstance(content, str)
        extra_headers = {"Template-Id": str(template_id)}

        if text_mode:
            rendered = chevron.render(content, data)
            return {"text": rendered, "extra_headers": extra_headers, **extra}
        else:
            messages = []
            for message in content:
                message["content"] = chevron.render(message["content"], data)
                messages.append(message)
            return {"messages": messages, "extra_headers": extra_headers, **extra}

    except Exception as e:
        raise TemplateError(f"Error rendering template: {str(e)}")

async def render_template_async(slug: str, data={}, app_id: str | None = None, api_url: str | None = None):
    """
    Asynchronous version of `render_template`, which fetches and renders a template
    using asynchronous requests.

    Parameters:
        slug (str): Template identifier.
        data (dict): Data for template rendering.
        app_id (str, optional): Application ID for authentication.
        api_url (str, optional): API base URL.

    Returns:
        dict: Rendered template with headers and extra metadata.

    Raises:
        TemplateError: If rendering fails.
    """
    try:
        raw_template = await get_raw_template_async(slug, app_id, api_url)

        if raw_template.get("message") == "Template not found, is the project ID correct?":
            raise TemplateError("Template not found, are the project ID and slug correct?")

        template_id = copy.deepcopy(raw_template["id"])
        content = copy.deepcopy(raw_template["content"])
        extra = copy.deepcopy(raw_template["extra"])
        text_mode = isinstance(content, str)
        extra_headers = {"Template-Id": str(template_id)}

        if text_mode:
            rendered = chevron.render(content, data)
            return {"text": rendered, "extra_headers": extra_headers, **extra}
        else:
            messages = []
            for message in content:
                message["content"] = chevron.render(message["content"], data)
                messages.append(message)
            return {"messages": messages, "extra_headers": extra_headers, **extra}

    except Exception as e:
        raise TemplateError(f"Error rendering template: {str(e)}")

def get_langchain_template(slug: str, app_id: str | None = None, api_url: str | None = None):
    """
    Creates a LangChain prompt template from a raw template, converting any double braces.

    Parameters:
        slug (str): Template identifier.
        app_id (str, optional): Application ID for authentication.
        api_url (str, optional): API base URL.

    Returns:
        PromptTemplate or ChatPromptTemplate: Processed LangChain template.

    Raises:
        TemplateError: If creating the LangChain template fails.
    """
    try:
        from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
        
        raw_template = get_raw_template(slug, app_id, api_url)

        if raw_template.get("message") == "Template not found, is the project ID correct?":
            raise TemplateError("Template not found, are the project ID and slug correct?")

        content = copy.deepcopy(raw_template["content"])
        text_mode = isinstance(content, str)

        def replace_double_braces(text):
            return text.replace("{{", "{").replace("}}", "}")

        if text_mode:
            rendered = replace_double_braces(content)
            return PromptTemplate.from_template(rendered)
        else:
            messages = []
            for message in content:
                messages.append(
                    (
                        message["role"].replace("assistant", "ai").replace("user", "human"),
                        replace_double_braces(message["content"]),
                    )
                )
            return ChatPromptTemplate.from_messages(messages)

    except ImportError:
        raise TemplateError("LangChain is required. Install it with: pip install langchain-core")
    except Exception as e:
        raise TemplateError(f"Error creating LangChain template: {str(e)}")

async def get_langchain_template_async(slug: str, app_id: str | None = None, api_url: str | None = None):
    """
    Asynchronous version of `get_langchain_template`, which creates a LangChain prompt
    template using asynchronous requests.

    Parameters:
        slug (str): Template identifier.
        app_id (str, optional): Application ID for authentication.
        api_url (str, optional): API base URL.

    Returns:
        PromptTemplate or ChatPromptTemplate: Processed LangChain template.

    Raises:
        TemplateError: If creating the LangChain template fails.
    """
    try:
        from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
        
        raw_template = await get_raw_template_async(slug, app_id, api_url)

        if raw_template.get("message") == "Template not found, is the project ID correct?":
            raise TemplateError("Template not found, are the project ID and slug correct?")

        content = copy.deepcopy(raw_template["content"])
        text_mode = isinstance(content, str)

        def replace_double_braces(text):
            return text.replace("{{", "{").replace("}}", "}")

        if text_mode:
            rendered = replace_double_braces(content)
            return PromptTemplate.from_template(rendered)
        else:
            messages = []
            for message in content:
                messages.append(
                    (
                        message["role"].replace("assistant", "ai").replace("user", "human"),
                        replace_double_braces(message["content"]),
                    )
                )
            return ChatPromptTemplate.from_messages(messages)

    except ImportError:
        raise TemplateError("LangChain is required. Install it with: pip install langchain-core")
    except Exception as e:
        raise TemplateError(f"Error creating LangChain template: {str(e)}")

def get_live_templates(app_id: str | None = None, api_url: str | None = None):
    """
    Fetches a list of the latest live templates available.

    Parameters:
        app_id (str, optional): Application ID for authentication.
        api_url (str, optional): API base URL.

    Returns:
        list: JSON list of live templates.

    Raises:
        TemplateError: If fetching templates fails.
    """
    try:
        config = get_config()
        token = app_id or config.app_id
        api_url = api_url or config.api_url

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        response = requests.get(
            url=f"{api_url}/v1/templates/latest",
            headers=headers,
            verify=config.ssl_verify,
        )
        
        if not response.ok:
            raise TemplateError(f"Error fetching templates: {response.status_code} - {response.text}")

        return response.json()
    except Exception as e:
        raise TemplateError(f"Error fetching templates: {str(e)}")
    
class DatasetItem:
    def __init__(self, d=None):
        if d is not None:
            for key, value in d.items():
                setattr(self, key, value)

def get_dataset(slug: str, app_id: str | None = None, api_url: str | None = None):
    """
    Fetches a dataset based on the given slug, parsing and returning it as a list of
    DatasetItem objects.

    Parameters:
        slug (str): Dataset identifier.
        app_id (str, optional): Application ID for authentication.
        api_url (str, optional): API base URL.

    Returns:
        list[DatasetItem]: List of dataset items.

    Raises:
        DatasetError: If fetching the dataset fails.
    """
    try:
        config = get_config()
        token = app_id or config.app_id
        api_url = api_url or config.api_url

        url = f"{api_url}/v1/datasets/{slug}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        
        response = requests.get(url, headers=headers, verify=config.ssl_verify)
        if not response.ok:
            raise DatasetError(f"Error fetching dataset: {response.status_code}")

        dataset = response.json()
        dataset = humps.decamelize(dataset)
        items_data = dataset.get("items", [])
        return [DatasetItem(d=item) for item in items_data]

    except Exception as e:
        raise DatasetError(f"Error fetching dataset: {str(e)}")
    
def score(run_id: str, label: str, value: int | float | str | bool, comment: str | None = None, app_id: str | None = None, api_url: str | None = None):
    """
    Scores a run based on the provided label, value, and optional comment.

    Parameters:
        run_id (str): Unique run identifier.
        label (str): Evaluation label.
        value (int | float | str | bool): Evaluation value.
        comment (str, optional): Evaluation comment.

    Raises:
        ScoringError: If scoring fails.
    """
    try:
        config = get_config()
        token = app_id or config.app_id
        api_url = api_url or config.api_url

        url = f"{api_url}/v1/runs/{run_id}/score"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        data = {
            "label": label,
            "value": value,
            **({"comment": comment} if comment else {}),
        }

        response = requests.patch(url, headers=headers, json=data, verify=config.ssl_verify)
        
        if response.status_code == 500:
            error_message = response.json().get("message", "Unknown error")
            raise ScoringError(f"Scoring failed: {error_message}")
        elif not response.ok:
            raise ScoringError(f"Error scoring run: {response.status_code} - {response.text}")

    except Exception as e:
        raise EvaluationError(f"Error scoring run: {str(e)}")


def evaluate(
    checklist,
    input,
    output,
    ideal_output=None,
    context=None,
    model=None,
    duration=None,
    tags=None,
    app_id: str | None = None,
    api_url: str | None = None,
):
    """
    Submits an evaluation run based on provided input, output, and other optional parameters.

    Parameters:
        checklist (list): Evaluation criteria checklist.
        input (Any): Input data for the evaluation.
        output (Any): Output to evaluate.
        ideal_output (Any, optional): Expected ideal output.
        context (Any, optional): Additional evaluation context.
        model (Any, optional): Model used for the evaluation.
        duration (float, optional): Evaluation duration.
        tags (list, optional): Evaluation tags.
        app_id (str, optional): Application ID for authentication.
        api_url (str, optional): API base URL.

    Returns:
        tuple: (passed, results) evaluation status and details.

    Raises:
        EvaluationError: If evaluation fails.
    """
    try:
        config = get_config()
        token = app_id or config.app_id
        api_url = api_url or config.api_url

        url = f"{api_url}/v1/evaluations/run"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        
        data = {
            "checklist": checklist,
            "input": input,
            "output": output,
            **({"idealOutput": ideal_output} if ideal_output else {}),
            **({"context": context} if context else {}),
            **({"model": model} if model else {}),
            **({"duration": duration} if duration else {}),
            **({"tags": tags} if tags else {})
        }

        response = requests.post(url, headers=headers, json=data, verify=config.ssl_verify)
        
        if response.status_code == 500:
            error_message = response.json().get("message", "Unknown error")
            raise EvaluationError(f"Evaluation failed: {error_message}")
        elif not response.ok:
            raise EvaluationError(f"Error running evaluation: {response.status_code} - {response.text}")

        data = humps.decamelize(response.json())
        return data["passed"], data["results"]

    except Exception as e:
        raise EvaluationError(f"Error evaluating result: {str(e)}")


# TODO: use the endpoint, not track_event
def track_feedback(run_id: str, feedback: Dict[str, Any] | Any):
    """
    Tracks feedback for a given run ID, validating the provided feedback.

    Parameters:
        run_id (str): Unique run identifier.
        feedback (dict): Feedback data.

    Raises:
        LunaryError: If tracking feedback fails.
    """
    try:
        if not run_id:
            raise LunaryError("No message ID provided to track feedback")

        if not isinstance(feedback, dict):
            raise LunaryError("Invalid feedback provided. Pass a valid object")

        track_event(None, "feedback", run_id=run_id, feedback=feedback)
    except Exception as e:
        raise LunaryError(f"Error tracking feedback: {str(e)}")
