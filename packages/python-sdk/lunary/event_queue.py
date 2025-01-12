import threading
from .consumer import Consumer
from contextvars import ContextVar

class EventQueue:
    def __init__(self):
        self.lock = threading.Lock()
        self.events = []
        self.consumer = Consumer(self)
        self.consumer.start()

    def append(self, event):
        with self.lock:
            if isinstance(event, list):
                self.events.extend(event)
            else:
                self.events.append(event)

    def get_batch(self):
        if self.lock.acquire(False): # non-blocking
            try:
                events = self.events
                self.events = []
                return events
            finally:
                self.lock.release()
        else:
            return []
