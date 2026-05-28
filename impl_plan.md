# Impl_Plan.md — Implementation Plan for PIN-Based Room Access Registry Simulator

## 1. Objective

Implement a demonstrative room access-control system using:

```text
Backend: Python + qf-framework
Frontend: React + TypeScript
Database: PostgreSQL
Deployment: Docker Compose
Hardware: mocked pinpad and mocked door controller
```

The system should allow an employee to enter a composed code such as:

```text
12340023
```

Where:

```text
1234 = room PIN
0023 = person code
```

The backend validates the request, mocks the door unlock, determines ENTER or EXIT, and automatically writes a digital registry event.

---

## 2. Deliverables

The final PoC should contain:

```text
backend/
frontend/
docker-compose.yml
README.md
architecture.md
impl_plan.md
```

Functional deliverables:

- Backend API.
- qf-framework dynamic endpoint configuration.
- PostgreSQL schema/migrations.
- Seed data.
- React admin UI.
- React pinpad UI.
- Mock hardware simulator.
- Registry/audit view.
- Monitoring dashboard.
- Docker Compose deployment.

---

## 3. Implementation Phases

```text
Phase 0: Project setup
Phase 1: Backend foundation
Phase 2: Database model and migrations
Phase 3: Admin CRUD APIs
Phase 4: Access attempt flow
Phase 5: Mock hardware flow
Phase 6: Registry and monitoring APIs
Phase 7: React frontend foundation
Phase 8: Admin pages
Phase 9: Pinpad and hardware simulator pages
Phase 10: Demo seed data and polish
Phase 11: Testing
Phase 12: Docker Compose delivery
```

---

## 4. Phase 0 — Project Setup

### 4.1 Repository Structure

Create:

```text
access-registry-simulator/
  backend/
  frontend/
  docs/
  docker-compose.yml
  README.md
```

Backend structure:

```text
backend/
  app.py
  config.py
  requirements.txt
  Dockerfile

  maps/
    endpoint.json

  domain/
    people/
      model.py
      repository.py
      service.py
      schema.py

    rooms/
      model.py
      repository.py
      service.py
      schema.py

    permissions/
      model.py
      repository.py
      service.py
      schema.py

    access/
      service.py
      validator.py
      parser.py
      dto.py

    presence/
      model.py
      repository.py
      service.py

    registry/
      model.py
      repository.py
      service.py

    hardware/
      model.py
      repository.py
      mock_door_service.py

    monitoring/
      service.py

  infrastructure/
    db.py
    security.py
    exceptions.py
    response.py
    unit_of_work.py

  migrations/
  scripts/
    seed.py
```

Frontend structure:

```text
frontend/
  package.json
  vite.config.ts
  Dockerfile
  nginx.conf

  src/
    api/
    components/
    pages/
    types/
    App.tsx
    main.tsx
```

---

## 5. Phase 1 — Backend Foundation

### 5.1 Backend Dependencies

Use Python 3.12.

Suggested `requirements.txt`:

```text
flask
flask-restx
flask-cors
sqlalchemy
psycopg2-binary
alembic
python-dotenv
bcrypt
pydantic
gunicorn
```

If qf-framework is installed locally or as an internal package, include it according to your environment.

Example:

```text
qf-framework
```

or local editable install:

```text
-e ./qf-framework
```

---

### 5.2 Config

Create `config.py`:

```python
import os


class Config:
    APP_NAME = os.getenv("APP_NAME", "access-registry-backend")
    ENV = os.getenv("ENV", "dev")

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://access_user:access_pass@localhost:5432/access_registry"
    )

    PIN_LENGTH = int(os.getenv("PIN_LENGTH", "4"))
    PERSON_CODE_LENGTH = int(os.getenv("PERSON_CODE_LENGTH", "4"))
    FULL_CODE_LENGTH = PIN_LENGTH + PERSON_CODE_LENGTH

    DOOR_UNLOCK_SECONDS = int(os.getenv("DOOR_UNLOCK_SECONDS", "5"))

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
```

---

### 5.3 Flask/qf-framework App Bootstrap

Create `app.py`:

