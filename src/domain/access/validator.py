"""Deterministic access validation. Returns a reason code or None (allowed)."""
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.common.security import verify_pin
from src.domain.models import AccessPermission, Person, Room


@dataclass
class ValidationResult:
    allowed: bool
    reason: str | None = None


def validate(db: Session, *, room: Room | None, person: Person | None, pin: str) -> ValidationResult:
    if room is None:
        return ValidationResult(False, "ROOM_NOT_FOUND")
    if person is None:
        return ValidationResult(False, "PERSON_NOT_FOUND")
    if not room.active:
        return ValidationResult(False, "ROOM_INACTIVE")
    if not person.active:
        return ValidationResult(False, "PERSON_INACTIVE")
    if not verify_pin(pin, room.pin_hash):
        return ValidationResult(False, "INVALID_ROOM_PIN")

    permission = db.scalar(
        select(AccessPermission).where(
            AccessPermission.person_id == person.id,
            AccessPermission.room_id == room.id,
            AccessPermission.active.is_(True),
        )
    )
    if permission is None:
        return ValidationResult(False, "PERSON_HAS_NO_PERMISSION_FOR_ROOM")

    now = datetime.utcnow()
    if permission.valid_from and permission.valid_from > now:
        return ValidationResult(False, "PERMISSION_NOT_YET_VALID")
    if permission.valid_until and permission.valid_until < now:
        return ValidationResult(False, "PERMISSION_EXPIRED")

    return ValidationResult(True)
