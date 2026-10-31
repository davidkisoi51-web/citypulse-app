"""add user verification and password reset columns

Revision ID: d31c8f7a2b90
Revises: a1f4c9d2b7e3
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "d31c8f7a2b90"
down_revision = "a1f4c9d2b7e3"
branch_labels = None
depends_on = None


def upgrade():
    inspector = inspect(op.get_bind())
    existing_columns = {
        column["name"]
        for column in inspector.get_columns("users")
    }

    if "is_verified" not in existing_columns:
        op.add_column(
            "users",
            sa.Column(
                "is_verified",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
        op.alter_column(
            "users",
            "is_verified",
            server_default=None,
        )

    if "verification_code" not in existing_columns:
        op.add_column(
            "users",
            sa.Column("verification_code", sa.String(length=5), nullable=True),
        )

    if "code_expires_at" not in existing_columns:
        op.add_column(
            "users",
            sa.Column("code_expires_at", sa.DateTime(timezone=True), nullable=True),
        )

    if "reset_code" not in existing_columns:
        op.add_column(
            "users",
            sa.Column("reset_code", sa.String(length=5), nullable=True),
        )

    if "reset_expires_at" not in existing_columns:
        op.add_column(
            "users",
            sa.Column("reset_expires_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade():
    inspector = inspect(op.get_bind())
    existing_columns = {
        column["name"]
        for column in inspector.get_columns("users")
    }

    for column_name in (
        "reset_expires_at",
        "reset_code",
        "code_expires_at",
        "verification_code",
        "is_verified",
    ):
        if column_name in existing_columns:
            op.drop_column("users", column_name)
