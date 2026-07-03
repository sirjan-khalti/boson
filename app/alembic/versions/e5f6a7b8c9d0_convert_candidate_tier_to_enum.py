"""Convert candidates.tier to a native enum

The model already declares candidates.tier as a native Postgres enum
(candidate_tier_enum), but no prior migration ever created that type or
converted the column off its original String — it's been schema drift
since the enum was added to the model. This migration catches it up.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

candidate_tier_enum = sa.Enum(
    'Pending',
    'Strong Fit',
    'Moderate Fit',
    'Weak Fit',
    name='candidate_tier_enum',
)


def upgrade() -> None:
    """Upgrade schema."""
    # Defensive: null out any legacy/stray tier value that isn't one of the
    # four literals the app's Tier enum accepts, so the cast below can't
    # fail with "invalid input value for enum".
    op.execute(
        "UPDATE candidates SET tier = NULL "
        "WHERE tier IS NOT NULL AND tier NOT IN ('Pending', 'Strong Fit', 'Moderate Fit', 'Weak Fit')"
    )

    candidate_tier_enum.create(op.get_bind(), checkfirst=True)
    op.alter_column(
        'candidates',
        'tier',
        existing_type=sa.String(),
        type_=candidate_tier_enum,
        postgresql_using='tier::candidate_tier_enum',
        existing_nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'candidates',
        'tier',
        existing_type=candidate_tier_enum,
        type_=sa.String(),
        existing_nullable=True,
    )
    candidate_tier_enum.drop(op.get_bind(), checkfirst=True)
