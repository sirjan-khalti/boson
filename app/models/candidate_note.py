from sqlalchemy import Column, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import BaseModelDB

class CandidateNotes(BaseModelDB):
    __tablename__ = "candidate_notes"

    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    # Nullable because deletion is SET NULL — but users are only ever
    # soft-deactivated, never hard-deleted, so this FK always resolves in
    # practice. Author name/email are read live via the relationship below
    # rather than snapshotted, since there's no drift risk to guard against.
    author_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now, index=True)

    candidate = relationship("Candidates", back_populates="notes")
    author = relationship("Users")
