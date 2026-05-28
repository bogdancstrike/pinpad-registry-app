"""Mock hardware (door) endpoints."""
from src.api._helpers import view_arg
from src.common.db import get_db
from src.domain.hardware import service as door_service


def list_doors(app, operation, request, **kwargs):
    with get_db() as db:
        return ({"items": door_service.list_doors(db)}, 200)


def get_door(app, operation, request, **kwargs):
    with get_db() as db:
        return (door_service.get_door_by_code(db, view_arg(kwargs, "room_code")), 200)


def _action(fn, kwargs):
    with get_db() as db:
        return (fn(db, view_arg(kwargs, "room_code")), 200)


def unlock(app, operation, request, **kwargs):
    return _action(door_service.sim_unlock, kwargs)


def lock(app, operation, request, **kwargs):
    return _action(door_service.sim_lock, kwargs)


def force_open(app, operation, request, **kwargs):
    return _action(door_service.sim_force_open, kwargs)


def sensor_error(app, operation, request, **kwargs):
    return _action(door_service.sim_sensor_error, kwargs)


def offline(app, operation, request, **kwargs):
    return _action(door_service.sim_offline, kwargs)


def online(app, operation, request, **kwargs):
    return _action(door_service.sim_online, kwargs)
