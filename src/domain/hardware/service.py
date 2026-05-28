"""Mock door hardware: state stored in DB, manipulated by these functions."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.common.errors import HardwareError, NotFoundError
from src.domain.models import MockDoorDevice, Room

FATAL_STATES = {"SENSOR_ERROR", "FORCED_OPEN"}


def serialize(door: MockDoorDevice) -> dict:
    return {
        "roomId": str(door.room_id),
        "state": door.state,
        "locked": door.locked,
        "doorOpen": door.door_open,
        "controllerOnline": door.controller_online,
        "lastUnlockAt": door.last_unlock_at.isoformat() if door.last_unlock_at else None,
        "lastLockAt": door.last_lock_at.isoformat() if door.last_lock_at else None,
    }


def _get(db: Session, room_id) -> MockDoorDevice:
    door = db.scalar(select(MockDoorDevice).where(MockDoorDevice.room_id == room_id))
    if door is None:
        raise NotFoundError("Door device not found")
    return door


def _get_by_room_code(db: Session, room_code: str) -> MockDoorDevice:
    room = db.scalar(select(Room).where(Room.code == room_code))
    if room is None:
        raise NotFoundError("Room not found")
    return _get(db, room.id)


def get_state(db: Session, room_id) -> dict:
    return serialize(_get(db, room_id))


def unlock(db: Session, room_id) -> dict:
    door = _get(db, room_id)
    if not door.controller_online:
        raise HardwareError("Door controller is offline",
                            details={"reason": "DOOR_CONTROLLER_OFFLINE"})
    if door.state == "SENSOR_ERROR":
        raise HardwareError("Door sensor error", details={"reason": "DOOR_SENSOR_ERROR"})
    door.locked = False
    door.state = "UNLOCKED"
    door.last_unlock_at = datetime.utcnow()
    db.flush()
    return serialize(door)


def lock(db: Session, room_id) -> dict:
    door = _get(db, room_id)
    door.locked = True
    door.door_open = False
    door.state = "LOCKED"
    door.last_lock_at = datetime.utcnow()
    db.flush()
    return serialize(door)


# ── Manual simulator actions (by room code) ───────────────────────────────
def sim_unlock(db: Session, room_code: str) -> dict:
    return unlock(db, _get_by_room_code(db, room_code).room_id)


def sim_lock(db: Session, room_code: str) -> dict:
    return lock(db, _get_by_room_code(db, room_code).room_id)


def sim_force_open(db: Session, room_code: str) -> dict:
    door = _get_by_room_code(db, room_code)
    door.door_open = True
    door.locked = False
    door.state = "FORCED_OPEN"
    db.flush()
    return serialize(door)


def sim_sensor_error(db: Session, room_code: str) -> dict:
    door = _get_by_room_code(db, room_code)
    door.state = "SENSOR_ERROR"
    db.flush()
    return serialize(door)


def sim_offline(db: Session, room_code: str) -> dict:
    door = _get_by_room_code(db, room_code)
    door.controller_online = False
    door.state = "OFFLINE"
    db.flush()
    return serialize(door)


def sim_online(db: Session, room_code: str) -> dict:
    door = _get_by_room_code(db, room_code)
    door.controller_online = True
    door.state = "LOCKED" if door.locked else "UNLOCKED"
    db.flush()
    return serialize(door)


def list_doors(db: Session) -> list[dict]:
    rows = db.scalars(select(MockDoorDevice).join(Room).order_by(Room.name)).all()
    out = []
    for door in rows:
        data = serialize(door)
        data["roomCode"] = door.room.code
        data["roomName"] = door.room.name
        out.append(data)
    return out


def get_door_by_code(db: Session, room_code: str) -> dict:
    door = _get_by_room_code(db, room_code)
    data = serialize(door)
    data["roomCode"] = door.room.code
    data["roomName"] = door.room.name
    return data
