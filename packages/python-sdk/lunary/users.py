from contextvars import ContextVar

user_ctx = ContextVar("user_ctx", default=None)
user_props_ctx = ContextVar("user_props_ctx", default=None)

class UserContextManager:
    def __init__(self, user_id: str, user_props = None):
        user_ctx.set(user_id)
        user_props_ctx.set(user_props)

    def __enter__(self): 
        pass

    def __exit__(self, exc_type, exc_value, exc_tb): 
        user_ctx.set(None)
        user_props_ctx.set(None)


def identify(user_id: str, user_props = None) -> UserContextManager:
    return UserContextManager(user_id, user_props)