import os
import json
import fitz
import requests
from groq import AsyncGroq
from tempfile import NamedTemporaryFile
from fastapi.concurrency import run_in_threadpool
from app.core.config import settings
from app.core.constants import (
    CANDIDATE_SCHEMA,
    CV_DOWNLOAD_TIMEOUT_SECONDS,
    GROQ_CLIENT_MAX_RETRIES,
    GROQ_CLIENT_TIMEOUT_SECONDS,
    GROQ_MODEL,
    PARSER_PROMPT_TEMPLATE,
)
from app.core.llm_utils import call_groq_json
from app.core.logger import logger

client = AsyncGroq(
    api_key=settings.GROQ_API_KEY,
    timeout=GROQ_CLIENT_TIMEOUT_SECONDS,
    max_retries=GROQ_CLIENT_MAX_RETRIES,
)


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

    response = requests.get(url, timeout=CV_DOWNLOAD_TIMEOUT_SECONDS)

    response.raise_for_status()

    temp_file = NamedTemporaryFile(delete=False, suffix=".pdf")

    temp_file.write(response.content)
    temp_file.close()

    return temp_file.name


async def parse_candidate_cv(cv_source: str) -> dict:
    """
    Parse candidate CV from:
    - local file path
    - MinIO/S3/public URL

    Returns structured JSON
    """

    temp_downloaded = False

    try:
        if cv_source.startswith("http://") or cv_source.startswith("https://"):
            pdf_path = await run_in_threadpool(download_pdf, cv_source)
            temp_downloaded = True
        else:
            pdf_path = cv_source

        cv_text = await run_in_threadpool(extract_pdf_text, pdf_path)

        prompt = PARSER_PROMPT_TEMPLATE.format(
            schema=json.dumps(CANDIDATE_SCHEMA, indent=2),
            cv_text=cv_text,
        )

        parsed = await call_groq_json(
            client,
            log_context="CV parsing",
            model=GROQ_MODEL,
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
        if temp_downloaded and os.path.exists(pdf_path):
            os.remove(pdf_path)
