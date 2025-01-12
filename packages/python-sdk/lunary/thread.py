import uuid
from typing import List, TypedDict


class Message(TypedDict, total=False):
    id: str
    role: str
    content: str | None
    is_retry: bool | None
    tags: List[str] | None


class Thread:
    def __init__(
        self,
        track_event,
        user_id: str | None = None,
        user_props: dict | None = None,
        id: str | None = None,
        tags: List[str] | None = None,
        app_id: str | None = None,
        api_url: str | None = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.user_id = user_id
        self.user_props = user_props
        self.tags = tags
        self._track_event = track_event
        self.app_id = app_id
        self.api_url = api_url

    def track_message(
        self, message: Message, user_id=None, user_props=None, feedback=None
    ) -> str:
        run_id = message.get("id", str(uuid.uuid4()))

        self._track_event(
            "thread",
            "chat",
            run_id=run_id,
            user_id=user_id or self.user_id,
            user_props=user_props or self.user_props,
            parent_run_id=self.id,
            thread_tags=self.tags,
            feedback=feedback,
            message=message,
            app_id=self.app_id,
            api_url=self.api_url 
        )
        return run_id

    def track_event(self, event_name: str, user_id: str | None = None, user_props: dict[str, any] | None = None, metadata: dict[str, any] | None = None):
        """
        Track a custom event in the thread.

        Parameters:
        - event_name (str): The name of the event.
        - user_id (str): The user ID associated with the event.
        - metadata (dict): A dictionary of metadata associated with the event.
        """

        self._track_event(
            "thread",
            "custom-event",
            name=event_name,
            run_id=str(uuid.uuid4()),
            user_id=user_id or self.user_id,
            user_props=user_props or self.user_props,
            parent_run_id=self.id,
            thread_tags=self.tags,
            app_id=self.app_id,
            api_url=self.api_url,
            metadata=metadata,
        )
