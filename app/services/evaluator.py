import json
from groq import AsyncGroq
from app.core.config import settings
from app.core.constants import (
    DEFAULT_SCORING_CRITERIA,
    EVALUATION_SCHEMA,
    EVALUATOR_PROMPT_TEMPLATE,
    GROQ_CLIENT_MAX_RETRIES,
    GROQ_CLIENT_TIMEOUT_SECONDS,
    GROQ_MODEL,
)
from app.core.llm_utils import call_groq_json
from app.core.logger import logger

client = AsyncGroq(
    api_key=settings.GROQ_API_KEY,
    timeout=GROQ_CLIENT_TIMEOUT_SECONDS,
    max_retries=GROQ_CLIENT_MAX_RETRIES,
)


# =========================================================
# MAIN FUNCTION
# =========================================================
async def evaluate_candidate(
    candidate_data: dict,
    job_description: str,
    scoring_criteria: list[dict] | None = None,
    model: str = GROQ_MODEL,
) -> dict:
    """
    Evaluate candidate against a job description

    Parameters
    ----------
    candidate_data : dict
        Parsed candidate JSON

    job_description : str
        Full job description text

    scoring_criteria : list[dict]
        Weighted evaluation criteria; falls back to DEFAULT_SCORING_CRITERIA if omitted

    model : str
        Groq model name

    Returns
    -------
    dict
    """
    scoring_criteria = scoring_criteria or DEFAULT_SCORING_CRITERIA

    prompt = EVALUATOR_PROMPT_TEMPLATE.format(
        evaluation_schema=json.dumps(EVALUATION_SCHEMA, indent=2),
        scoring_criteria=json.dumps(scoring_criteria, indent=2),
        candidate_data=json.dumps(candidate_data, indent=2),
        job_description=job_description
    )

    result = await call_groq_json(
        client,
        log_context="candidate evaluation",
        model=model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a strict ATS evaluator. " "Always return valid JSON only."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )

    logger.info("Successfully evaluated candidate.")

    return result
