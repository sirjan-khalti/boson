"""Add jobs.scoring_criteria

Revision ID: 73a20c329723
Revises: b2c3d4e5f6a7
Create Date: 2026-07-02 00:00:00.000000

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '73a20c329723'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Snapshot of app.core.constants.DEFAULT_SCORING_CRITERIA at the time this
# migration was written. Migrations must not import mutable app code, so
# this is intentionally duplicated rather than imported.
DEFAULT_SCORING_CRITERIA = [
    {
        "criteria": "Relevant Experience",
        "weight": 25,
        "description": (
            "Evaluate how closely the candidate’s experience aligns "
            "with the role requirements, responsibilities, domain, "
            "and expected impact level. Score relative to the seniority "
            "of the role. Internship and entry-level roles should not "
            "be penalized for limited experience if the candidate shows "
            "strong relevance, initiative, ownership, or learning potential."
        ),
    },
    {
        "criteria": "Years of Relevant Experience",
        "weight": 20,
        "description": (
            "Evaluate the candidate’s total relevant experience relative "
            "to the role level and expectations. Use role-adjusted scoring: "
            "for internships and junior roles, smaller durations of highly "
            "relevant experience can still score well; for mid-level and "
            "senior roles, greater depth, progression, and sustained impact "
            "are expected."
        ),
    },
    {
        "criteria": "Education & Qualifications",
        "weight": 15,
        "description": (
            "Relevant academic background, degrees, coursework, "
            "and qualifications aligned with the role requirements."
        ),
    },
    {
        "criteria": "Trainings & Certifications",
        "weight": 15,
        "description": (
            "Relevant certifications, workshops, trainings, "
            "bootcamps, and specialized learning credentials."
        ),
    },
    {
        "criteria": "Technical Knowledge",
        "weight": 10,
        "description": (
            "Evaluate technical stack alignment, tools, frameworks, "
            "platforms, methodologies, and domain-specific knowledge "
            "relevant to the role."
        ),
    },
    {
        "criteria": "Leadership & Strategic Ability",
        "weight": 10,
        "description": (
            "Leadership, ownership, initiative, collaboration, "
            "decision-making, strategic thinking, mentoring, "
            "or organizational contributions appropriate to the role level."
        ),
    },
    {
        "criteria": "Communication & Soft Skills",
        "weight": 5,
        "description": (
            "Communication clarity, teamwork, stakeholder interaction, "
            "documentation quality, collaboration, adaptability, "
            "and interpersonal effectiveness."
        ),
    },
]


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'jobs',
        sa.Column('scoring_criteria', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.execute(
        sa.text("UPDATE jobs SET scoring_criteria = CAST(:criteria AS jsonb)").bindparams(
            sa.bindparam('criteria', value=json.dumps(DEFAULT_SCORING_CRITERIA))
        )
    )
    op.alter_column('jobs', 'scoring_criteria', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('jobs', 'scoring_criteria')
