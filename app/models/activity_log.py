from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SAEnum
from app.core.database import BaseModelDB
from app.schemas.activity_log import ActionType

class ActivityLog(BaseModelDB):
    __tablename__ = "activity_logs"
    timestamp = Column(DateTime, default=datetime.now, index=True)
    action_type = Column(
        SAEnum(ActionType, name="action_type_enum", values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
        index=True,
    )
    description = Column(String, nullable=False)
    user_name = Column(String, nullable=False)  # Name of recruiter or "System (Applicant)"
    user_email = Column(String, nullable=True)  # Email of recruiter or None
    job_id = Column(String, nullable=True, index=True)
    candidate_id = Column(String, nullable=True)
