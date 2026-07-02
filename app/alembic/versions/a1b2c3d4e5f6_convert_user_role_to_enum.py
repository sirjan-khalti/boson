"""Convert users.role to a native enum

Revision ID: a1b2c3d4e5f6
Revises: 32284e918395
Create Date: 2026-07-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '32284e918395'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_enum = sa.Enum(
    'SUPERADMIN',
    'ADMIN',
    'RECRUITER',
    'VIEWER',
    name='user_role_enum',
)


def upgrade() -> None:
    """Upgrade schema."""
    user_role_enum.create(op.get_bind(), checkfirst=True)
    op.alter_column(
        'users',
        'role',
        existing_type=sa.String(),
        type_=user_role_enum,
        postgresql_using='role::user_role_enum',
        existing_nullable=False,
        server_default='VIEWER',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'users',
        'role',
        existing_type=user_role_enum,
        type_=sa.String(),
        existing_nullable=False,
        server_default='VIEWER',
    )
    user_role_enum.drop(op.get_bind(), checkfirst=True)
