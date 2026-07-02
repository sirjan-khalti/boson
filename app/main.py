import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import text
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.database import engine
from app.api import api_router
from app.core.limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database tables are now managed by Alembic
    yield

# Ensure static directories exist before mounting
os.makedirs("static/cvs", exist_ok=True)

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
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unreachable: {str(e)}")

app.include_router(api_router, prefix="/api/v1")
