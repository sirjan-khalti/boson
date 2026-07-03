from pydantic import BaseModel, ConfigDict, Field, computed_field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from uuid import UUID

from app.core.config import settings
from app.core.constants import CV_UPLOAD_DIR
from app.schemas.job import JobStatus
from app.schemas.user import UserResponse

class CandidateStage(str, Enum):
    APPLIED = "Applied"
    SCREENING = "Screening"
    SHORTLISTED = "Shortlisted"
    INTERVIEW = "Interview"
    FINAL_REVIEW = "Final Review"
    OFFER = "Offer"
    HIRED = "Hired"
    REJECTED = "Rejected"

class EvaluationStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

class Tier(str, Enum):
    PENDING = "Pending"
    STRONG_FIT = "Strong Fit"
    MODERATE_FIT = "Moderate Fit"
    WEAK_FIT = "Weak Fit"

class DateRangeFilter(str, Enum):
    TODAY = "today"
    WEEK = "week"
    YEAR = "year"
    ALL = "all"

class JobScopeFilter(str, Enum):
    OPEN = "open"
    ALL = "all"

class AddressSchema(BaseModel):
    city: str = ""
    state: str = ""
    country: str = ""

class ProfilesSchema(BaseModel):
    linkedin: str = ""
    github: str = ""
    portfolio: str = ""

class PersonalInfoSchema(BaseModel):
    full_name: str = ""
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    phone: str = ""
    address: AddressSchema = AddressSchema()
    profiles: ProfilesSchema = ProfilesSchema()

class ProfessionalSummarySchema(BaseModel):
    summary: str = ""
    total_experience_years: float = 0.0
    notice_period_days: int = 0
    preferred_locations: List[str] = []
    authorized_to_work_in_nepal: bool = False
    expected_salary: str = ""

class ExperienceItemSchema(BaseModel):
    company_name: str = ""
    job_title: str = ""
    employment_type: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    currently_working: bool = False
    work_summary: str = ""
    technologies_used: List[str] = []

class EducationItemSchema(BaseModel):
    degree: str = ""
    field_of_study: str = ""
    institution_name: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    grade: str = ""

class ProjectItemSchema(BaseModel):
    project_name: str = ""
    description: str = ""
    technologies_used: List[str] = []
    github_url: str = ""
    live_url: str = ""

class CertificationItemSchema(BaseModel):
    name: str = ""
    issuer: str = ""
    issue_date: str = ""

class LanguageItemSchema(BaseModel):
    language: str = ""
    proficiency: str = ""

class PreferencesSchema(BaseModel):
    preferred_roles: List[str] = []
    preferred_locations: List[str] = []
    preferred_employment_type: List[str] = []

class CandidateBase(BaseModel):
    job_id: UUID
    personal_info: PersonalInfoSchema = PersonalInfoSchema()
    professional_summary: ProfessionalSummarySchema = ProfessionalSummarySchema()
    skills: List[str] = []
    experience: List[ExperienceItemSchema] = []
    education: List[EducationItemSchema] = []
    projects: List[ProjectItemSchema] = []
    certifications: List[CertificationItemSchema] = []
    languages: List[LanguageItemSchema] = []
    achievements: List[str] = []
    awards: List[str] = []
    candidate_preferences: PreferencesSchema = PreferencesSchema()
    custom_fields: Dict[str, Any] = {}

class CandidateCreate(CandidateBase):
    pass

class ParsedResumeResponse(CandidateBase):
    """CandidateBase minus job_id — a resume hasn't been tied to a job yet
    at parse time, that only happens on /submit."""
    job_id: Optional[UUID] = None

