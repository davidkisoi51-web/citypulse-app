"""Track delivery of upcoming event reminder emails.

Revision ID: b74d3e2a1c90
Revises: 696aa3797552
Create Date: 2026-10-30
"""
from alembic import op
import sqlalchemy as sa

revision = "b74d3e2a1c90"
down_revision = "696aa3797552"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("saved_events", sa.Column("reminder_sent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("saved_events", "reminder_sent_at")
