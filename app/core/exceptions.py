class ServiceError(Exception):
    """Base class for domain/validation errors raised outside of route handlers.

    Translated into an HTTP response by the global handler in main.py,
    so services (and other non-route code) never need to import FastAPI's
    HTTPException. Prefer one of the named subclasses below; fall back to
    this base class directly only when none of them fit.
    """

    status_code = 500

    def __init__(self, status_code: int = None, detail: str = "", headers: dict | None = None):
        if status_code is not None:
            self.status_code = status_code
        self.detail = detail
        self.headers = headers
        super().__init__(detail)


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
