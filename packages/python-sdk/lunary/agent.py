from contextvars import ContextVar

tags_ctx = ContextVar("tag_ctx", default=None)


class TagsContextManager:
    def __init__(self, tags: [str]):
        tags_ctx.set(tags)

    def __enter__(self):
        pass

    def __exit__(self, exc_type, exc_value, exc_tb):
        tags_ctx.set(None)


def tags(tags: [str]) -> TagsContextManager:
    return TagsContextManager(tags)
