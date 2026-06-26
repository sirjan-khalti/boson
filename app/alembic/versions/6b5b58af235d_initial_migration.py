"""Initial migration

Revision ID: 6b5b58af235d
Revises:
Create Date: 2026-05-22 10:17:26.918938

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6b5b58af235d'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('activity_logs',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('timestamp', sa.DateTime(), nullable=True),
    sa.Column('action_type', sa.String(), nullable=False),
    sa.Column('description', sa.String(), nullable=False),
    sa.Column('user_name', sa.String(), nullable=False),
    sa.Column('user_email', sa.String(), nullable=True),
    sa.Column('job_id', sa.String(), nullable=True),
    sa.Column('candidate_id', sa.String(), nullable=True),
    sa.Column('created_on', sa.DateTime(), nullable=True),
    sa.Column('updated_on', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_logs_action_type'), 'activity_logs', ['action_type'], unique=False)
    op.create_index(op.f('ix_activity_logs_job_id'), 'activity_logs', ['job_id'], unique=False)
    op.create_index(op.f('ix_activity_logs_timestamp'), 'activity_logs', ['timestamp'], unique=False)
    op.create_table('jobs',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('department', sa.String(), nullable=False),
    sa.Column('location', sa.String(), nullable=False),
    sa.Column('type', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('applicants', sa.Integer(), nullable=True),
    sa.Column('postedDate', sa.DateTime(), nullable=True),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('created_on', sa.DateTime(), nullable=True),
    sa.Column('updated_on', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('users',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('hashed_password', sa.String(), nullable=False),
    sa.Column('role', sa.String(), nullable=False),
    sa.Column('created_on', sa.DateTime(), nullable=True),
    sa.Column('updated_on', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_table('candidates',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('jobId', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('phone', sa.String(), nullable=False),
    sa.Column('avatar', sa.String(), nullable=True),
    sa.Column('title', sa.String(), nullable=True),
    sa.Column('company', sa.String(), nullable=True),
    sa.Column('experience', sa.Float(), nullable=True),
    sa.Column('location', sa.String(), nullable=True),
    sa.Column('education', sa.String(), nullable=True),
    sa.Column('educationHistory', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('missingSkills', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('languages', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('certifications', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('achievements', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('links', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('workHistory', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('salaryExpectation', sa.String(), nullable=True),
    sa.Column('availability', sa.String(), nullable=True),
    sa.Column('workAuthorization', sa.String(), nullable=True),
    sa.Column('noticePeriod', sa.String(), nullable=True),
    sa.Column('source', sa.String(), nullable=True),
    sa.Column('stage', sa.String(), nullable=True),
    sa.Column('pastStages', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('appliedDate', sa.DateTime(), nullable=True),
    sa.Column('match', sa.Integer(), nullable=True),
    sa.Column('tier', sa.String(), nullable=True),
    sa.Column('summary', sa.Text(), nullable=True),
    sa.Column('notes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('scores', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('strengths', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('weaknesses', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('cvUrl', sa.String(), nullable=True),
    sa.Column('cv_filelink', sa.String(), nullable=True),
    sa.Column('personal_info', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('professional_summary', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('experience_history', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('education_history', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('projects', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('certifications_history', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('languages_history', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('awards', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('publications', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('candidate_preferences', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('custom_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('created_on', sa.DateTime(), nullable=True),
    sa.Column('updated_on', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['jobId'], ['jobs.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_candidates_email'), 'candidates', ['email'], unique=False)
    op.create_index(op.f('ix_candidates_jobId'), 'candidates', ['jobId'], unique=False)
    op.create_index(op.f('ix_candidates_stage'), 'candidates', ['stage'], unique=False)
    op.create_index(op.f('ix_candidates_tier'), 'candidates', ['tier'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_candidates_tier'), table_name='candidates')
    op.drop_index(op.f('ix_candidates_stage'), table_name='candidates')
    op.drop_index(op.f('ix_candidates_jobId'), table_name='candidates')
    op.drop_index(op.f('ix_candidates_email'), table_name='candidates')
    op.drop_table('candidates')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_table('jobs')
    op.drop_index(op.f('ix_activity_logs_timestamp'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_job_id'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_action_type'), table_name='activity_logs')
    op.drop_table('activity_logs')
