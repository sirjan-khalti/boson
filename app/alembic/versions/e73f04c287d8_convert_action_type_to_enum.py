"""Convert activity_logs.action_type to a native enum

Revision ID: e73f04c287d8
Revises: 6b5b58af235d
Create Date: 2026-07-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e73f04c287d8'
down_revision: Union[str, Sequence[str], None] = '6b5b58af235d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

action_type_enum = sa.Enum(
    'job_created',
    'job_status_updated',
    'candidate_applied',
    'candidate_evaluated',
    'candidate_stage_updated',
    'candidate_note_added',
    'member_created',
    'member_role_updated',
    'member_password_reset',
    'password_changed',
    name='action_type_enum',
)


def upgrade() -> None:
    """Upgrade schema."""
    action_type_enum.create(op.get_bind(), checkfirst=True)
    op.alter_column(
        'activity_logs',
        'action_type',
        existing_type=sa.String(),
        type_=action_type_enum,
        postgresql_using='action_type::action_type_enum',
        existing_nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'activity_logs',
        'action_type',
        existing_type=action_type_enum,
        type_=sa.String(),
        existing_nullable=False,
    )
    action_type_enum.drop(op.get_bind(), checkfirst=True)
