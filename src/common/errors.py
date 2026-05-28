"""Domain exception hierarchy and Flask error mapping."""
from typing import Any, Optional


class PinpadError(Exception):
    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str = "", *, details: Optional[dict[str, Any]] = None):
        super().__init__(message or self.code)
        self.message = message or self.code
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        out = {"error": self.code, "message": self.message}
        if self.details:
            out["details"] = self.details
        return out


class ValidationError(PinpadError):
    status_code = 422
    code = "validation_error"


class NotFoundError(PinpadError):
    status_code = 404
    code = "not_found"


class ConflictError(PinpadError):
    status_code = 409
    code = "conflict"


class HardwareError(PinpadError):
    status_code = 409
    code = "hardware_error"


def install_flask_error_handlers(app) -> None:
    from flask import jsonify

    @app.errorhandler(PinpadError)
    def _handle(err: PinpadError):
        resp = jsonify(err.to_dict())
        resp.status_code = err.status_code
        return resp
