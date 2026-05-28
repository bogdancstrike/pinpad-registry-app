"""add demo_pin to rooms (PoC convenience)

Revision ID: 0002_room_demo_pin
Revises: 0001_initial
Create Date: 2026-05-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_room_demo_pin"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("rooms", sa.Column("demo_pin", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("rooms", "demo_pin")
