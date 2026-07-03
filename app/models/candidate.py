from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import BaseModelDB
from app.schemas.candidate import CandidateStage, EvaluationStatus, Tier

class Candidates(BaseModelDB):
    __tablename__ = "candidates"
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True)
    
    name = Column(String, nullable=False)
    experience = Column(Float, default=0.0)

    skills = Column(JSONB, default=list)
    achievements = Column(JSONB, default=list)

    salary_expectation = Column(String, nullable=True)
    notice_period = Column(String, nullable=True)
    source = Column(String, nullable=True)

    # Pipeline (current snapshot — history lives in CandidateStageHistory)
    stage = Column(
        SAEnum(CandidateStage, name="candidate_stage_enum", values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
        default=CandidateStage.APPLIED,
        server_default=CandidateStage.APPLIED.value,
        index=True,
    )
    applied_date = Column(DateTime, default=datetime.now)

    # Evaluation snapshot (detail lives in CandidateEvaluation) — kept here
    # so list/filter views (search, min-score filter, sort, the bulk
    # retry-failed query) never need a join.
    match_score = Column(Integer, default=0)
    tier = Column(
        SAEnum(Tier, name="candidate_tier_enum", values_callable=lambda enum: [e.value for e in enum]),
        nullable=True,
        index=True,
    )
    evaluation_status = Column(
        SAEnum(EvaluationStatus, name="evaluation_status_enum", values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
        default=EvaluationStatus.PENDING,
        server_default=EvaluationStatus.PENDING.value,
        index=True,
    )

    cv_filelink = Column(String, nullable=True)

    # Nested JSON columns matching the parser schema
    personal_info = Column(JSONB, default=dict)
    professional_summary = Column(JSONB, default=dict)
    experience_history = Column(JSONB, default=list)
    education_history = Column(JSONB, default=list)
    projects = Column(JSONB, default=list)
    certifications_history = Column(JSONB, default=list)
    languages_history = Column(JSONB, default=list)
    awards = Column(JSONB, default=list)
    publications = Column(JSONB, default=list)
    candidate_preferences = Column(JSONB, default=dict)
    custom_fields = Column(JSONB, default=dict)

    job = relationship("Jobs", back_populates="candidates")
    notes = relationship(
        "CandidateNotes", back_populates="candidate", cascade="all, delete-orphan", order_by="CandidateNotes.created_at.desc()"
    )
    stage_history = relationship(
        "CandidateStageHistory",
        back_populates="candidate",
        cascade="all, delete-orphan",
        order_by="CandidateStageHistory.changed_at",
    )
    evaluation = relationship(
        "CandidateEvaluations", back_populates="candidate", uselist=False, cascade="all, delete-orphan"
    )
