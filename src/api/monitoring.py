"""Monitoring endpoints."""
from src.common.db import get_db
from src.domain.monitoring import service as monitoring_service


def summary(app, operation, request, **kwargs):
    with get_db() as db:
        return (monitoring_service.summary(db), 200)


def doors(app, operation, request, **kwargs):
    with get_db() as db:
        return ({"items": monitoring_service.doors(db)}, 200)


def occupancy(app, operation, request, **kwargs):
    with get_db() as db:
        return ({"items": monitoring_service.occupancy(db)}, 200)


def denied_events(app, operation, request, **kwargs):
    with get_db() as db:
        return ({"items": monitoring_service.denied_events(db)}, 200)
