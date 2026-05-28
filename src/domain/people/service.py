"""People CRUD."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.common.errors import ConflictError, NotFoundError, ValidationError
from src.domain.models import Person


def serialize(p: Person) -> dict:
    return {
        "id": str(p.id),
        "personCode": p.person_code,
        "fullName": p.full_name,
        "department": p.department,
        "role": p.role,
        "active": p.active,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
    }


def list_people(db: Session) -> list[dict]:
    rows = db.scalars(select(Person).order_by(Person.full_name)).all()
    return [serialize(p) for p in rows]


def get_person(db: Session, person_id) -> dict:
    p = db.get(Person, person_id)
    if p is None:
        raise NotFoundError("Person not found")
    return serialize(p)


def create_person(db: Session, payload: dict) -> dict:
    code = (payload.get("personCode") or payload.get("person_code") or "").strip()
    name = (payload.get("fullName") or payload.get("full_name") or "").strip()
    if not code or not name:
        raise ValidationError("personCode and fullName are required")
    if db.scalar(select(Person).where(Person.person_code == code)):
        raise ConflictError("personCode already exists")
    p = Person(
        person_code=code,
        full_name=name,
        department=payload.get("department"),
        role=payload.get("role"),
        active=payload.get("active", True),
    )
    db.add(p)
    db.flush()
    return serialize(p)


def update_person(db: Session, person_id, payload: dict) -> dict:
    p = db.get(Person, person_id)
    if p is None:
        raise NotFoundError("Person not found")
    if "fullName" in payload or "full_name" in payload:
        p.full_name = payload.get("fullName") or payload.get("full_name") or p.full_name
    if "department" in payload:
        p.department = payload["department"]
    if "role" in payload:
        p.role = payload["role"]
    if "active" in payload:
        p.active = bool(payload["active"])
    db.flush()
    return serialize(p)


def delete_person(db: Session, person_id) -> None:
    p = db.get(Person, person_id)
    if p is None:
        raise NotFoundError("Person not found")
    db.delete(p)
