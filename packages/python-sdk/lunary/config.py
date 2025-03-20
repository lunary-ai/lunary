import os
import threading

DEFAULT_API_URL = "https://api.lunary.ai"

class Config:
    _instance = None
    _lock = threading.Lock()  

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance.__init__(*args, **kwargs)
        return cls._instance

    def __init__(self, app_id: str | None = None, verbose: bool | None = None, api_url: str | None = None, disable_ssl_verify: bool | None = None):
        if not hasattr(self, 'initialized'):
            self.app_id = (app_id or
                           os.environ.get("LUNARY_PRIVATE_KEY") or
                           os.environ.get("LUNARY_PUBLIC_KEY") or
                           os.getenv("LUNARY_APP_ID"))
            self.verbose = verbose if verbose is not None else os.getenv('LUNARY_VERBOSE') is not None 
            self.api_url = api_url or os.getenv("LUNARY_API_URL") or DEFAULT_API_URL
            self.ssl_verify = not (disable_ssl_verify if disable_ssl_verify is not None else (True if os.environ.get("DISABLE_SSL_VERIFY") == "True" else False))
            self.initialized = True
      
    def __repr__(self):
        return (f"Config(app_id={self.app_id!r}, verbose={self.verbose!r}, "
                f"api_url={self.api_url!r}, ssl_verify={self.ssl_verify!r})")

config = Config()

def get_config() -> Config:
    return config

def set_config(app_id: str | None = None, verbose: bool | None = None, api_url: str | None = None, disable_ssl_verify: bool = False, ssl_verify: bool | str | None = None) -> None:
    if ssl_verify is None and disable_ssl_verify is True:
        ssl_verify = False

    if ssl_verify is None:
        ssl_verify = True

    config.app_id = app_id or config.app_id
    config.verbose = verbose if verbose is not None else config.verbose
    config.api_url = api_url or config.api_url
    config.ssl_verify = ssl_verify 

