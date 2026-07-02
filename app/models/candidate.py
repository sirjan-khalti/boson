from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Float, Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import BaseModelDB
from app.schemas.candidate import EvaluationStatus, Tier

class Candidate(BaseModelDB):
    __tablename__ = "candidates"
    jobId = Column(String, ForeignKey("jobs.id"), nullable=False, index=True)
    
    # Flat compat fields
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    experience = Column(Float, default=0.0)
    location = Column(String, nullable=True)
    education = Column(String, nullable=True)
    
    # Legacy nested lists
    educationHistory = Column(JSONB, default=list)
    skills = Column(JSONB, default=list)
    missingSkills = Column(JSONB, default=list)
    languages = Column(JSONB, default=list)
    certifications = Column(JSONB, default=list)
    achievements = Column(JSONB, default=list)
    links = Column(JSONB, default=dict)
    workHistory = Column(JSONB, default=list)
    
    # Legacy form metadata
    salaryExpectation = Column(String, nullable=True)
    noticePeriod = Column(String, nullable=True)
    source = Column(String, nullable=True)
    
    # Pipeline & ATS Data
    stage = Column(String, default="Applied", index=True)
    pastStages = Column(JSONB, default=list)
    appliedDate = Column(DateTime, default=datetime.now)
    match = Column(Integer, default=0)
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
    summary = Column(Text, nullable=True)
    notes = Column(JSONB, default=list)
    scores = Column(JSONB, default=list)
    strengths = Column(JSONB, default=list)
    weaknesses = Column(JSONB, default=list)
    cvUrl = Column(String, nullable=True)
    cv_filelink = Column(String, nullable=True)

    # New Nested JSON columns matching the parser schema
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

    job = relationship("Job", back_populates="candidates")
