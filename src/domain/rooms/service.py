"""Rooms CRUD. PINs are hashed before storage; a mock door is auto-created."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.common.errors import ConflictError, NotFoundError, ValidationError
from src.common.security import hash_pin
from src.config import Config
from src.domain.models import AccessPermission, MockDoorDevice, Person, Room


def serialize(r: Room) -> dict:
    return {
        "id": str(r.id),
        "code": r.code,
        "name": r.name,
        "description": r.description,
        "active": r.active,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
    }


def list_rooms(db: Session) -> list[dict]:
    rows = db.scalars(select(Room).order_by(Room.name)).all()
    return [serialize(r) for r in rows]


def get_room(db: Session, room_id) -> dict:
    r = db.get(Room, room_id)
    if r is None:
        raise NotFoundError("Room not found")
    return serialize(r)


def _validate_pin(pin: str) -> str:
    pin = (pin or "").strip()
    if len(pin) != Config.PIN_LENGTH or not pin.isdigit():
        raise ValidationError(f"PIN must be {Config.PIN_LENGTH} digits")
    return pin


def create_room(db: Session, payload: dict) -> dict:
    code = (payload.get("code") or "").strip()
    name = (payload.get("name") or "").strip()
    if not code or not name:
        raise ValidationError("code and name are required")
    pin = _validate_pin(payload.get("pin", ""))
    if db.scalar(select(Room).where(Room.code == code)):
        raise ConflictError("room code already exists")

    room = Room(
        code=code,
        name=name,
        description=payload.get("description"),
        pin_hash=hash_pin(pin),
        demo_pin=pin,
        active=payload.get("active", True),
    )
    db.add(room)
    db.flush()
    # Every room gets a mock door controller.
    db.add(MockDoorDevice(room_id=room.id))
    db.flush()
    return serialize(room)


def update_room(db: Session, room_id, payload: dict) -> dict:
    room = db.get(Room, room_id)
    if room is None:
        raise NotFoundError("Room not found")
    if "name" in payload:
        room.name = payload["name"]
    if "description" in payload:
        room.description = payload["description"]
    if "active" in payload:
        room.active = bool(payload["active"])
    if payload.get("pin"):
        pin = _validate_pin(payload["pin"])
        room.pin_hash = hash_pin(pin)
        room.demo_pin = pin
    db.flush()
    return serialize(room)


def pinpad_hints(db: Session, room_code: str) -> dict:
    """PoC helper: room name/PIN + the people allowed in, for the demo keypad."""
    room = db.scalar(select(Room).where(Room.code == room_code))
    if room is None:
        raise NotFoundError("Room not found")
    rows = db.execute(
        select(Person)
        .join(AccessPermission, AccessPermission.person_id == Person.id)
        .where(AccessPermission.room_id == room.id, AccessPermission.active.is_(True))
        .order_by(Person.full_name)
    ).scalars().all()
    return {
        "roomCode": room.code,
        "roomName": room.name,
        "active": room.active,
        "pin": room.demo_pin,
        "people": [
            {"personCode": p.person_code, "fullName": p.full_name, "active": p.active}
            for p in rows
        ],
    }


def delete_room(db: Session, room_id) -> None:
    room = db.get(Room, room_id)
    if room is None:
        raise NotFoundError("Room not found")
    db.delete(room)
