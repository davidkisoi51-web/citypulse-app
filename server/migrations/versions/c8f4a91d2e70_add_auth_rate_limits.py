"""Add persistent authentication rate-limit counters."""

from alembic import op
import sqlalchemy as sa


revision = "c8f4a91d2e70"
down_revision = "b74d3e2a1c90"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "auth_rate_limits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scope", sa.String(length=40), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "window_started_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "scope",
            "key_hash",
            name="uq_auth_rate_limits_scope_key",
        ),
    )


def downgrade():
    op.drop_table("auth_rate_limits")
