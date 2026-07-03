from app.schemas.user import Role

# =========================================================
# ROLES
# =========================================================
# Roles that can be assigned to a team member (SUPERADMIN is not assignable)
ASSIGNABLE_ROLES = [Role.ADMIN, Role.RECRUITER, Role.VIEWER]

# =========================================================
# RATE LIMITS
# =========================================================
RATE_LIMIT_PARSE_RESUME = "10/minute"
RATE_LIMIT_SUBMIT_APPLICATION = "5/minute"

# =========================================================
# CV STORAGE
# =========================================================
CV_UPLOAD_DIR = "static/cvs"
CV_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

# =========================================================
# GROQ / LLM
# =========================================================
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_CLIENT_TIMEOUT_SECONDS = 30.0
GROQ_CLIENT_MAX_RETRIES = 0

# =========================================================
# CANDIDATE EVALUATION
# =========================================================
MATCH_SCORE_STRONG_FIT_THRESHOLD = 80
MATCH_SCORE_MODERATE_FIT_THRESHOLD = 50

# Keep in sync with the sortable <th> columns in
# recruiter view/src/pages/Candidates.tsx — a frontend column that isn't
# listed here silently falls back to sorting by match instead of erroring.
CANDIDATE_ALLOWED_SORT_FIELDS = {"name", "match", "experience", "stage", "appliedDate"}

# =========================================================
# CANDIDATE SUBMISSION DEFAULTS
# =========================================================
DEFAULT_SALARY_EXPECTATION = "Negotiable"
CANDIDATE_SOURCE_CAREERS_PAGE = "Careers Page"
CANDIDATE_SOURCE_REFERRAL = "Referral"

# =========================================================
# JOBS
# =========================================================
JOB_ARCHIVE_AFTER_DAYS = 30

# =========================================================
# AUTH
# =========================================================
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 15

# =========================================================
# CV PARSER SCHEMA
# =========================================================
CANDIDATE_SCHEMA = {
    "personal_info": {
        "full_name": "",
        "first_name": "",
        "last_name": "",
        "email": "",
        "phone": "",
        "address": {"city": "", "state": "", "country": ""},
        "profiles": {"linkedin": "", "github": "", "portfolio": ""},
    },
    "professional_summary": {
        "summary": "",
        "total_experience_years": 0,
        "notice_period_days": 0,
        "preferred_locations": [],
        "authorized_to_work_in_nepal": False,
        "expected_salary": "",
    },
    "skills": ["", "", ""],
    "experience": [
        {
            "company_name": "",
            "job_title": "",
            "employment_type": "",
            "location": "",
            "start_date": "",
            "end_date": "",
            "currently_working": False,
            "work_summary": "",
            "technologies_used": [],
        }
    ],
    "education": [
        {
            "degree": "",
            "field_of_study": "",
            "institution_name": "",
            "location": "",
            "start_date": "",
            "end_date": "",
            "grade": "",
        }
    ],
    "projects": [
        {
            "project_name": "",
            "description": "",
            "technologies_used": [],
            "github_url": "",
            "live_url": "",
        }
    ],
    "certifications": [{"name": "", "issuer": "", "issue_date": ""}],
    "languages": [{"language": "", "proficiency": ""}],
    "achievements": [],
    "awards": [],
    "candidate_preferences": {
        "preferred_roles": [],
        "preferred_locations": [],
        "preferred_employment_type": [],
    },
    "custom_fields": {},
}

EVALUATION_SCHEMA = {
    "summary": "",
    "match_score": 0,
    "criteria_scores": [
        {
            "criteria": "",
            "weight": 0,
            "score": 0,
            "reason": "specific reason as to why that score given in short",
        }
    ],
    "strengths": [],
    "weaknesses": [],
}

DEFAULT_SCORING_CRITERIA = [
    {
        "criteria": "Relevant Experience",
        "weight": 25,
        "description": (
            "Evaluate how closely the candidate’s experience aligns "
            "with the role requirements, responsibilities, domain, "
            "and expected impact level. Score relative to the seniority "
            "of the role. Internship and entry-level roles should not "
            "be penalized for limited experience if the candidate shows "
            "strong relevance, initiative, ownership, or learning potential."
        ),
    },
    {
        "criteria": "Years of Relevant Experience",
        "weight": 20,
        "description": (
            "Evaluate the candidate’s total relevant experience relative "
            "to the role level and expectations. Use role-adjusted scoring: "
            "for internships and junior roles, smaller durations of highly "
            "relevant experience can still score well; for mid-level and "
            "senior roles, greater depth, progression, and sustained impact "
            "are expected."
        ),
    },
    {
        "criteria": "Education & Qualifications",
        "weight": 15,
        "description": (
            "Relevant academic background, degrees, coursework, "
            "and qualifications aligned with the role requirements."
        ),
    },
    {
        "criteria": "Trainings & Certifications",
        "weight": 15,
        "description": (
            "Relevant certifications, workshops, trainings, "
            "bootcamps, and specialized learning credentials."
        ),
    },
    {
        "criteria": "Technical Knowledge",
        "weight": 10,
        "description": (
            "Evaluate technical stack alignment, tools, frameworks, "
            "platforms, methodologies, and domain-specific knowledge "
            "relevant to the role."
        ),
    },
    {
        "criteria": "Leadership & Strategic Ability",
        "weight": 10,
        "description": (
            "Leadership, ownership, initiative, collaboration, "
            "decision-making, strategic thinking, mentoring, "
            "or organizational contributions appropriate to the role level."
        ),
    },
    {
        "criteria": "Communication & Soft Skills",
        "weight": 5,
        "description": (
            "Communication clarity, teamwork, stakeholder interaction, "
            "documentation quality, collaboration, adaptability, "
            "and interpersonal effectiveness."
        ),
    },
]

EVALUATOR_PROMPT_TEMPLATE = """
You are an expert ATS evaluator and recruiter assistant.

Evaluate the candidate against the job description.

SCORING RULES:
- Total match_score MUST be calculated using weighted criteria
- Total score MUST be out of 100
- Each criterion score MUST respect its weight
- strengths maximum 5 items (minimum 2)
- weaknesses maximum 5 items (minimum 0)
- summary must be EXACTLY one short sentence
- Evaluation must be evidence-based from candidate data
- dont include unneccessary information
- be moderately lenient but not too much

RESPONSE RULES:
- Return ONLY valid JSON
- No markdown
- No explanations
- No extra keys
- Follow output schema EXACTLY

OUTPUT SCHEMA:
{evaluation_schema}

SCORING CRITERIA:
{scoring_criteria}

CANDIDATE:
{candidate_data}

JOB DESCRIPTION:
{job_description}
"""
