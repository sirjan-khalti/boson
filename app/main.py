import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.constants import CV_UPLOAD_DIR
from app.core.exceptions import ServiceError
from app.core.logger import logger
from app.api.routes.candidates import router as candidates_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.auth import router as auth_router
from app.api.routes.team import router as team_router
from app.api.routes.activity_logs import router as activity_logs_router
from app.api.routes.evaluations import router as evaluations_router
from app.core.limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database tables are now managed by Alembic
    yield

# Ensure static directories exist before mounting
os.makedirs(CV_UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Khalti Careers ATS API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount static files to serve CVs
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError):
    log_line = f"{request.method} {request.url.path} -> {exc.status_code} {exc.detail}"
    if exc.status_code >= 500:
        logger.error(log_line)
    else:
        logger.info(log_line)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

@app.get("/", tags=["root"])
def read_root():
    return {
        "title": "Khalti Careers ATS API",
        "description": "Fruitful and functional API for tracking candidates, job applications, and AI resume evaluations.",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check_url": "/health"
    }

@app.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy"}

app.include_router(candidates_router, prefix="/api/v1/candidates")
app.include_router(jobs_router, prefix="/api/v1/jobs")
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(team_router, prefix="/api/v1/team")
app.include_router(activity_logs_router, prefix="/api/v1/activity-logs")
app.include_router(evaluations_router, prefix="/api/v1/evaluations")
