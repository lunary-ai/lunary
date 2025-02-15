# used for reconciliating messages with Langchain: https://lunary.ai/docs/features/chats#reconciliate-with-llm-calls--agents
from contextvars import ContextVar

parent_ctx = ContextVar("parent_ctx", default=None)

class ParentContextManager:
    def __init__(self, message_id: str):
        parent_ctx.set({"message_id": message_id, "retrieved": False})

    def __enter__(self):
        pass

    def __exit__(self, exc_type, exc_value, exc_tb):
        parent_ctx.set(None)


def parent(id: str) -> ParentContextManager:
    return ParentContextManager(id)
