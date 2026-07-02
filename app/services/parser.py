import asyncio
import os
import json
import fitz
import requests
from groq import AsyncGroq
from tempfile import NamedTemporaryFile
from fastapi.concurrency import run_in_threadpool
from app.core.config import settings
from app.core.llm_utils import call_groq_json
from app.core.logger import logger

# =========================================================
# CONFIG
# =========================================================
MODEL = "llama-3.3-70b-versatile"

client = AsyncGroq(api_key=settings.GROQ_API_KEY, timeout=30.0, max_retries=0)


# =========================================================
# SCHEMA
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


# =========================================================
# HELPERS
# =========================================================
def extract_pdf_text(file_path: str) -> str:
    """
    Extract text from PDF file
    """

    text = ""

    doc = fitz.open(file_path)

    for page in doc:
        text += page.get_text()

    doc.close()

    return text.strip()


def download_pdf(url: str) -> str:
    """
    Download PDF from URL (MinIO/S3/public URL)
    Returns temp file path
    """

    response = requests.get(url, timeout=10.0)

    response.raise_for_status()

    temp_file = NamedTemporaryFile(delete=False, suffix=".pdf")

    temp_file.write(response.content)
    temp_file.close()

    return temp_file.name


# =========================================================
# MAIN PARSER
# =========================================================
async def parse_candidate_cv(cv_source: str) -> dict:
    """
    Parse candidate CV from:
    - local file path
    - MinIO/S3/public URL

    Returns structured JSON
    """

    temp_downloaded = False

    try:
        # =================================================
        # LOAD PDF
        # =================================================
        if cv_source.startswith("http://") or cv_source.startswith("https://"):
            pdf_path = await run_in_threadpool(download_pdf, cv_source)
            temp_downloaded = True
        else:
            pdf_path = cv_source

        # =================================================
        # EXTRACT TEXT
        # =================================================
        cv_text = await run_in_threadpool(extract_pdf_text, pdf_path)

        # =================================================
        # PROMPT
        # =================================================
        prompt = f"""
You are an expert ATS resume parser.

Extract information from the CV into the provided JSON schema using ONLY the CV content.

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON.
- Do NOT return markdown.
- Do NOT explain anything.
- Do NOT wrap output in backticks.
- Follow the schema EXACTLY.
- Do NOT add keys outside the schema except inside custom_fields.
- Preserve all nested structures exactly.
- Arrays must contain properly structured objects.
- Do not include trailing commas.

ANTI-HALLUCINATION RULES:
- Do NOT infer, assume, guess, normalize, or fabricate missing information.
- Do NOT create placeholder values like fake dates, fake grades, fake awards, fake projects, fake locations, fake summaries, or fake experience years.
- Do NOT infer gender, date_of_birth, nationality, address, grades, notice period, preferred locations, authorization, employment type, or total experience unless explicitly stated.
- If a field is missing, use:
  - string => ""
  - number => 0
  - boolean => false
  - array => []
  - object => {{}}

EXTRACTION RULES:
- Preserve ALL meaningful information from the CV.
- Preserve exact wording from the CV whenever possible.
- Keep metrics, numbers, percentages, quantities, and achievements EXACTLY as written.
- Keep capitalization, wording, terminology, company names, institution names, titles, URLs, and tools exactly as written.
- Do NOT shorten bullet points.
- Do NOT merge unrelated sections.
- If multiple bullet points belong to the same experience/project/activity, combine them into one string separated by " | " without losing information.
- Dates should be ISO format ONLY when clearly stated or directly inferable from explicit CV dates.
- If only month and year are given, use YYYY-MM.
- If only year is given, use YYYY.
- If date range says Present, set end_date to "" and currently_working to true where applicable.
- Preserve URLs exactly as written.

SECTION HANDLING:
- Experience section items must go into experience.
- Education section items must go into education.
- Project/case study items must go into projects.
- Skills/tools/competencies must go into skills.
- Languages must go into languages.
- Certifications only if explicitly present.
- Awards/achievements only if explicitly present.
- Hackathons, leadership, extracurriculars, coursework, mentorships, sponsorships, event metrics, and other information that does not cleanly fit the schema must go inside custom_fields.
- For custom_fields, use clear valid JSON keys such as "relevant_coursework", "hackathon", "leadership_and_extracurriculars".
- Do NOT discard any CV content.

FIELD-SPECIFIC RULES:
- professional_summary.summary should be empty unless the CV contains an explicit summary/objective/profile section.
- total_experience_years must be 0 unless explicitly stated in the CV.
- projects must reflect actual CV projects only; never generate generic technical project names. DONOT SUMMARIZE PROJECTS. Use exact project names and descriptions from the CV. INCLUDE ALL PROJECTS EVEN IF THEY SEEM JUNIOR OR NON-TECHNICAL. If the CV has a "case study" or "project" section, those items must go into projects even if they seem non-technical.
- technologies_used should include only tools/technologies explicitly connected to that item or clearly listed in the CV.
- education.location must be taken only if explicitly stated near the institution or clearly part of the institution line.
- grade must be empty unless explicitly stated.


SCHEMA:
{json.dumps(CANDIDATE_SCHEMA, indent=2)}

CV CONTENT:
-------------------------
{cv_text}
"""

        # =================================================
        # API CALL
        # =================================================
        parsed = await call_groq_json(
            client,
            log_context="CV parsing",
            model=MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a strict JSON resume parser. "
                        "Always return valid JSON matching schema exactly."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )
        logger.info("Successfully parsed CV")
        return parsed

    finally:
        # =================================================
        # CLEAN TEMP FILE
        # =================================================
        if temp_downloaded and os.path.exists(pdf_path):
            os.remove(pdf_path)


# =========================================================
# EXAMPLE USAGE
# =========================================================
if __name__ == "__main__":
    # LOCAL FILE
    result = asyncio.run(parse_candidate_cv("cv.pdf"))

    # OR URL
    # result = asyncio.run(parse_candidate_cv(
    #     "https://your-minio-url/candidate-cv.pdf"
    # ))

    print(json.dumps(result, indent=2, ensure_ascii=False))