```python
from flask import Flask
from flask_cors import CORS

from config import Config
from infrastructure.db import init_db
# from framework.dynamic import register_dynamic_endpoints


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})

    init_db(app)

    # register_dynamic_endpoints(app, "maps/endpoint.json")

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

Actual qf-framework registration should use your existing dynamic endpoint mechanism.

---

## 6. Phase 2 — Database Model and Migrations

### 6.1 SQLAlchemy Base

Create `infrastructure/db.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker, declarative_base
from config import Config

engine = create_engine(
    Config.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
)

SessionLocal = scoped_session(
    sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )
)

Base = declarative_base()


def init_db(app):
    @app.teardown_appcontext
    def remove_session(exception=None):
        SessionLocal.remove()
```

---

### 6.2 Models

#### Person model

```python
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from infrastructure.db import Base


class Person(Base):
    __tablename__ = "people"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_code = Column(String(20), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    department = Column(String(255))
    role = Column(String(100))
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
```

#### Room model

```python
import uuid
from sqlalchemy import Column, String, Boolean, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from infrastructure.db import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    pin_hash = Column(String(255), nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
```

#### AccessPermission model

```python
import uuid
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from infrastructure.db import Base


class AccessPermission(Base):
    __tablename__ = "access_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("people.id"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False)
    valid_from = Column(DateTime)
    valid_until = Column(DateTime)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("person_id", "room_id", name="uq_permission_person_room"),
    )
```

#### RoomPresence model

```python
import uuid
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from infrastructure.db import Base


class RoomPresence(Base):
    __tablename__ = "room_presence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("people.id"), nullable=False)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False)
    entered_at = Column(DateTime, server_default=func.now(), nullable=False)
    exited_at = Column(DateTime)
    active = Column(Boolean, default=True, nullable=False)
```

Add partial unique index in Alembic migration:

```python
op.create_index(
    "ux_active_presence_person_room",
    "room_presence",
    ["person_id", "room_id"],
    unique=True,
    postgresql_where=sa.text("active = true")
)
```

#### AccessEvent model

```python
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from infrastructure.db import Base


class AccessEvent(Base):
    __tablename__ = "access_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("people.id"), nullable=True)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=True)
    event_type = Column(String(30), nullable=False)
    decision = Column(String(30), nullable=False)
    reason = Column(String(255))
    raw_code_masked = Column(String(50))
    door_state_before = Column(JSONB)
    door_state_after = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
```

#### MockDoorDevice model

```python
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from infrastructure.db import Base


class MockDoorDevice(Base):
    __tablename__ = "mock_door_devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id"), unique=True, nullable=False)
    state = Column(String(50), default="LOCKED", nullable=False)
    locked = Column(Boolean, default=True, nullable=False)
    door_open = Column(Boolean, default=False, nullable=False)
    controller_online = Column(Boolean, default=True, nullable=False)
    last_unlock_at = Column(DateTime)
    last_lock_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
```

---

## 7. Phase 3 — Repositories

Create repository classes to isolate SQLAlchemy access.

Example `PeopleRepository`:

```python
from infrastructure.db import SessionLocal
from domain.people.model import Person


class PeopleRepository:
    def find_by_code(self, person_code: str) -> Person | None:
        return (
            SessionLocal.query(Person)
            .filter(Person.person_code == person_code)
            .one_or_none()
        )

    def list_all(self) -> list[Person]:
        return SessionLocal.query(Person).order_by(Person.full_name.asc()).all()

    def save(self, person: Person) -> Person:
        SessionLocal.add(person)
        SessionLocal.flush()
        return person
```

Example `RoomsRepository`:

```python
from infrastructure.db import SessionLocal
from domain.rooms.model import Room


class RoomsRepository:
    def find_by_code(self, code: str) -> Room | None:
        return (
            SessionLocal.query(Room)
            .filter(Room.code == code)
            .one_or_none()
        )

    def find_by_code_for_update(self, code: str) -> Room | None:
        return (
            SessionLocal.query(Room)
            .filter(Room.code == code)
            .with_for_update()
            .one_or_none()
        )

    def save(self, room: Room) -> Room:
        SessionLocal.add(room)
        SessionLocal.flush()
        return room
```

---

## 8. Phase 4 — Security Utilities

Create `infrastructure/security.py`:

```python
import bcrypt


def hash_pin(pin: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pin.encode("utf-8"), salt).decode("utf-8")


def verify_pin(pin: str, pin_hash: str) -> bool:
    return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))


