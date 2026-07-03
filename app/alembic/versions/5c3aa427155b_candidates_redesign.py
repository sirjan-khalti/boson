"""Candidates table redesign

Splits candidate_notes, candidate_stage_history, and candidate_evaluations
out into their own tables (replacing the notes/pastStages/summary/scores/
strengths/weaknesses columns), standardizes casing end-to-end
(jobId->job_id, appliedDate->applied_date, salaryExpectation->
salary_expectation, noticePeriod->notice_period, match->match_score),
promotes stage to a native enum, and drops columns that were either
superseded by the richer personal_info/*_history JSONB (educationHistory,
languages, certifications, links, workHistory), confirmed dead
(missingSkills, avatar), or moved to a computed field on the API response
(cvUrl, and email/phone/title/company/location/education — never hit a
real WHERE/ORDER BY, see app/models/candidate.py).

Data-preserving: notes, pastStages, and the evaluation snapshot are copied
into their new homes before the source columns are dropped. See the ERD
at the top of this project's schema-redesign discussion for the full
rationale, including the Rejected-history special case implemented in
app/services/candidate.py::update_stage (not a DB-level concern, so
nothing here for it).

Revision ID: 5c3aa427155b
Revises: acdaece2016b
Create Date: 2026-07-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import ENUM as PGEnum

# revision identifiers, used by Alembic.
revision: str = '5c3aa427155b'
down_revision: Union[str, Sequence[str], None] = 'acdaece2016b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

candidate_stage_enum = sa.Enum(
    'Applied', 'Screening', 'Shortlisted', 'Interview', 'Final Review',
    'Offer', 'Hired', 'Rejected',
    name='candidate_stage_enum',
)
# Column-definition uses of the enum must not try to auto-create the type
# themselves — op.create_table()'s DDL path issues CREATE TYPE without a
# checkfirst guard, which collides with the explicit .create() call below
# ("type already exists"). create_type=False is only honored reliably by
# the dialect-specific postgresql.ENUM (the generic sa.Enum's dialect_impl()
# doesn't consistently propagate the flag into _on_table_create) — the type
# is created exactly once, explicitly, up front.
_stage_enum_ref = PGEnum(
    'Applied', 'Screening', 'Shortlisted', 'Interview', 'Final Review',
    'Offer', 'Hired', 'Rejected',
    name='candidate_stage_enum',
    create_type=False,
)

_VALID_STAGES = "('Applied','Screening','Shortlisted','Interview','Final Review','Offer','Hired','Rejected')"


def upgrade() -> None:
    """Upgrade schema."""
    candidate_stage_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'candidate_notes',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('candidate_id', sa.String(), sa.ForeignKey('candidates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_user_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('author_name', sa.String(), nullable=False),
        sa.Column('author_email', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('updated_on', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_candidate_notes_candidate_id', 'candidate_notes', ['candidate_id'])
    op.create_index('ix_candidate_notes_created_at', 'candidate_notes', ['created_at'])

    op.create_table(
        'candidate_stage_history',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('candidate_id', sa.String(), sa.ForeignKey('candidates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage', _stage_enum_ref, nullable=False),
        sa.Column('changed_at', sa.DateTime(), nullable=True),
        sa.Column('changed_by_user_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('changed_by_name', sa.String(), nullable=True),
        sa.Column('changed_by_email', sa.String(), nullable=True),
        sa.Column('created_on', sa.DateTime(), nullable=True),
        sa.Column('updated_on', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_candidate_stage_history_candidate_id', 'candidate_stage_history', ['candidate_id'])
    op.create_index('ix_candidate_stage_history_changed_at', 'candidate_stage_history', ['changed_at'])

    op.create_table(
        'candidate_evaluations',
        sa.Column('candidate_id', sa.String(), sa.ForeignKey('candidates.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('scores', JSONB(), nullable=True),
        sa.Column('strengths', JSONB(), nullable=True),
        sa.Column('weaknesses', JSONB(), nullable=True),
        sa.Column('evaluated_at', sa.DateTime(), nullable=True),
    )

    # --- Normalize stray stage values before anything reads/casts stage ---
    op.execute("UPDATE candidates SET stage = 'Interview' WHERE stage = 'Interviewing'")
    op.execute(f"UPDATE candidates SET stage = 'Applied' WHERE stage IS NULL OR stage NOT IN {_VALID_STAGES}")

    # --- Backfill candidate_stage_history from pastStages + current stage ---
    # No real timestamps ever existed for past stages, so this assigns
    # synthetic ones (appliedDate + N seconds) purely to preserve relative
    # ordering. Every row here is the stage being *entered*, matching the
    # new service-layer semantics (see update_stage).
    op.execute(f"""
        INSERT INTO candidate_stage_history (id, candidate_id, stage, changed_at, created_on, updated_on)
        SELECT gen_random_uuid()::text, candidate_id, stage_value::candidate_stage_enum, changed_at, now(), now()
        FROM (
            SELECT
                c.id AS candidate_id,
                elem.value AS stage_value,
                c."appliedDate" + (elem.ordinality * interval '1 second') AS changed_at
            FROM candidates c,
            LATERAL jsonb_array_elements_text(COALESCE(c."pastStages", '[]'::jsonb)) WITH ORDINALITY AS elem(value, ordinality)
            WHERE elem.value IN {_VALID_STAGES}

            UNION ALL

            SELECT
                c.id AS candidate_id,
                c.stage AS stage_value,
                c."appliedDate" + ((COALESCE(jsonb_array_length(c."pastStages"), 0) + 1) * interval '1 second') AS changed_at
            FROM candidates c
        ) AS stages
    """)

    # --- Backfill candidate_notes from the notes JSONB list ---
    # The old shape only ever stored the author's email, never a name —
    # recover a real name by joining against users where the email still
    # matches an account; fall back to the email string otherwise.
    op.execute("""
        INSERT INTO candidate_notes (id, candidate_id, author_user_id, author_name, author_email, content, created_at, created_on, updated_on)
        SELECT
            gen_random_uuid()::text,
            c.id,
            u.id,
            COALESCE(u.name, note->>'author', 'Unknown'),
            note->>'author',
            note->>'content',
            COALESCE(NULLIF(note->>'date', '')::date::timestamp, c."appliedDate"),
            now(),
            now()
        FROM candidates c,
        LATERAL jsonb_array_elements(COALESCE(c.notes, '[]'::jsonb)) AS note
        LEFT JOIN users u ON u.email = note->>'author'
        WHERE COALESCE(note->>'content', '') != ''
    """)

    # --- Backfill candidate_evaluations, only for candidates actually evaluated ---
    # PENDING rows are skipped: their "summary" is just the placeholder
    # "Evaluating candidate profile..." text, not real evaluation output.
    # evaluated_at has no real source column pre-migration, so appliedDate
    # is used as a best-effort placeholder.
    op.execute("""
        INSERT INTO candidate_evaluations (candidate_id, summary, scores, strengths, weaknesses, evaluated_at)
        SELECT id, summary, COALESCE(scores, '[]'::jsonb), COALESCE(strengths, '[]'::jsonb), COALESCE(weaknesses, '[]'::jsonb), "appliedDate"
        FROM candidates
        WHERE evaluation_status IN ('SUCCESS', 'FAILED')
    """)

    # --- Rename columns ---
    op.alter_column('candidates', 'jobId', new_column_name='job_id')
    op.alter_column('candidates', 'appliedDate', new_column_name='applied_date')
    op.alter_column('candidates', 'salaryExpectation', new_column_name='salary_expectation')
    op.alter_column('candidates', 'noticePeriod', new_column_name='notice_period')
    op.alter_column('candidates', 'match', new_column_name='match_score')

    # --- Convert stage to enum ---
    op.alter_column(
        'candidates',
        'stage',
        existing_type=sa.String(),
        type_=_stage_enum_ref,
        postgresql_using='stage::candidate_stage_enum',
        nullable=False,
        server_default='Applied',
    )

    # --- Drop columns superseded by the changes above ---
    for col in (
        'email', 'phone', 'avatar', 'title', 'company', 'location', 'education',
        'educationHistory', 'missingSkills', 'languages', 'certifications', 'links', 'workHistory',
        'pastStages', 'summary', 'notes', 'scores', 'strengths', 'weaknesses', 'cvUrl',
    ):
        op.drop_column('candidates', col)


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('candidates', sa.Column('cvUrl', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('weaknesses', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('strengths', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('scores', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('notes', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('summary', sa.Text(), nullable=True))
    op.add_column('candidates', sa.Column('pastStages', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('workHistory', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('links', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('certifications', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('languages', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('missingSkills', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('educationHistory', JSONB(), nullable=True))
    op.add_column('candidates', sa.Column('education', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('location', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('company', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('title', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('avatar', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('candidates', sa.Column('email', sa.String(), nullable=True))

    op.alter_column(
        'candidates',
        'stage',
        existing_type=_stage_enum_ref,
        type_=sa.String(),
        existing_nullable=False,
        server_default='Applied',
    )

    op.alter_column('candidates', 'match_score', new_column_name='match')
    op.alter_column('candidates', 'notice_period', new_column_name='noticePeriod')
    op.alter_column('candidates', 'salary_expectation', new_column_name='salaryExpectation')
    op.alter_column('candidates', 'applied_date', new_column_name='appliedDate')
    op.alter_column('candidates', 'job_id', new_column_name='jobId')

    # Best-effort restore: real values (email/phone/title/company/location/
    # education, notes with real authorship, evaluation attempt history)
    # are not recoverable from the new tables with full fidelity — this
    # restores what it can from personal_info/*_history and the new tables.
    op.execute("""
        UPDATE candidates c SET
            email = c.personal_info->>'email',
            phone = c.personal_info->>'phone',
            location = TRIM(BOTH ', ' FROM CONCAT_WS(', ', c.personal_info->'address'->>'city', c.personal_info->'address'->>'country')),
            title = c.experience_history->0->>'job_title',
            company = c.experience_history->0->>'company_name',
            education = c.education_history->0->>'degree'
    """)
    op.execute("""
        UPDATE candidates c SET
            summary = e.summary,
            scores = COALESCE(e.scores, '[]'::jsonb),
            strengths = COALESCE(e.strengths, '[]'::jsonb),
            weaknesses = COALESCE(e.weaknesses, '[]'::jsonb)
        FROM candidate_evaluations e
        WHERE e.candidate_id = c.id
    """)
    op.execute("""
        UPDATE candidates c SET "pastStages" = sub.stages
        FROM (
            SELECT candidate_id, jsonb_agg(stage ORDER BY changed_at) AS stages
            FROM candidate_stage_history
            GROUP BY candidate_id
        ) AS sub
        WHERE sub.candidate_id = c.id
    """)
    op.execute("""
        UPDATE candidates c SET notes = sub.notes
        FROM (
            SELECT candidate_id, jsonb_agg(jsonb_build_object('author', COALESCE(author_email, author_name), 'date', to_char(created_at, 'YYYY-MM-DD'), 'content', content) ORDER BY created_at DESC) AS notes
            FROM candidate_notes
            GROUP BY candidate_id
        ) AS sub
        WHERE sub.candidate_id = c.id
    """)

    op.drop_table('candidate_evaluations')
    op.drop_table('candidate_stage_history')
    op.drop_table('candidate_notes')
    candidate_stage_enum.drop(op.get_bind(), checkfirst=True)
