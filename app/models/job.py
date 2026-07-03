from sqlalchemy import Column, String, Integer, DateTime, Date, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import BaseModelDB
from app.schemas.job import JobStatus

class Job(BaseModelDB):
    __tablename__ = "jobs"
    title = Column(String, nullable=False)
    department = Column(String, nullable=False)
    location = Column(String, nullable=False)
    type = Column(String, nullable=False)
    status = Column(
        SAEnum(JobStatus, name="job_status_enum", values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
        default=JobStatus.ACTIVE,
        server_default=JobStatus.ACTIVE.value,
    )
    closed_date = Column(Date, nullable=True)
    applicants = Column(Integer, default=0)
    postedDate = Column(DateTime, default=datetime.now)
    description = Column(Text, nullable=False)
    skills = Column(JSONB, default=list)
    scoring_criteria = Column(JSONB, nullable=False, default=list)

    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")