def mask_entered_code(entered_code: str, person_code_length: int = 4) -> str:
    if not entered_code:
        return ""

    if len(entered_code) <= person_code_length:
        return "*" * len(entered_code)

    visible_suffix = entered_code[-person_code_length:]
    return "*" * (len(entered_code) - person_code_length) + visible_suffix
```

---

## 9. Phase 5 — PIN Parser

Create `domain/access/parser.py`:

```python
from config import Config
from infrastructure.exceptions import ValidationException


class PinCodeParser:
    def parse(self, entered_code: str) -> tuple[str, str]:
        if entered_code is None:
            raise ValidationException("INVALID_CODE_FORMAT")

        normalized = entered_code.strip()

        if not normalized.isdigit():
            raise ValidationException("INVALID_CODE_FORMAT")

        if len(normalized) != Config.FULL_CODE_LENGTH:
            raise ValidationException("INVALID_CODE_LENGTH")

        pin = normalized[:Config.PIN_LENGTH]
        person_code = normalized[Config.PIN_LENGTH:]

        return pin, person_code
```

---

## 10. Phase 6 — Access Validator

Create `domain/access/validator.py`:

```python
from dataclasses import dataclass
from datetime import datetime

from infrastructure.security import verify_pin


@dataclass
class ValidationResult:
    allowed: bool
    reason: str | None = None


class AccessValidator:
    def __init__(self, permissions_repo):
        self.permissions_repo = permissions_repo

    def validate(self, *, room, person, pin: str) -> ValidationResult:
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

        permission = self.permissions_repo.find_active_permission(
            person_id=person.id,
            room_id=room.id
        )

        if permission is None:
            return ValidationResult(False, "PERSON_HAS_NO_PERMISSION_FOR_ROOM")

        now = datetime.utcnow()

        if permission.valid_from and permission.valid_from > now:
            return ValidationResult(False, "PERMISSION_NOT_YET_VALID")

        if permission.valid_until and permission.valid_until < now:
            return ValidationResult(False, "PERMISSION_EXPIRED")

        return ValidationResult(True)
```

---

## 11. Phase 7 — Mock Door Service

Create `domain/hardware/mock_door_service.py`:

```python
from datetime import datetime

from infrastructure.exceptions import HardwareException


class MockDoorService:
    def __init__(self, door_repo):
        self.door_repo = door_repo

    def get_state(self, room_id) -> dict:
        door = self.door_repo.find_by_room_id(room_id)

        if door is None:
            return {
                "state": "MISSING",
                "locked": True,
                "doorOpen": False,
                "controllerOnline": False
            }

        return self.to_dict(door)

    def unlock(self, room_id) -> dict:
        door = self.door_repo.find_by_room_id_for_update(room_id)

        if door is None:
            raise HardwareException("DOOR_DEVICE_NOT_FOUND")

        if not door.controller_online:
            raise HardwareException("DOOR_CONTROLLER_OFFLINE")

        if door.state == "SENSOR_ERROR":
            raise HardwareException("DOOR_SENSOR_ERROR")

        door.locked = False
        door.state = "UNLOCKED"
        door.last_unlock_at = datetime.utcnow()

        self.door_repo.save(door)

        return self.to_dict(door)

    def lock(self, room_id) -> dict:
        door = self.door_repo.find_by_room_id_for_update(room_id)

        if door is None:
            raise HardwareException("DOOR_DEVICE_NOT_FOUND")

        door.locked = True
        door.state = "LOCKED"
        door.last_lock_at = datetime.utcnow()

        self.door_repo.save(door)

        return self.to_dict(door)

    def set_offline(self, room_id) -> dict:
        door = self.door_repo.find_by_room_id_for_update(room_id)
        door.controller_online = False
        door.state = "OFFLINE"
        self.door_repo.save(door)
        return self.to_dict(door)

    def set_online(self, room_id) -> dict:
        door = self.door_repo.find_by_room_id_for_update(room_id)
        door.controller_online = True
        door.state = "LOCKED" if door.locked else "UNLOCKED"
        self.door_repo.save(door)
        return self.to_dict(door)

    @staticmethod
    def to_dict(door) -> dict:
        return {
            "state": door.state,
            "locked": door.locked,
            "doorOpen": door.door_open,
            "controllerOnline": door.controller_online,
            "lastUnlockAt": door.last_unlock_at.isoformat() if door.last_unlock_at else None,
            "lastLockAt": door.last_lock_at.isoformat() if door.last_lock_at else None,
        }
