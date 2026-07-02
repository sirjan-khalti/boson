from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

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
    jobId: str
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
    
    cvUrl: Optional[str] = None
    cv_filelink: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateResponse(BaseModel):
    id: str
    jobId: str
    stage: str
    pastStages: List[str] = []
    appliedDate: datetime
    match: int
    tier: Optional[str] = None
    evaluation_status: EvaluationStatus
    summary: Optional[str] = None
    notes: List[Dict[str, Any]] = []
    scores: List[Dict[str, Any]] = []
    strengths: List[str] = []
    weaknesses: List[str] = []
    cvUrl: Optional[str] = None
    cv_filelink: Optional[str] = None
    
    # Flat compat fields for recruiter view
    name: str = ""
    email: str = ""
    phone: str = ""
    avatar: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    experience: float = 0.0
    location: Optional[str] = None
    education: Optional[str] = None
    
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
    
    # History lists matching DB Column names but exposed to JSON
    experience_history: List[ExperienceItemSchema] = []
    education_history: List[EducationItemSchema] = []
    certifications_history: List[CertificationItemSchema] = []
    languages_history: List[LanguageItemSchema] = []
    
    # Legacy nested fields
    educationHistory: List[Dict[str, Any]] = []
    workHistory: List[Dict[str, Any]] = []
    links: Dict[str, Optional[str]] = {}
    certifications: List[str] = []
    languages: List[Dict[str, Any]] = []
    
    salaryExpectation: Optional[str] = None
    availability: Optional[str] = None
    workAuthorization: Optional[str] = None
    noticePeriod: Optional[str] = None
    source: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CandidateStageUpdate(BaseModel):
    stage: CandidateStage

class CandidateNoteCreate(BaseModel):
    content: str

class PaginatedCandidatesResponse(BaseModel):
    items: List[CandidateResponse]
    total: int
    page: int
    size: int
    pages: int

