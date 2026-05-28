"""Rooms CRUD endpoints."""
from src.api._helpers import payload, view_arg
from src.common.db import get_db
from src.domain.rooms import service as rooms_service


def list_rooms(app, operation, request, **kwargs):
    with get_db() as db:
        return ({"items": rooms_service.list_rooms(db)}, 200)


def create(app, operation, request, **kwargs):
    with get_db() as db:
        return (rooms_service.create_room(db, payload()), 201)


def get_room(app, operation, request, **kwargs):
    with get_db() as db:
        return (rooms_service.get_room(db, view_arg(kwargs, "room_id")), 200)


def update(app, operation, request, **kwargs):
    with get_db() as db:
        return (rooms_service.update_room(db, view_arg(kwargs, "room_id"), payload()), 200)


def delete(app, operation, request, **kwargs):
    with get_db() as db:
        rooms_service.delete_room(db, view_arg(kwargs, "room_id"))
        return ("", 204)


def pinpad_hints(app, operation, request, **kwargs):
    with get_db() as db:
        return (rooms_service.pinpad_hints(db, view_arg(kwargs, "room_code")), 200)