```

---

## 12. Phase 8 — Presence Service

Create `domain/presence/service.py`:

```python
from datetime import datetime


class PresenceService:
    def __init__(self, presence_repo):
        self.presence_repo = presence_repo

    def resolve_event_type(self, *, person_id, room_id) -> str:
        active_presence = self.presence_repo.find_active_for_update(
            person_id=person_id,
            room_id=room_id
        )

        return "EXIT" if active_presence else "ENTER"

    def mark_entered(self, *, person_id, room_id):
        return self.presence_repo.create_active(
            person_id=person_id,
            room_id=room_id
        )

    def mark_exited(self, *, person_id, room_id):
        active_presence = self.presence_repo.find_active_for_update(
            person_id=person_id,
            room_id=room_id
        )

        if active_presence:
            active_presence.active = False
            active_presence.exited_at = datetime.utcnow()
            self.presence_repo.save(active_presence)

        return active_presence
```

---

## 13. Phase 9 — Registry Service

Create `domain/registry/service.py`:

```python
from domain.registry.model import AccessEvent
from infrastructure.db import SessionLocal
from infrastructure.security import mask_entered_code


class RegistryService:
    def register_granted(
        self,
        *,
        room,
        person,
        event_type: str,
        entered_code: str,
        door_state_before: dict,
        door_state_after: dict,
    ) -> AccessEvent:
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

        SessionLocal.add(event)
        SessionLocal.flush()

        return event

    def register_denied(
        self,
        *,
        room=None,
        person=None,
        entered_code: str,
        reason: str,
        door_state_before: dict | None = None,
    ) -> AccessEvent:
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

        SessionLocal.add(event)
        SessionLocal.flush()

        return event
```

---

## 14. Phase 10 — Access Service

Create `domain/access/service.py`:

```python
from infrastructure.db import SessionLocal
from infrastructure.exceptions import ValidationException, HardwareException


class AccessService:
    def __init__(
        self,
        parser,
        people_repo,
        rooms_repo,
        validator,
        door_service,
        presence_service,
        registry_service,
    ):
        self.parser = parser
        self.people_repo = people_repo
        self.rooms_repo = rooms_repo
        self.validator = validator
        self.door_service = door_service
        self.presence_service = presence_service
        self.registry_service = registry_service

    def execute(self, payload: dict) -> dict:
        room_code = payload.get("roomCode")
        entered_code = payload.get("enteredCode", "")

        try:
            pin, person_code = self.parser.parse(entered_code)

            room = self.rooms_repo.find_by_code_for_update(room_code)
            person = self.people_repo.find_by_code(person_code)

            validation = self.validator.validate(
                room=room,
                person=person,
                pin=pin
            )

            if not validation.allowed:
                event = self.registry_service.register_denied(
                    room=room,
                    person=person,
                    entered_code=entered_code,
                    reason=validation.reason
                )
                SessionLocal.commit()
                return self._denied_response(validation.reason, event)

            door_before = self.door_service.get_state(room.id)
            door_after = self.door_service.unlock(room.id)

            event_type = self.presence_service.resolve_event_type(
                person_id=person.id,
                room_id=room.id
            )

            if event_type == "ENTER":
                self.presence_service.mark_entered(
                    person_id=person.id,
                    room_id=room.id
                )
            else:
                self.presence_service.mark_exited(
                    person_id=person.id,
                    room_id=room.id
                )

            event = self.registry_service.register_granted(
                room=room,
                person=person,
                event_type=event_type,
                entered_code=entered_code,
                door_state_before=door_before,
                door_state_after=door_after,
            )

            SessionLocal.commit()

            return {
                "decision": "GRANTED",
                "eventType": event_type,
                "message": f"Access granted. {event_type} registered.",
                "person": {
                    "code": person.person_code,
                    "fullName": person.full_name,
                },
                "room": {
                    "code": room.code,
                    "name": room.name,
                },
                "eventId": str(event.id),
                "door": door_after,
            }

        except ValidationException as exc:
            SessionLocal.rollback()
            return {
                "decision": "DENIED",
                "eventType": "DENIED",
                "reason": str(exc),
                "message": "Access denied.",
            }

        except HardwareException as exc:
            SessionLocal.rollback()

            # Optional: write hardware error event in a new transaction.
            return {
                "decision": "ERROR",
                "eventType": "SYSTEM_ERROR",
                "reason": str(exc),
                "message": "Door hardware error.",
            }

        except Exception:
            SessionLocal.rollback()
            raise

    @staticmethod
    def _denied_response(reason: str, event) -> dict:
        return {
            "decision": "DENIED",
            "eventType": "DENIED",
            "reason": reason,
            "message": "Access denied.",
            "eventId": str(event.id),
        }
