"""Access attempt orchestration — the critical business flow.

Splits the composed code, validates, mocks the door unlock, determines
ENTER/EXIT, updates presence, and writes a registry event. The whole flow
runs inside the caller's transaction (get_db commits on return).
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.common.errors import HardwareError
from src.common.spans import span
from src.domain.access import parser, validator
from src.domain.hardware import service as door_service
from src.domain.models import Person, Room
from src.domain.presence import service as presence_service
from src.domain.registry import service as registry_service


def _denied(reason: str, event) -> dict:
    return {
        "decision": "DENIED",
        "eventType": "DENIED",
        "reason": reason,
        "message": "Access denied.",
        "eventId": str(event.id),
    }


def execute(db: Session, payload: dict) -> dict:
    room_code = payload.get("roomCode")
    entered_code = payload.get("enteredCode", "") or ""

    with span("access.attempt", **{"access.room_code": room_code}) as root:
        # Parsing failures are recorded as denied events when we can resolve a room.
        with span("access.parse"):
            pin, person_code = parser.parse(entered_code)
        set_root_person(root, person_code)

        # Lock the room row to serialize concurrent attempts for the same room.
        room = db.scalar(select(Room).where(Room.code == room_code).with_for_update())
        person = db.scalar(select(Person).where(Person.person_code == person_code))

        with span("access.validate") as vs:
            result = validator.validate(db, room=room, person=person, pin=pin)
            vs.set_attribute("access.allowed", result.allowed)
            if result.reason:
                vs.set_attribute("access.reason", result.reason)

        if not result.allowed:
            root.set_attribute("access.decision", "DENIED")
            root.set_attribute("access.reason", result.reason)
            event = registry_service.register_denied(
                db, room=room, person=person, entered_code=entered_code, reason=result.reason
            )
            return _denied(result.reason, event)

        door_before = door_service.get_state(db, room.id)
        try:
            with span("access.door_unlock", **{"access.room_code": room.code}):
                door_after = door_service.unlock(db, room.id)
        except HardwareError as exc:
            reason = exc.details.get("reason", "HARDWARE_ERROR")
            root.set_attribute("access.decision", "ERROR")
            root.set_attribute("access.reason", reason)
            event = registry_service.register_error(
                db, room=room, person=person, entered_code=entered_code,
                reason=reason, door_state_before=door_before,
            )
            return {
                "decision": "ERROR",
                "eventType": "SYSTEM_ERROR",
                "reason": reason,
                "message": exc.message,
                "eventId": str(event.id),
                "door": door_before,
            }

        with span("access.presence") as ps:
            event_type = presence_service.resolve_event_type(db, person.id, room.id)
            ps.set_attribute("access.event_type", event_type)
            if event_type == "ENTER":
                presence_service.mark_entered(db, person.id, room.id)
            else:
                presence_service.mark_exited(db, person.id, room.id)

        with span("access.registry_write"):
            event = registry_service.register_granted(
                db, room=room, person=person, event_type=event_type, entered_code=entered_code,
                door_state_before=door_before, door_state_after=door_after,
            )

        root.set_attribute("access.decision", "GRANTED")
        root.set_attribute("access.event_type", event_type)

        return {
            "decision": "GRANTED",
            "eventType": event_type,
            "message": f"Access granted. {event_type} registered.",
            "person": {"code": person.person_code, "fullName": person.full_name},
            "room": {"code": room.code, "name": room.name},
            "eventId": str(event.id),
            "door": door_after,
        }


def set_root_person(root, person_code: str) -> None:
    if person_code:
        root.set_attribute("access.person_code", person_code)
