"""Convert jobs.status to a native enum, split closed date into its own column

The status column previously double-encoded the closed date as
"Closed:<date>" so the 30-day archive logic could parse it back out.
That string-encoding scheme can't coexist with a native Postgres enum
(which only accepts a fixed set of literal values), so this migration
adds a proper closed_date column and normalizes status down to just
"Active" / "Closed".

Revision ID: d4e5f6a7b8c9
Revises: 73a20c329723
Create Date: 2026-07-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = '73a20c329723'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

job_status_enum = sa.Enum(
    'Active',
    'Closed',
    name='job_status_enum',
)


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('jobs', sa.Column('closed_date', sa.Date(), nullable=True))

    op.execute(
        "UPDATE jobs SET closed_date = to_date(split_part(status, ':', 2), 'YYYY-MM-DD') "
        "WHERE status LIKE 'Closed:%'"
    )
    op.execute("UPDATE jobs SET status = 'Closed' WHERE status LIKE 'Closed:%'")
    op.execute("UPDATE jobs SET status = 'Active' WHERE status IS NULL")
    op.execute("UPDATE jobs SET status = 'Active' WHERE status NOT IN ('Active', 'Closed')")

    job_status_enum.create(op.get_bind(), checkfirst=True)
    op.alter_column(
        'jobs',
        'status',
        existing_type=sa.String(),
        type_=job_status_enum,
        postgresql_using='status::job_status_enum',
        nullable=False,
        server_default='Active',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'jobs',
        'status',
        existing_type=job_status_enum,
        type_=sa.String(),
        existing_nullable=False,
        server_default='Active',
    )
    job_status_enum.drop(op.get_bind(), checkfirst=True)

    op.execute(
        "UPDATE jobs SET status = 'Closed:' || to_char(closed_date, 'YYYY-MM-DD') "
        "WHERE status = 'Closed' AND closed_date IS NOT NULL"
    )

    op.drop_column('jobs', 'closed_date')