```

---

## 15. Phase 11 — qf-framework Endpoint Configuration

Create `maps/endpoint.json`:

```json
{
  "endpoints": [
    {
      "name": "access_attempt",
      "route": "/api/access/attempt",
      "methods": ["POST"],
      "service": "domain.access.service.AccessService",
      "request_model": {
        "roomCode": "string",
        "enteredCode": "string"
      }
    },
    {
      "name": "people",
      "route": "/api/people",
      "methods": ["GET", "POST"],
      "service": "domain.people.service.PeopleService",
      "request_model": {
        "person_code": "string",
        "full_name": "string",
        "department": "string",
        "role": "string",
        "active": "boolean"
      }
    },
    {
      "name": "rooms",
      "route": "/api/rooms",
      "methods": ["GET", "POST"],
      "service": "domain.rooms.service.RoomService",
      "request_model": {
        "code": "string",
        "name": "string",
        "description": "string",
        "pin": "string",
        "active": "boolean"
      }
    },
    {
      "name": "registry_events",
      "route": "/api/registry/events",
      "methods": ["GET"],
      "service": "domain.registry.query_service.RegistryQueryService"
    },
    {
      "name": "monitoring_summary",
      "route": "/api/monitoring/summary",
      "methods": ["GET"],
      "service": "domain.monitoring.service.MonitoringService"
    }
  ]
}
```

Adjust this based on the exact service invocation contract of your qf-framework dynamic router.

---

## 16. Phase 12 — React Frontend Setup

Create frontend:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios @tanstack/react-query react-router-dom react-hook-form zod
npm install @mui/material @emotion/react @emotion/styled
```

---

## 17. Frontend API Client

Create `src/api/client.ts`:

```typescript
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});
```

Create `src/api/accessApi.ts`:

```typescript
import { apiClient } from "./client";

export interface AccessAttemptRequest {
  roomCode: string;
  enteredCode: string;
}

export async function submitAccessAttempt(payload: AccessAttemptRequest) {
  const response = await apiClient.post("/api/access/attempt", payload);
  return response.data;
}
```

---

## 18. Pinpad Page

Create `src/pages/PinpadPage.tsx`:

```tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { submitAccessAttempt } from "../api/accessApi";

export function PinpadPage() {
  const { roomCode } = useParams();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);

  const appendDigit = (digit: string) => {
    if (code.length < 8) {
      setCode((prev) => prev + digit);
    }
  };

  const clear = () => {
    setCode("");
    setResult(null);
  };

  const submit = async () => {
    if (!roomCode) return;

    const response = await submitAccessAttempt({
      roomCode,
      enteredCode: code,
    });

    setResult(response);
    setCode("");
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", textAlign: "center" }}>
      <h1>Room Pinpad</h1>
      <h2>{roomCode}</h2>

      <div
        style={{
          border: "1px solid #ccc",
          padding: 16,
          fontSize: 32,
          marginBottom: 20,
        }}
      >
        {"*".repeat(code.length)}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button key={digit} onClick={() => appendDigit(digit)}>
            {digit}
          </button>
        ))}

        <button onClick={clear}>C</button>
        <button onClick={() => appendDigit("0")}>0</button>
        <button onClick={submit}>OK</button>
      </div>

      {result && (
        <div style={{ marginTop: 24 }}>
          <h3>{result.decision}</h3>
          <p>{result.message}</p>
          {result.reason && <p>Reason: {result.reason}</p>}
          {result.eventType && <p>Event: {result.eventType}</p>}
        </div>
      )}
    </div>
  );
}
```

---

