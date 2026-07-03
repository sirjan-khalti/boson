from sqlalchemy import Column, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import BaseModelDB
from app.schemas.candidate import CandidateStage

class CandidateStageHistory(BaseModelDB):
    __tablename__ = "candidate_stage_history"

    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    stage = Column(
        SAEnum(CandidateStage, name="candidate_stage_enum", values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
    )
    changed_at = Column(DateTime, default=datetime.now, index=True)
    # Nullable for the initial "Applied" row, which is system-generated at
    # public submission with no user in context — not for delete-survival
    # (users are only ever soft-deactivated, never hard-deleted, so this FK
    # always resolves once set). Actor name/email are read live via the
    # relationship below rather than snapshotted.
    changed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    candidate = relationship("Candidates", back_populates="stage_history")
    changed_by = relationship("Users")
