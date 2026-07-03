from app.core.constants import CV_MAX_SIZE_BYTES, JOB_ARCHIVE_AFTER_DAYS


class ServiceError(Exception):
    """Base class for domain/validation errors raised outside of route handlers.

    Translated into an HTTP response by the global handler in main.py,
    so services (and other non-route code) never need to import FastAPI's
    HTTPException. Every raise site should use one of the named subclasses
    below — each subclass owns its own status code and message, so error
    text lives here instead of being duplicated at every call site. Fall
    back to constructing ServiceError/one of the generic status subclasses
    directly only for a genuinely one-off case that doesn't warrant a
    named class.
    """

    status_code = 500

    def __init__(self, status_code: int = None, detail: str = "", headers: dict | None = None):
        if status_code is not None:
            self.status_code = status_code
        self.detail = detail
        self.headers = headers
        super().__init__(detail)


# =========================================================
# GENERIC STATUS-CODE BASES
# =========================================================
class BadRequestError(ServiceError):
    status_code = 400

    def __init__(self, detail: str = "Bad request"):
        super().__init__(detail=detail)


class UnauthorizedError(ServiceError):
    status_code = 401

    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(detail=detail, headers={"WWW-Authenticate": "Bearer"})


class ForbiddenError(ServiceError):
    status_code = 403

    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(detail=detail)


class NotFoundError(ServiceError):
    status_code = 404

    def __init__(self, detail: str = "Not found"):
        super().__init__(detail=detail)


class ServiceUnavailableError(ServiceError):
    status_code = 503

    def __init__(self, detail: str = "Service unavailable"):
        super().__init__(detail=detail)


# =========================================================
# AUTH
# =========================================================
class InvalidCredentialsError(UnauthorizedError):
    def __init__(self):
        super().__init__(detail="Incorrect email or password")


class IncorrectOldPasswordError(BadRequestError):
    def __init__(self):
        super().__init__(detail="Incorrect old password")


# =========================================================
# USERS / TEAM
# =========================================================
class InvalidRoleError(BadRequestError):
    def __init__(self):
        super().__init__(detail="Invalid role specified")


class UserNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__(detail="User not found")


class EmailAlreadyExistsError(BadRequestError):
    def __init__(self):
        super().__init__(detail="The user with this email already exists in the system.")


# Role-hierarchy checks (altering/demoting/resetting a SUPERADMIN or ADMIN,
# altering your own role) all fail with the same bare ForbiddenError() —
# same as requires_admin/requires_recruiter/requires_superadmin in
# api/dependencies.py. A 403 says "not allowed"; it doesn't need to narrate
# which internal role-hierarchy rule tripped it.


# =========================================================
# JOBS
# =========================================================
class JobNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__(detail="Job not found")


class JobArchivedError(BadRequestError):
    def __init__(self):
        super().__init__(
            detail=(
                f"This job has been closed for more than {JOB_ARCHIVE_AFTER_DAYS} days "
                "and is archived. It cannot be reopened."
            )
        )


# =========================================================
# CANDIDATES
# =========================================================
class CandidateNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__(detail="Candidate not found")


class JobNotFoundForCandidateError(NotFoundError):
    def __init__(self):
        super().__init__(detail="Job not found for this candidate")


class InvalidCandidateJsonError(BadRequestError):
    def __init__(self):
        super().__init__(detail="Invalid candidate data. Please check your submission and try again.")


class ResumeParsingFailedError(ServiceError):
    status_code = 422

    def __init__(self):
        super().__init__(detail="Please enter your details.")


class InvalidDateFormatError(BadRequestError):
    def __init__(self):
        super().__init__(detail="Invalid date format. Expected YYYY-MM-DD.")


# =========================================================
# CV UPLOAD
# =========================================================
class OnlyPdfSupportedError(BadRequestError):
    def __init__(self):
        super().__init__(detail="Only PDF files are supported.")


class FileTooLargeError(BadRequestError):
    def __init__(self):
        max_mb = CV_MAX_SIZE_BYTES // (1024 * 1024)
        super().__init__(detail=f"File too large. Maximum supported size is {max_mb}MB.")


# =========================================================
# RECAPTCHA
# =========================================================
class RecaptchaVerificationFailedError(BadRequestError):
    def __init__(self):
        super().__init__(detail="reCAPTCHA verification failed.")


# =========================================================
# AI / LLM (Groq)
# =========================================================
# One generic exception for every LLM failure mode (rate limit, network,
# non-2xx response, malformed JSON) — the caller can't act differently on
# any of these, and the specific cause (which vendor, which failure) is
# internal detail that belongs in the server log, not the response body.
# The distinction between failure modes is still captured by the
# logger.error() call at each raise site in llm_utils.py.
class AIServiceUnavailableError(ServiceUnavailableError):
    def __init__(self):
        super().__init__(detail="The service is temporarily unavailable. Please try again in a moment.")
