"""Remove email-verification fields from users."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "f2b7c4a91d30"
down_revision = "e4a1b7c93d20"
branch_labels = None
depends_on = None


def upgrade():
    columns = {column["name"] for column in inspect(op.get_bind()).get_columns("users")}
    verification_columns = [
        column
        for column in ("code_expires_at", "verification_code", "is_verified")
        if column in columns
    ]
    if verification_columns:
        with op.batch_alter_table("users") as batch:
            for column in verification_columns:
                batch.drop_column(column)


def downgrade():
    columns = {column["name"] for column in inspect(op.get_bind()).get_columns("users")}

    missing_columns = {
        "is_verified",
        "verification_code",
        "code_expires_at",
    } - columns
    if missing_columns:
        with op.batch_alter_table("users") as batch:
            if "is_verified" not in columns:
                batch.add_column(
                    sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.true())
                )
            if "verification_code" not in columns:
                batch.add_column(sa.Column("verification_code", sa.String(length=5), nullable=True))
            if "code_expires_at" not in columns:
                batch.add_column(
                    sa.Column("code_expires_at", sa.DateTime(timezone=True), nullable=True)
                )
