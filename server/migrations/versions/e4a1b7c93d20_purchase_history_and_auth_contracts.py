"""Align ticket purchases, transfers, and user constraints with the API."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "e4a1b7c93d20"
down_revision = "c8f4a91d2e70"
branch_labels = None
depends_on = None


def _tables():
    return set(inspect(op.get_bind()).get_table_names())


def _columns(table):
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table)}


def upgrade():
    if "tickets" not in _tables():
        op.create_table(
            "tickets",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("paid_at", sa.String(length=80)),
            sa.Column("event_id", sa.String(), nullable=False),
            sa.Column("event_name", sa.String()),
            sa.Column("event_date", sa.String(length=80)),
            sa.Column("event_time", sa.String(length=80)),
            sa.Column("event_venue", sa.String()),
            sa.Column("event_city", sa.String()),
            sa.Column("mpesa_no", sa.String()),
            sa.Column("ticket_type", sa.String()),
            sa.Column("price", sa.Float()),
            sa.Column("no_of_tickets", sa.Integer()),
            sa.Column("transferable", sa.Boolean()),
            sa.Column("receipt_no", sa.String(length=32)),
            sa.Column("event_category", sa.String(length=120)),
            sa.Column("currency", sa.String(length=8), nullable=False, server_default="KES"),
            sa.Column("total", sa.Float()),
            sa.Column("method", sa.String(length=40)),
            sa.Column("mpesa_code", sa.String(length=32)),
            sa.Column("paid_to", sa.String(length=160)),
            sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id")),
            sa.UniqueConstraint("receipt_no", name="uq_tickets_receipt_no"),
            sa.UniqueConstraint("payment_id", name="uq_tickets_payment_id"),
        )
        op.create_index("ix_tickets_user_id", "tickets", ["user_id"])
    else:
        columns = _columns("tickets")
        additions = (
            ("receipt_no", sa.String(length=32)),
            ("event_category", sa.String(length=120)),
            ("currency", sa.String(length=8), "KES"),
            ("total", sa.Float()),
            ("method", sa.String(length=40)),
            ("mpesa_code", sa.String(length=32)),
            ("paid_to", sa.String(length=160)),
            ("payment_id", sa.Integer()),
        )
        with op.batch_alter_table("tickets") as batch:
            if "price" in columns:
                batch.alter_column(
                    "price",
                    existing_type=sa.Integer(),
                    type_=sa.Float(),
                )
            for entry in additions:
                name, column_type = entry[:2]
                if name not in columns:
                    constraints = [
                        sa.ForeignKey("payments.id", name="fk_tickets_payment_id_payments")
                    ] if name == "payment_id" else []
                    batch.add_column(sa.Column(
                        name,
                        column_type,
                        *constraints,
                        nullable=(name != "currency"),
                        server_default=entry[2] if len(entry) == 3 else None,
                    ))
        indexes = inspect(op.get_bind()).get_indexes("tickets")
        unique_constraints = inspect(op.get_bind()).get_unique_constraints("tickets")
        existing_indexes = {index["name"] for index in indexes}
        unique_column_sets = {
            tuple(constraint.get("column_names") or ())
            for constraint in unique_constraints
        } | {
            tuple(index.get("column_names") or ())
            for index in indexes
            if index.get("unique")
        }
        if "ix_tickets_user_id" not in existing_indexes and "user_id" in columns:
            op.create_index("ix_tickets_user_id", "tickets", ["user_id"])
        if ("receipt_no",) not in unique_column_sets:
            op.create_index("ix_tickets_receipt_no", "tickets", ["receipt_no"], unique=True)
        if ("payment_id",) not in unique_column_sets:
            op.create_index("ix_tickets_payment_id", "tickets", ["payment_id"], unique=True)

        op.execute(sa.text(
            "UPDATE tickets SET receipt_no = 'LEGACY-' || id WHERE receipt_no IS NULL"
        ))
        op.execute(sa.text(
            "UPDATE tickets SET currency = 'KES' WHERE currency IS NULL"
        ))
        op.execute(sa.text(
            "UPDATE tickets SET total = COALESCE(price, 0) * COALESCE(no_of_tickets, 0) "
            "WHERE total IS NULL"
        ))
        op.execute(sa.text(
            "UPDATE tickets SET method = CASE WHEN COALESCE(mpesa_no, '') = '' "
            "THEN 'Legacy' ELSE 'M-PESA' END WHERE method IS NULL"
        ))
        op.execute(sa.text(
            "UPDATE tickets SET mpesa_code = mpesa_no "
            "WHERE mpesa_code IS NULL AND mpesa_no IS NOT NULL"
        ))

    if "transfers" not in _tables():
        op.create_table(
            "transfers",
            sa.Column("transfer_id", sa.Integer(), primary_key=True),
            sa.Column("user_email", sa.String()),
            sa.Column("transferee_email", sa.String()),
            sa.Column("ticket", sa.String()),
        )

    user_uniques = [
        constraint
        for constraint in inspect(op.get_bind()).get_unique_constraints("users")
        if constraint.get("column_names") == ["name"]
    ]
    for constraint in user_uniques:
        name = constraint.get("name") or "uq_users_name"
        with op.batch_alter_table(
            "users",
            naming_convention={"uq": "uq_%(table_name)s_%(column_0_name)s"},
        ) as batch:
            batch.drop_constraint(name, type_="unique")


def downgrade():
    # Ticket/transfer tables may predate this revision and may contain purchase history.
    # Retain them rather than risk deleting user data during a rollback.
    pass
