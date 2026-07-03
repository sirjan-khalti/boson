"""Convert id/foreign-key columns from String to native UUID

Every id and *_id column has always held a str(uuid.uuid4()) value, but was
declared as a plain String/VARCHAR — this stores the DB-agnostic default
generate_uuid() value in Postgres's native uuid type instead, giving 16-byte
storage/indexes and DB-level validation. FK constraints are dropped and
recreated around the type change since Postgres won't let a constrained
column and its referenced column briefly disagree in type mid-migration.

Revision ID: 9c6d34d43399
Revises: fb421b1a926e
Create Date: 2026-07-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9c6d34d43399'
down_revision: Union[str, Sequence[str], None] = 'fb421b1a926e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Every id/foreign-key column that needs to move from String to UUID.
_ID_COLUMNS = {
    'activity_logs': ['id', 'job_id', 'candidate_id'],
    'jobs': ['id'],
    'users': ['id'],
    'candidates': ['id', 'job_id'],
    'candidate_notes': ['id', 'candidate_id', 'author_user_id'],
    'candidate_stage_history': ['id', 'candidate_id', 'changed_by_user_id'],
    'candidate_evaluations': ['candidate_id'],
}

# (table, column) pairs backed by a real FK constraint — these must be
# dropped before, and recreated after, the type change.
_FK_COLUMNS = [
    ('candidates', 'job_id', 'jobs', 'id', None),
    ('candidate_notes', 'candidate_id', 'candidates', 'id', 'CASCADE'),
    ('candidate_notes', 'author_user_id', 'users', 'id', 'SET NULL'),
    ('candidate_stage_history', 'candidate_id', 'candidates', 'id', 'CASCADE'),
    ('candidate_stage_history', 'changed_by_user_id', 'users', 'id', 'SET NULL'),
    ('candidate_evaluations', 'candidate_id', 'candidates', 'id', 'CASCADE'),
]


def _existing_fk_names(bind):
    inspector = sa.inspect(bind)
    names = {}
    for table, column, *_ in _FK_COLUMNS:
        fk = next(
            fk for fk in inspector.get_foreign_keys(table)
            if fk['constrained_columns'] == [column]
        )
        names[(table, column)] = fk['name']
    return names


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    fk_names = _existing_fk_names(bind)

    for (table, column), name in fk_names.items():
        op.drop_constraint(name, table, type_='foreignkey')

    for table, columns in _ID_COLUMNS.items():
        for column in columns:
            op.alter_column(
                table, column,
                existing_type=sa.String(),
                type_=postgresql.UUID(as_uuid=True),
                postgresql_using=f'{column}::uuid',
            )

    for table, column, ref_table, ref_column, ondelete in _FK_COLUMNS:
        op.create_foreign_key(
            fk_names[(table, column)], table, ref_table, [column], [ref_column], ondelete=ondelete
        )


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    fk_names = _existing_fk_names(bind)

    for (table, column), name in fk_names.items():
        op.drop_constraint(name, table, type_='foreignkey')

    for table, columns in _ID_COLUMNS.items():
        for column in columns:
            op.alter_column(
                table, column,
                existing_type=postgresql.UUID(as_uuid=True),
                type_=sa.String(),
                postgresql_using=f'{column}::text',
            )

    for table, column, ref_table, ref_column, ondelete in _FK_COLUMNS:
        op.create_foreign_key(
            fk_names[(table, column)], table, ref_table, [column], [ref_column], ondelete=ondelete
        )
