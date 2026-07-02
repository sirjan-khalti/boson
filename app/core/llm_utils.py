import json
import re

import groq

from app.core.exceptions import ServiceUnavailableError
from app.core.logger import logger


def clean_llm_response(content: str) -> str:
    """
    Clean markdown wrappers from LLM response
    """
    content = content.strip()
    content = re.sub(r"^```json", "", content)
    content = re.sub(r"^```", "", content)
    content = re.sub(r"```$", "", content)
    return content.strip()


async def call_groq_json(client: groq.AsyncGroq, *, log_context: str, **create_kwargs) -> dict:
    """
    Call the Groq chat completions API expecting a JSON object response.

    Any failure (network/rate-limit/API error, or a non-JSON response body)
    is logged with full detail and re-raised as a generic
    ServiceUnavailableError, so callers (routes, background tasks) never
    leak raw provider error text to end users.
    """
    try:
        response = await client.chat.completions.create(**create_kwargs)
    except groq.RateLimitError as e:
        logger.error(f"{log_context}: Groq rate limit exceeded: {e}")
        raise ServiceUnavailableError(
            "The AI service is receiving too many requests. Please try again in a moment."
        )
    except groq.APIConnectionError as e:
        logger.error(f"{log_context}: Could not reach Groq (network/timeout): {e}")
        raise ServiceUnavailableError(
            "The AI service is temporarily unreachable. Please try again in a moment."
        )
    except groq.APIStatusError as e:
        logger.error(f"{log_context}: Groq API returned an error (status {e.status_code}): {e}")
        raise ServiceUnavailableError(
            "The AI service is temporarily unavailable. Please try again in a moment."
        )
    except Exception as e:
        logger.error(f"{log_context}: Unexpected error calling Groq: {e}", exc_info=True)
        raise ServiceUnavailableError(
            "The AI service is temporarily unavailable. Please try again in a moment."
        )

    content = clean_llm_response(response.choices[0].message.content or "")
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"{log_context}: Groq returned malformed JSON: {e}")
        raise ServiceUnavailableError("The AI service returned an unexpected response. Please try again.")