## 19. Admin Pages

Implement pages in this order:

```text
DashboardPage
PeoplePage
RoomsPage
PermissionsPage
RegistryPage
MonitoringPage
DoorSimulatorPage
PinpadPage
```

### 19.1 People Page

Features:

- List people.
- Create person.
- Edit person.
- Activate/deactivate person.
- Search by code/name.

Columns:

```text
Person Code
Full Name
Department
Role
Active
Actions
```

### 19.2 Rooms Page

Features:

- List rooms.
- Create room.
- Edit room.
- Change PIN.
- Activate/deactivate room.

Columns:

```text
Code
Name
Description
Active
Actions
```

### 19.3 Permissions Page

Features:

- Assign person to room.
- Set valid from/until.
- Disable permission.

Columns:

```text
Person
Room
Valid From
Valid Until
Active
Actions
```

### 19.4 Registry Page

Features:

- List access events.
- Filter by room.
- Filter by person.
- Filter by event type.
- Filter by decision.
- Filter by date interval.

Columns:

```text
Created At
Person
Room
Event Type
Decision
Reason
Masked Code
Door Before
Door After
```

### 19.5 Monitoring Page

Features:

- Summary cards.
- Currently inside.
- Door states.
- Recent denied attempts.

Cards:

```text
Total Rooms
Active People
Currently Inside
Granted Today
Denied Today
Doors Offline
```

### 19.6 Door Simulator Page

Features:

- List door devices.
- Lock/unlock.
- Set offline/online.
- Force open.
- Sensor error.

---

## 20. Frontend Routing

Create `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PinpadPage } from "./pages/PinpadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PeoplePage } from "./pages/PeoplePage";
import { RoomsPage } from "./pages/RoomsPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { RegistryPage } from "./pages/RegistryPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { DoorSimulatorPage } from "./pages/DoorSimulatorPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/permissions" element={<PermissionsPage />} />
        <Route path="/registry" element={<RegistryPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/hardware" element={<DoorSimulatorPage />} />
        <Route path="/pinpad/:roomCode" element={<PinpadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 21. Seed Data

Create `backend/scripts/seed.py`.

Seed people:

```text
0023 - John Doe - IT Engineer
0041 - Maria Popescu - Archive Operator
0099 - Security Officer - Security
```

Seed rooms:

```text
SERVER_ROOM - PIN 1234
ARCHIVE_ROOM - PIN 7777
CONTROL_ROOM - PIN 2468
```

Seed permissions:

```text
John Doe -> SERVER_ROOM
Maria Popescu -> ARCHIVE_ROOM
Security Officer -> SERVER_ROOM
Security Officer -> ARCHIVE_ROOM
Security Officer -> CONTROL_ROOM
```

Seed mock doors:

```text
One mock_door_device per room.
Initial state: LOCKED.
controller_online: true.
```

Demo codes:

```text
12340023 -> John enters/exits Server Room
77770041 -> Maria enters/exits Archive Room
24680023 -> denied, John has no permission for Control Room
99990023 -> denied, wrong PIN
12349999 -> denied, unknown person
```

---

## 22. Docker Compose

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: access_registry_postgres
    environment:
      POSTGRES_DB: access_registry
      POSTGRES_USER: access_user
      POSTGRES_PASSWORD: access_pass
    ports:
      - "5432:5432"
    volumes:
      - access_registry_pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    container_name: access_registry_backend
    environment:
      DATABASE_URL: postgresql+psycopg2://access_user:access_pass@postgres:5432/access_registry
      CORS_ORIGINS: "*"
      PIN_LENGTH: "4"
      PERSON_CODE_LENGTH: "4"
      DOOR_UNLOCK_SECONDS: "5"
    ports:
      - "5000:5000"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    container_name: access_registry_frontend
    environment:
      VITE_API_BASE_URL: http://localhost:5000
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  access_registry_pgdata:
```

---

## 23. Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
```

---

## 24. Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
```

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;

    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

---

## 25. Testing Plan

### 25.1 Backend Unit Tests

Test:

```text
PIN parser
PIN hashing/verification
Code masking
Access validator
Presence service
Registry service
Mock door service
```

Example cases:

