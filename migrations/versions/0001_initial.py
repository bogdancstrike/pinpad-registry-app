"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "people",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("person_code", sa.String(20), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("department", sa.String(255)),
        sa.Column("role", sa.String(100)),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_people_person_code", "people", ["person_code"], unique=True)

    op.create_table(
        "rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("pin_hash", sa.String(255), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_rooms_code", "rooms", ["code"], unique=True)

    op.create_table(
        "access_permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("person_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("people.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("valid_from", sa.DateTime()),
        sa.Column("valid_until", sa.DateTime()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("person_id", "room_id", name="uq_permission_person_room"),
    )

    op.create_table(
        "room_presence",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("person_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("people.id", ondelete="CASCADE"), nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entered_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("exited_at", sa.DateTime()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    # One active presence row per person per room — guards the ENTER/EXIT race.
    op.create_index(
        "ux_active_presence_person_room",
        "room_presence",
        ["person_id", "room_id"],
        unique=True,
        postgresql_where=sa.text("active = true"),
    )

    op.create_table(
        "access_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("person_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("people.id", ondelete="SET NULL")),
        sa.Column("room_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("rooms.id", ondelete="SET NULL")),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("decision", sa.String(30), nullable=False),
        sa.Column("reason", sa.String(255)),
        sa.Column("raw_code_masked", sa.String(50)),
        sa.Column("door_state_before", postgresql.JSONB()),
        sa.Column("door_state_after", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_access_events_created_at", "access_events", ["created_at"])

    op.create_table(
        "mock_door_devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("room_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("state", sa.String(50), nullable=False, server_default="LOCKED"),
        sa.Column("locked", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("door_open", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("controller_online", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_unlock_at", sa.DateTime()),
        sa.Column("last_lock_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("mock_door_devices")
    op.drop_index("ix_access_events_created_at", table_name="access_events")
    op.drop_table("access_events")
    op.drop_index("ux_active_presence_person_room", table_name="room_presence")
    op.drop_table("room_presence")
    op.drop_table("access_permissions")
    op.drop_index("ix_rooms_code", table_name="rooms")
    op.drop_table("rooms")
    op.drop_index("ix_people_person_code", table_name="people")
    op.drop_table("people")
