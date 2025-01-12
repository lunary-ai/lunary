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

def get_parent():
  parent = parent_ctx.get()
  if parent and parent.get("retrieved", False) == False:
    parent_ctx.set({"message_id": parent["message_id"], "retrieved": True})
    return parent.get("message_id", None)
  return None
