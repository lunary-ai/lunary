from contextvars import ContextVar

project_ctx = ContextVar("project_ctx", default=None)

class ProjectContextManager:
    def __init__(self, project_id: str):
        project_ctx.set(project_id)

    def __enter__(self): 
        pass

    def __exit__(self, exc_type, exc_value, exc_tb): 
        project_ctx.set(None)


def project(project_id: str) -> ProjectContextManager:
    return ProjectContextManager(project_id)

