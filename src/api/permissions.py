"""Access permission endpoints."""
from src.api._helpers import payload, view_arg
from src.common.db import get_db
from src.domain.permissions import service as permissions_service


def list_permissions(app, operation, request, **kwargs):
    with get_db() as db:
        return ({"items": permissions_service.list_permissions(db)}, 200)


def create(app, operation, request, **kwargs):
    with get_db() as db:
        return (permissions_service.create_permission(db, payload()), 201)


def delete(app, operation, request, **kwargs):
    with get_db() as db:
        permissions_service.delete_permission(db, view_arg(kwargs, "permission_id"))
        return ("", 204)
