"""Seed demo data: people, rooms (with hashed PINs), permissions, doors.

Idempotent — clears the domain tables, then inserts a known demo set.

Demo codes:
    12340023 -> John Doe enters/exits Server Room
    77770041 -> Maria Popescu enters/exits Archive Room
    24680023 -> denied (John has no permission for Control Room)
    99990023 -> denied (wrong PIN)
    12349999 -> denied (unknown person)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.common.db import get_db  # noqa: E402
from src.common.security import hash_pin  # noqa: E402
from src.domain.models import (  # noqa: E402
    AccessEvent, AccessPermission, MockDoorDevice, Person, Room, RoomPresence,
)

PEOPLE = [
    {"person_code": "0023", "full_name": "John Doe", "department": "IT", "role": "Engineer"},
    {"person_code": "0041", "full_name": "Maria Popescu", "department": "Archive", "role": "Operator"},
    {"person_code": "0099", "full_name": "Security Officer", "department": "Security", "role": "Officer"},
]

ROOMS = [
    {"code": "SERVER_ROOM", "name": "Server Room", "pin": "1234",
     "description": "Restricted infrastructure room"},
    {"code": "ARCHIVE_ROOM", "name": "Archive Room", "pin": "7777",
     "description": "Document archive"},
    {"code": "CONTROL_ROOM", "name": "Control Room", "pin": "2468",
     "description": "Operations control center"},
]

PERMISSIONS = [
    ("0023", "SERVER_ROOM"),
    ("0041", "ARCHIVE_ROOM"),
    ("0099", "SERVER_ROOM"),
    ("0099", "ARCHIVE_ROOM"),
    ("0099", "CONTROL_ROOM"),
]


def run() -> None:
    with get_db() as db:
        # Wipe domain data (respect FK order).
        db.query(AccessEvent).delete()
        db.query(RoomPresence).delete()
        db.query(AccessPermission).delete()
        db.query(MockDoorDevice).delete()
        db.query(Room).delete()
        db.query(Person).delete()
        db.flush()

        people = {}
        for p in PEOPLE:
            person = Person(**p, active=True)
            db.add(person)
            people[p["person_code"]] = person

        rooms = {}
        for r in ROOMS:
            room = Room(
                code=r["code"], name=r["name"], description=r["description"],
                pin_hash=hash_pin(r["pin"]), active=True,
            )
            db.add(room)
            db.flush()
            db.add(MockDoorDevice(room_id=room.id))
            rooms[r["code"]] = room
        db.flush()

        for person_code, room_code in PERMISSIONS:
            db.add(AccessPermission(
                person_id=people[person_code].id,
                room_id=rooms[room_code].id,
                active=True,
            ))

    print("Seed complete.")
    print("  People:", ", ".join(f"{p['person_code']}={p['full_name']}" for p in PEOPLE))
    print("  Rooms :", ", ".join(f"{r['code']} (PIN {r['pin']})" for r in ROOMS))
    print("  Try code 12340023 at /pinpad/SERVER_ROOM")


if __name__ == "__main__":
    run()
