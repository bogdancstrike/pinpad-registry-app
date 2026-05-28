"""Registry / audit query endpoints."""
from src.api._helpers import query, view_arg
from src.common.db import get_db
from src.domain.presence import service as presence_service
from src.domain.registry import service as registry_service


def list_events(app, operation, request, **kwargs):
    q = query()
    with get_db() as db:
        return (registry_service.list_events(
            db,
            room_code=q.get("roomCode"),
            person_code=q.get("personCode"),
            event_type=q.get("eventType"),
            decision=q.get("decision"),
            date_from=q.get("from"),
            date_to=q.get("to"),
            page=int(q.get("page", 1)),
            size=int(q.get("size", 25)),
        ), 200)


def presence(app, operation, request, **kwargs):
    with get_db() as db:
        return ({"items": presence_service.current_occupancy(db)}, 200)


def by_room(app, operation, request, **kwargs):
    q = query()
    with get_db() as db:
        return (registry_service.list_events(
            db, room_code=view_arg(kwargs, "room_code"),
            page=int(q.get("page", 1)), size=int(q.get("size", 25)),
        ), 200)


def by_person(app, operation, request, **kwargs):
    q = query()
    with get_db() as db:
        return (registry_service.list_events(
            db, person_code=view_arg(kwargs, "person_code"),
            page=int(q.get("page", 1)), size=int(q.get("size", 25)),
        ), 200)
