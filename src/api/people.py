"""People CRUD endpoints."""
from src.api._helpers import payload, view_arg
from src.common.db import get_db
from src.domain.people import service as people_service


def list_people(app, operation, request, **kwargs):
    with get_db() as db:
        return ({"items": people_service.list_people(db)}, 200)


def create(app, operation, request, **kwargs):
    with get_db() as db:
        return (people_service.create_person(db, payload()), 201)


def get_person(app, operation, request, **kwargs):
    with get_db() as db:
        return (people_service.get_person(db, view_arg(kwargs, "person_id")), 200)


def update(app, operation, request, **kwargs):
    with get_db() as db:
        return (people_service.update_person(db, view_arg(kwargs, "person_id"), payload()), 200)


def delete(app, operation, request, **kwargs):
    with get_db() as db:
        people_service.delete_person(db, view_arg(kwargs, "person_id"))
        return ("", 204)
