"""Add candidates.evaluation_status

Revision ID: 32284e918395
Revises: e73f04c287d8
Create Date: 2026-07-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '32284e918395'
down_revision: Union[str, Sequence[str], None] = 'e73f04c287d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

evaluation_status_enum = sa.Enum(
    'PENDING',
    'SUCCESS',
    'FAILED',
    name='evaluation_status_enum',
)


def upgrade() -> None:
    """Upgrade schema."""
    evaluation_status_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'candidates',
        sa.Column(
            'evaluation_status',
            evaluation_status_enum,
            nullable=False,
            server_default='PENDING',
        ),
    )
    op.create_index(
        op.f('ix_candidates_evaluation_status'), 'candidates', ['evaluation_status'], unique=False
    )

    # Backfill from the existing (previously overloaded) `tier` column so
    # already-evaluated candidates aren't shown as PENDING.
    op.execute(
        "UPDATE candidates SET evaluation_status = 'SUCCESS' "
        "WHERE tier IN ('Strong Fit', 'Moderate Fit', 'Weak Fit')"
    )
    op.execute(
        "UPDATE candidates SET evaluation_status = 'FAILED', tier = NULL, summary = NULL "
        "WHERE tier = 'Evaluation Failed'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_candidates_evaluation_status'), table_name='candidates')
    op.drop_column('candidates', 'evaluation_status')
    evaluation_status_enum.drop(op.get_bind(), checkfirst=True)
