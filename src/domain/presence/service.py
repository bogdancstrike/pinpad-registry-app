"""Room presence tracking — decides ENTER vs EXIT and maintains state."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.models import Person, Room, RoomPresence


def _active(db: Session, person_id, room_id) -> RoomPresence | None:
    return db.scalar(
        select(RoomPresence).where(
            RoomPresence.person_id == person_id,
            RoomPresence.room_id == room_id,
            RoomPresence.active.is_(True),
        )
    )


def resolve_event_type(db: Session, person_id, room_id) -> str:
    return "EXIT" if _active(db, person_id, room_id) else "ENTER"


def mark_entered(db: Session, person_id, room_id) -> RoomPresence:
    presence = RoomPresence(person_id=person_id, room_id=room_id, active=True)
    db.add(presence)
    db.flush()
    return presence


def mark_exited(db: Session, person_id, room_id) -> RoomPresence | None:
    presence = _active(db, person_id, room_id)
    if presence:
        presence.active = False
        presence.exited_at = datetime.utcnow()
        db.flush()
    return presence


def current_occupancy(db: Session) -> list[dict]:
    rows = (
        db.execute(
            select(RoomPresence, Person, Room)
            .join(Person, Person.id == RoomPresence.person_id)
            .join(Room, Room.id == RoomPresence.room_id)
            .where(RoomPresence.active.is_(True))
            .order_by(RoomPresence.entered_at.desc())
        )
        .all()
    )
    return [
        {
            "personCode": person.person_code,
            "personName": person.full_name,
            "roomCode": room.code,
            "roomName": room.name,
            "enteredAt": presence.entered_at.isoformat() if presence.entered_at else None,
        }
        for presence, person, room in rows
    ]
