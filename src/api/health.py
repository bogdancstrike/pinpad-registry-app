"""Liveness / readiness / health endpoints."""
from sqlalchemy import text

from src.common.db import get_engine


def liveness(app, operation, request, **kwargs):
    return ({"status": "alive"}, 200)


def readiness(app, operation, request, **kwargs):
    return ({"status": "ready"}, 200)


def health_check(app, operation, request, **kwargs):
    checks = {}
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
        status = "ok"
    except Exception as e:  # noqa: BLE001
        checks["database"] = f"error: {e}"
        status = "degraded"
    return ({"status": status, "checks": checks}, 200)
