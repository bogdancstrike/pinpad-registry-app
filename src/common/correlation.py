"""Per-request correlation ID + CORS headers, wired onto the QF Flask app."""
import contextvars
import uuid
from typing import Optional

_correlation_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "correlation_id", default=None
)


def new_correlation_id() -> str:
    return str(uuid.uuid4())


def set_correlation_id(value: Optional[str]) -> None:
    _correlation_id.set(value)


def get_correlation_id() -> Optional[str]:
    return _correlation_id.get()


def install_flask_hooks(app) -> None:
    """Wire before/after request hooks for correlation IDs and CORS."""
    from flask import g, make_response, request

    from src.config import Config

    def _allowed_origin() -> str | None:
        origin = request.headers.get("Origin")
        if not origin:
            return None
        if "*" in Config.ALLOWED_ORIGINS or origin in Config.ALLOWED_ORIGINS:
            return origin
        return None

    def _add_cors_headers(response):
        origin = _allowed_origin()
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, X-Correlation-Id"
            )
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response.headers["Access-Control-Max-Age"] = "600"
        return response

    @app.before_request
    def _before():
        cid = request.headers.get("X-Correlation-Id") or new_correlation_id()
        set_correlation_id(cid)
        g.correlation_id = cid
        if request.method == "OPTIONS":
            return _add_cors_headers(make_response(("", 204)))

    @app.after_request
    def _after(response):
        cid = get_correlation_id()
        if cid:
            response.headers["X-Correlation-Id"] = cid
        return _add_cors_headers(response)

    @app.teardown_request
    def _teardown(_exc):
        set_correlation_id(None)
