"""add plan event_date, status, is_public, updated_at

The Plan model uses these columns but the earlier migrations never created
them, so any query on `plans` failed on a database built from migrations
(HTTP 500 on /api/plans/). This brings the schema in line with models.py.

Revision ID: a1f4c9d2b7e3
Revises: 6c7225e241aa
Create Date: 2026-10-19 00:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1f4c9d2b7e3'
down_revision = '9ec73b561ea0'
branch_labels = None
depends_on = None


def _existing_columns():
    inspector = sa.inspect(op.get_bind())
    return {col['name'] for col in inspector.get_columns('plans')}


def upgrade():
    existing = _existing_columns()
    with op.batch_alter_table('plans', schema=None) as batch_op:
        if 'event_date' not in existing:
            batch_op.add_column(sa.Column('event_date', sa.Date(), nullable=True))
        if 'status' not in existing:
            batch_op.add_column(sa.Column('status', sa.String(length=20), nullable=False, server_default='saved'))
        if 'is_public' not in existing:
            batch_op.add_column(sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.false()))
        if 'updated_at' not in existing:
            batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                                          server_default=sa.text('CURRENT_TIMESTAMP')))


def downgrade():
    existing = _existing_columns()
    with op.batch_alter_table('plans', schema=None) as batch_op:
        for name in ('updated_at', 'is_public', 'status', 'event_date'):
            if name in existing:
                batch_op.drop_column(name)
