"""Monitoring aggregates for the dashboard."""
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.domain.hardware import service as door_service
from src.domain.models import (
    AccessEvent, MockDoorDevice, Person, Room, RoomPresence,
)
from src.domain.presence import service as presence_service


def summary(db: Session) -> dict:
    today = datetime.utcnow().date()
    start_of_day = datetime(today.year, today.month, today.day)

    total_rooms = db.scalar(select(func.count()).select_from(Room)) or 0
    active_people = db.scalar(
        select(func.count()).select_from(Person).where(Person.active.is_(True))
    ) or 0
    currently_inside = db.scalar(
        select(func.count()).select_from(RoomPresence).where(RoomPresence.active.is_(True))
    ) or 0
    granted_today = db.scalar(
        select(func.count()).select_from(AccessEvent).where(
            AccessEvent.decision == "GRANTED", AccessEvent.created_at >= start_of_day
        )
    ) or 0
    denied_today = db.scalar(
        select(func.count()).select_from(AccessEvent).where(
            AccessEvent.decision == "DENIED", AccessEvent.created_at >= start_of_day
        )
    ) or 0
    doors_offline = db.scalar(
        select(func.count()).select_from(MockDoorDevice).where(
            MockDoorDevice.controller_online.is_(False)
        )
    ) or 0

    return {
        "totalRooms": total_rooms,
        "activePeople": active_people,
        "currentlyInside": currently_inside,
        "grantedToday": granted_today,
        "deniedToday": denied_today,
        "doorsOffline": doors_offline,
    }


def doors(db: Session) -> list[dict]:
    return door_service.list_doors(db)


def occupancy(db: Session) -> list[dict]:
    return presence_service.current_occupancy(db)


def denied_events(db: Session, limit: int = 20) -> list[dict]:
    cutoff = datetime.utcnow() - timedelta(days=7)
    rows = db.execute(
        select(AccessEvent, Person, Room)
        .outerjoin(Person, Person.id == AccessEvent.person_id)
        .outerjoin(Room, Room.id == AccessEvent.room_id)
        .where(AccessEvent.decision.in_(["DENIED", "ERROR"]))
        .where(AccessEvent.created_at >= cutoff)
        .order_by(AccessEvent.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": str(ev.id),
            "createdAt": ev.created_at.isoformat() if ev.created_at else None,
            "reason": ev.reason,
            "decision": ev.decision,
            "rawCodeMasked": ev.raw_code_masked,
            "personName": person.full_name if person else None,
            "roomCode": room.code if room else None,
            "roomName": room.name if room else None,
        }
        for ev, person, room in rows
    ]
