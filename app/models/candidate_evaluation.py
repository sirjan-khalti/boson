from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base

class CandidateEvaluations(Base):
    """
    A strict 1:1 split of Candidate, not a history table: candidate_id is
    both the primary key and the foreign key, so there is exactly one row
    per candidate. Re-evaluation overwrites this row in place — no attempt
    history is kept. match_score/tier/evaluation_status stay denormalized
    on Candidate itself so list/filter views never need to join here.
    """
    __tablename__ = "candidate_evaluations"

    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), primary_key=True)
    summary = Column(Text, nullable=True)
    scores = Column(JSONB, default=list)
    strengths = Column(JSONB, default=list)
    weaknesses = Column(JSONB, default=list)
    evaluated_at = Column(DateTime, nullable=True)

    candidate = relationship("Candidates", back_populates="evaluation", uselist=False)
