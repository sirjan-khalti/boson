"""Drop denormalized actor name/email snapshots on notes and stage history

changed_by_name/changed_by_email (candidate_stage_history) and
author_name/author_email (candidate_notes) were snapshotted at write time
on the assumption they might need to survive the acting user's account
being deleted. Users are only ever soft-deactivated, never hard-deleted,
so the changed_by_user_id/author_user_id FK always resolves in practice —
these columns were pure redundant duplication with drift risk (a user's
name/email changing later would leave the snapshot stale) and no actual
resilience benefit. Actor info is now read live via a relationship join
to users instead.

These tables were only just created in the candidates redesign migration,
so there's no meaningful historical data to preserve here.

Revision ID: fb421b1a926e
Revises: 5c3aa427155b
Create Date: 2026-07-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'fb421b1a926e'
down_revision: Union[str, Sequence[str], None] = '5c3aa427155b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('candidate_stage_history', 'changed_by_name')
    op.drop_column('candidate_stage_history', 'changed_by_email')
    op.drop_column('candidate_notes', 'author_name')
    op.drop_column('candidate_notes', 'author_email')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('candidate_notes', sa.Column('author_email', sa.String(), nullable=True))
    op.add_column('candidate_notes', sa.Column('author_name', sa.String(), nullable=True))
    op.add_column('candidate_stage_history', sa.Column('changed_by_email', sa.String(), nullable=True))
    op.add_column('candidate_stage_history', sa.Column('changed_by_name', sa.String(), nullable=True))

    op.execute("""
        UPDATE candidate_notes n SET
            author_name = u.name,
            author_email = u.email
        FROM users u
        WHERE u.id = n.author_user_id
    """)
    op.execute("""
        UPDATE candidate_stage_history h SET
            changed_by_name = u.name,
            changed_by_email = u.email
        FROM users u
        WHERE u.id = h.changed_by_user_id
    """)
