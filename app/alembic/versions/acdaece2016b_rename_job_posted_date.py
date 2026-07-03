"""Rename jobs.postedDate to posted_date

The Job model's Python attribute was renamed to posted_date in an earlier
pass, but the matching column rename was never written as a migration —
so the DB column is still literally "postedDate", which SQLAlchemy can no
longer find under the new attribute name. Fixes the live
"column jobs.posted_date does not exist" / "jobs.closed_date does not
exist" query failures.

Revision ID: acdaece2016b
Revises: e5f6a7b8c9d0
Create Date: 2026-07-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'acdaece2016b'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('jobs', 'postedDate', new_column_name='posted_date')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('jobs', 'posted_date', new_column_name='postedDate')
