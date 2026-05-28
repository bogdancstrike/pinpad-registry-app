"""Append-only registry / audit events + query helpers."""
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.common.security import mask_entered_code
from src.domain.models import AccessEvent, Person, Room


def register_granted(db: Session, *, room: Room, person: Person, event_type: str,
                     entered_code: str, door_state_before: dict, door_state_after: dict) -> AccessEvent:
    event = AccessEvent(
        person_id=person.id,
        room_id=room.id,
        event_type=event_type,
        decision="GRANTED",
        reason=None,
        raw_code_masked=mask_entered_code(entered_code),
        door_state_before=door_state_before,
        door_state_after=door_state_after,
    )
    db.add(event)
    db.flush()
    return event


def register_denied(db: Session, *, room: Room | None, person: Person | None,
                    entered_code: str, reason: str, door_state_before: dict | None = None) -> AccessEvent:
    event = AccessEvent(
        person_id=person.id if person else None,
        room_id=room.id if room else None,
        event_type="DENIED",
        decision="DENIED",
        reason=reason,
        raw_code_masked=mask_entered_code(entered_code),
        door_state_before=door_state_before,
        door_state_after=None,
    )
    db.add(event)
    db.flush()
    return event


def register_error(db: Session, *, room: Room | None, person: Person | None,
                   entered_code: str, reason: str, door_state_before: dict | None = None) -> AccessEvent:
    event = AccessEvent(
        person_id=person.id if person else None,
        room_id=room.id if room else None,
        event_type="SYSTEM_ERROR",
        decision="ERROR",
        reason=reason,
        raw_code_masked=mask_entered_code(entered_code),
        door_state_before=door_state_before,
        door_state_after=None,
    )
    db.add(event)
    db.flush()
    return event


def _serialize(event: AccessEvent, person: Person | None, room: Room | None) -> dict:
    return {
        "id": str(event.id),
        "createdAt": event.created_at.isoformat() if event.created_at else None,
        "eventType": event.event_type,
        "decision": event.decision,
        "reason": event.reason,
        "rawCodeMasked": event.raw_code_masked,
        "personCode": person.person_code if person else None,
        "personName": person.full_name if person else None,
        "roomCode": room.code if room else None,
        "roomName": room.name if room else None,
        "doorStateBefore": event.door_state_before,
        "doorStateAfter": event.door_state_after,
    }


def list_events(db: Session, *, room_code: str | None = None, person_code: str | None = None,
                event_type: str | None = None, decision: str | None = None,
                date_from: str | None = None, date_to: str | None = None,
                page: int = 1, size: int = 25) -> dict:
    stmt = (
        select(AccessEvent, Person, Room)
        .outerjoin(Person, Person.id == AccessEvent.person_id)
        .outerjoin(Room, Room.id == AccessEvent.room_id)
    )
    count_stmt = select(func.count()).select_from(AccessEvent).outerjoin(
        Room, Room.id == AccessEvent.room_id
    ).outerjoin(Person, Person.id == AccessEvent.person_id)

    conditions = []
    if room_code:
        conditions.append(Room.code == room_code)
    if person_code:
        conditions.append(Person.person_code == person_code)
    if event_type:
        conditions.append(AccessEvent.event_type == event_type)
    if decision:
        conditions.append(AccessEvent.decision == decision)
    if date_from:
        conditions.append(AccessEvent.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        conditions.append(AccessEvent.created_at <= datetime.fromisoformat(date_to))

    for cond in conditions:
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    total = db.scalar(count_stmt) or 0
    size = max(1, min(int(size), 200))
    page = max(1, int(page))
    stmt = stmt.order_by(AccessEvent.created_at.desc()).limit(size).offset((page - 1) * size)

    items = [_serialize(ev, person, room) for ev, person, room in db.execute(stmt).all()]
    return {"items": items, "total": total, "page": page, "size": size}
