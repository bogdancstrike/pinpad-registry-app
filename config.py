"""Top-level config shim.

QF Framework's `create_app` does `app.config.from_object('config.Config')`,
so it must be importable as the top-level module `config`. The real
configuration lives in `src.config`.
"""
from src.config import Config  # noqa: F401
