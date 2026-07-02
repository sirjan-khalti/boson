from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    Query,
    Header,
    Request,
    status,
)
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.exceptions import BadRequestError
from app.models.user import User
from app.schemas.candidate import (
    CandidateResponse,
    CandidateStageUpdate,
    CandidateNoteCreate,
    PaginatedCandidatesResponse,
)
from app.core.config import settings
from app.api.dependencies import RequireRole, get_current_user
from app.core.logger import logger
from app.services.recaptcha import verify_recaptcha
from app.core.limiter import limiter
from app.services import candidate as candidate_service

router = APIRouter(tags=["candidates"])


@router.post("/parse")
@limiter.limit("10/minute")
async def parse_cv(
    request: Request,
    file: UploadFile = File(...),
    x_recaptcha_token: Optional[str] = Header(None, alias="X-Recaptcha-Token"),
):
    if settings.RECAPTCHA_API_KEY:
        is_valid = await verify_recaptcha(
            token=x_recaptcha_token,
            action="parse_resume",
            site_key=settings.RECAPTCHA_SITE_KEY,
            project_id=settings.RECAPTCHA_PROJECT_ID,
            api_key=settings.RECAPTCHA_API_KEY,
        )
        if not is_valid:
            raise BadRequestError("reCAPTCHA verification failed.")
    else:
        logger.warning(
            "reCAPTCHA API Key is not set. Bypassing verification for local development."
        )

    return await candidate_service.parse_resume(file)


@router.post("/submit", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def submit_application(
    request: Request,
    background_tasks: BackgroundTasks,
    candidate: str = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    return await candidate_service.submit_application(db, candidate, file, background_tasks)


@router.get("/fetch", response_model=PaginatedCandidatesResponse, dependencies=[Depends(get_current_user)])
def get_candidates(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=10000),
    jobId: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    minScore: Optional[int] = Query(None),
    minExp: Optional[float] = Query(None),
    stage: Optional[str] = Query(None),
    tiers: Optional[List[str]] = Query(None),
    sort_by: str = Query("match"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    return candidate_service.get_paginated(
        db, page, size, jobId, search, minScore, minExp, stage, tiers, sort_by, sort_order
    )


@router.get("/reports", dependencies=[Depends(get_current_user)])
def get_recruitment_report(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db),
):
    return candidate_service.get_recruitment_report(db, start, end)


@router.get("/{candidate_id}", response_model=CandidateResponse, dependencies=[Depends(get_current_user)])
def get_candidate_by_id(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    return candidate_service.get_by_id(db, candidate_id)


@router.post("/{candidate_id}/stage", response_model=CandidateResponse)
def update_candidate_stage(
    candidate_id: str,
    stage_update: CandidateStageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN", "RECRUITER"])),
):
    return candidate_service.update_stage(db, candidate_id, stage_update.stage, current_user)


@router.post("/{candidate_id}/notes", response_model=CandidateResponse)
def add_candidate_note(
    candidate_id: str,
    note: CandidateNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN", "RECRUITER"])),
):
    return candidate_service.add_note(db, candidate_id, note.content, current_user)