class CandidateNoteResponse(BaseModel):
    id: UUID
    author: Optional[UserResponse] = None
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CandidateStageHistoryEntry(BaseModel):
    stage: CandidateStage
    changed_at: datetime
    changed_by: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class CandidateEvaluationDetail(BaseModel):
    summary: Optional[str] = None
    scores: List[Dict[str, Any]] = []
    strengths: List[str] = []
    weaknesses: List[str] = []
    evaluated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class CandidateResponse(BaseModel):
    id: UUID
    job_id: UUID
    stage: CandidateStage
    stage_history: List[CandidateStageHistoryEntry] = []
    applied_date: datetime
    match_score: int
    tier: Optional[Tier] = None
    evaluation_status: EvaluationStatus
    evaluation: Optional[CandidateEvaluationDetail] = None
    notes: List[CandidateNoteResponse] = []

    # Real columns — genuinely used for search/filter/sort (see
    # app/models/candidate.py for why these stay stored)
    name: str = ""
    experience: float = 0.0

    cv_filelink: Optional[str] = None

    # Nested fields matching the parser schema
    personal_info: PersonalInfoSchema = PersonalInfoSchema()
    professional_summary: ProfessionalSummarySchema = ProfessionalSummarySchema()
    skills: List[str] = []
    projects: List[ProjectItemSchema] = []
    achievements: List[str] = []
    awards: List[str] = []
    publications: Optional[List[str]] = []
    candidate_preferences: PreferencesSchema = PreferencesSchema()
    custom_fields: Dict[str, Any] = {}

    experience_history: List[ExperienceItemSchema] = []
    education_history: List[EducationItemSchema] = []
    certifications_history: List[CertificationItemSchema] = []
    languages_history: List[LanguageItemSchema] = []

    salary_expectation: Optional[str] = None
    notice_period: Optional[str] = None
    source: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    # Computed, not stored: derived from the nested profile JSON at
    # serialization time so there's no duplicated/staleness-prone copy.
    @computed_field
    @property
    def email(self) -> str:
        return self.personal_info.email

    @computed_field
    @property
    def phone(self) -> str:
        return self.personal_info.phone

    @computed_field
    @property
    def title(self) -> Optional[str]:
        return self.experience_history[0].job_title if self.experience_history else None

    @computed_field
    @property
    def company(self) -> Optional[str]:
        return self.experience_history[0].company_name if self.experience_history else None

    @computed_field
    @property
    def location(self) -> Optional[str]:
        addr = self.personal_info.address
        parts = [p for p in [addr.city, addr.country] if p]
        return ", ".join(parts) if parts else None

    @computed_field
    @property
    def education(self) -> Optional[str]:
        return self.education_history[0].degree if self.education_history else None

    @computed_field
    @property
    def cv_url(self) -> Optional[str]:
        if not self.cv_filelink:
            return None
        return f"{settings.BASE_URL}/{CV_UPLOAD_DIR}/{self.cv_filelink}"

class CandidateStageUpdate(BaseModel):
    stage: CandidateStage

class CandidateNoteCreate(BaseModel):
    content: str

class CandidateListFilters(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=10000)
    jobId: Optional[UUID] = None
    search: Optional[str] = None
    minScore: Optional[int] = None
    minExp: Optional[float] = None
    stage: Optional[str] = None
    tiers: Optional[List[str]] = None
    source: Optional[str] = None
    sort_by: str = "match_score"
    sort_order: str = "desc"

class EvaluationScopeFilters(BaseModel):
    date_range: DateRangeFilter = DateRangeFilter.TODAY
    job_scope: JobScopeFilter = JobScopeFilter.OPEN

class EvaluationListFilters(EvaluationScopeFilters):
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=200)

class PaginatedCandidatesResponse(BaseModel):
    items: List[CandidateResponse]
    total: int
    page: int
    size: int
    pages: int

class CandidateFilterOptionsResponse(BaseModel):
    stages: List[str]
    tiers: List[str]
    sources: List[str]

class FunnelCounts(BaseModel):
    applied: int
    screened: int
    shortlisted: int
    interviewed: int
    finalReview: int
    offer: int
    hired: int
    rejected: int

class RecruitmentSummaryStats(FunnelCounts):
    jobs: int

class RecruitmentJobBreakdown(FunnelCounts):
    id: UUID
    title: str
    department: str
    status: JobStatus
    postedDate: str

class RecruitmentReportResponse(BaseModel):
    summaryStats: RecruitmentSummaryStats
    jobBreakdown: List[RecruitmentJobBreakdown]

class RetryFailedEvaluationsResponse(BaseModel):
    queued: int