```text
parse 12340023 -> 1234, 0023
parse abc -> INVALID_CODE_FORMAT
parse 123 -> INVALID_CODE_LENGTH
mask 12340023 -> ****0023
wrong PIN -> INVALID_ROOM_PIN
inactive person -> PERSON_INACTIVE
no permission -> PERSON_HAS_NO_PERMISSION_FOR_ROOM
```

### 25.2 Backend Integration Tests

Test full access flow:

```text
valid code creates ENTER event
same valid code again creates EXIT event
wrong PIN creates DENIED event
unknown person creates DENIED event
door offline returns ERROR or DENIED hardware reason
```

### 25.3 Frontend Tests

Minimum:

```text
Pinpad appends digits
Clear button clears code
OK submits code
Granted result is displayed
Denied result is displayed
```

---

## 26. Acceptance Criteria

The PoC is complete when:

```text
1. Admin can create people.
2. Admin can create rooms with PIN.
3. Admin can assign room permissions.
4. User can open /pinpad/SERVER_ROOM.
5. User can enter 12340023.
6. Backend validates the code.
7. Door state changes to UNLOCKED.
8. Registry records ENTER.
9. Same code again records EXIT.
10. Wrong code records DENIED.
11. Registry page displays all events.
12. Monitoring page displays summary.
13. Door simulator can set a door offline.
14. Access attempt fails when door is offline.
15. Project runs with docker compose up.
```

---

## 27. Suggested Development Order

Build in this exact order:

```text
1. Backend app boots.
2. DB connection works.
3. Models and migrations are created.
4. Seed script works.
5. People CRUD works.
6. Rooms CRUD works with PIN hashing.
7. Permissions CRUD works.
8. Access parser works.
9. Access validator works.
10. Registry service writes events.
11. Presence service handles ENTER/EXIT.
12. Mock door service unlocks/locks.
13. /api/access/attempt works.
14. Registry query API works.
15. Monitoring summary API works.
16. React app boots.
17. Pinpad page works.
18. Registry page works.
19. Door simulator page works.
20. Admin CRUD pages work.
21. Docker Compose works.
22. README/demo script is written.
```

---

## 28. Demo Runbook

Start:

```bash
docker compose up --build
```

Open:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000
```

Demo sequence:

```text
1. Go to /dashboard.
2. Show rooms and current statistics.
3. Go to /people and show seeded users.
4. Go to /rooms and show room PIN configuration.
5. Go to /permissions and show John -> Server Room.
6. Go to /pinpad/SERVER_ROOM.
7. Enter 12340023.
8. Show ACCESS GRANTED, ENTER.
9. Go to /registry.
10. Show ENTER event.
11. Go back to /pinpad/SERVER_ROOM.
12. Enter 12340023 again.
13. Show ACCESS GRANTED, EXIT.
14. Go to /registry.
15. Show EXIT event.
16. Enter 99990023.
17. Show DENIED wrong PIN.
18. Go to /hardware.
19. Set SERVER_ROOM offline.
20. Enter 12340023 again.
21. Show hardware error.
```

---

## 29. Risks and Mitigations

### Risk: ENTER/EXIT ambiguity

The same code is used for entering and exiting.

Mitigation:

- Determine state from active presence.
- Show current state in monitoring.
- Later add direction buttons or inside/outside readers.

### Risk: PIN sharing

A person may share composed code.

Mitigation:

- PoC accepts this limitation.
- Production should use badge + PIN or MFA.
- Add rate limiting and suspicious attempt detection.

### Risk: Race conditions

Two access attempts may happen simultaneously.

Mitigation:

- Use DB transactions.
- Use row locks.
- Add partial unique index for active presence.

### Risk: Audit tampering

Admins could theoretically modify database rows.

Mitigation:

- PoC does not expose update/delete event API.
- Production should add hash chaining and restricted DB access.

### Risk: Mock hardware is too simplistic

Mitigation:

- Add offline, forced-open, and sensor-error states.
- Add state snapshots before/after every event.

---

## 30. Future Enhancements

After the PoC:

```text
Keycloak authentication
Role-based admin access
WebSocket live monitoring
Real hardware integration
MQTT door controller
Badge/card reader support
Temporary access approvals
Visitor access
Anti-passback logic
Emergency unlock workflow
Audit export PDF/CSV
Grafana dashboard
OpenTelemetry tracing
Kubernetes Helm chart
```
