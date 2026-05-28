"""Access permission management."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.common.errors import ConflictError, NotFoundError, ValidationError
from src.domain.models import AccessPermission, Person, Room


def _parse_dt(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def serialize(perm: AccessPermission, person: Person, room: Room) -> dict:
    return {
        "id": str(perm.id),
        "personId": str(perm.person_id),
        "roomId": str(perm.room_id),
        "personCode": person.person_code,
        "personName": person.full_name,
        "roomCode": room.code,
        "roomName": room.name,
        "validFrom": perm.valid_from.isoformat() if perm.valid_from else None,
        "validUntil": perm.valid_until.isoformat() if perm.valid_until else None,
        "active": perm.active,
        "createdAt": perm.created_at.isoformat() if perm.created_at else None,
    }


def list_permissions(db: Session) -> list[dict]:
    rows = db.execute(
        select(AccessPermission, Person, Room)
        .join(Person, Person.id == AccessPermission.person_id)
        .join(Room, Room.id == AccessPermission.room_id)
        .order_by(Person.full_name)
    ).all()
    return [serialize(perm, person, room) for perm, person, room in rows]


def create_permission(db: Session, payload: dict) -> dict:
    person_id = payload.get("personId")
    room_id = payload.get("roomId")
    if not person_id or not room_id:
        raise ValidationError("personId and roomId are required")

    person = db.get(Person, person_id)
    room = db.get(Room, room_id)
    if person is None:
        raise NotFoundError("Person not found")
    if room is None:
        raise NotFoundError("Room not found")
    if db.scalar(
        select(AccessPermission).where(
            AccessPermission.person_id == person_id,
            AccessPermission.room_id == room_id,
        )
    ):
        raise ConflictError("permission already exists for this person and room")

    perm = AccessPermission(
        person_id=person_id,
        room_id=room_id,
        valid_from=_parse_dt(payload.get("validFrom")),
        valid_until=_parse_dt(payload.get("validUntil")),
        active=payload.get("active", True),
    )
    db.add(perm)
    db.flush()
    return serialize(perm, person, room)


def delete_permission(db: Session, permission_id) -> None:
    perm = db.get(AccessPermission, permission_id)
    if perm is None:
        raise NotFoundError("Permission not found")
    db.delete(perm)
