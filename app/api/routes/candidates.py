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
from typing import Annotated, Optional
from uuid import UUID

from app.core.constants import RATE_LIMIT_PARSE_RESUME, RATE_LIMIT_SUBMIT_APPLICATION
from app.core.database import get_db
from app.core.exceptions import RecaptchaVerificationFailedError
from app.models.user import Users
from app.schemas.candidate import (
    CandidateFilterOptionsResponse,
    CandidateListFilters,
    CandidateNoteCreate,
    CandidateResponse,
    CandidateStageUpdate,
    PaginatedCandidatesResponse,
    ParsedResumeResponse,
    RecruitmentReportResponse,
)
from app.core.config import settings
from app.api.dependencies import get_current_user, get_current_user_optional, requires_recruiter
from app.services.recaptcha import verify_recaptcha
from app.core.limiter import limiter
from app.services import candidate as candidate_service

router = APIRouter(tags=["candidates"])


@router.post("/parse", response_model=ParsedResumeResponse)
@limiter.limit(RATE_LIMIT_PARSE_RESUME)
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
            raise RecaptchaVerificationFailedError()

    return await candidate_service.parse_resume(file)


@router.post("/submit", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMIT_SUBMIT_APPLICATION)
async def submit_application(
    request: Request,
    background_tasks: BackgroundTasks,
    candidate: str = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: Optional[Users] = Depends(get_current_user_optional),
):
    # Reachable both anonymously (public careers page) and from the logged-in
    # recruiter portal's Upload CV flow — the service uses current_user's
    # presence to set source ("Careers Page" vs "Referral").
    return await candidate_service.submit_application(db, candidate, file, background_tasks, current_user)


@router.get("/fetch", response_model=PaginatedCandidatesResponse, dependencies=[Depends(get_current_user)])
def get_candidates(
    filters: Annotated[CandidateListFilters, Query()],
    db: Session = Depends(get_db),
):
    return candidate_service.get_paginated(
        db,
        filters.page,
        filters.size,
        filters.jobId,
        filters.search,
        filters.minScore,
        filters.minExp,
        filters.stage,
        filters.tiers,
        filters.source,
        filters.sort_by,
        filters.sort_order,
    )


@router.get("/filters", response_model=CandidateFilterOptionsResponse, dependencies=[Depends(get_current_user)])
def get_candidate_filter_options(db: Session = Depends(get_db)):
    return candidate_service.get_filter_options(db)


@router.get("/reports", response_model=RecruitmentReportResponse, dependencies=[Depends(get_current_user)])
def get_recruitment_report(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db),
):
    return candidate_service.get_recruitment_report(db, start, end)


@router.get("/{candidate_id}", response_model=CandidateResponse, dependencies=[Depends(get_current_user)])
def get_candidate_by_id(
    candidate_id: UUID,
    db: Session = Depends(get_db),
):
    return candidate_service.get_by_id(db, candidate_id)


@router.post("/{candidate_id}/stage", response_model=CandidateResponse)
def update_candidate_stage(
    candidate_id: UUID,
    stage_update: CandidateStageUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(requires_recruiter),
):
    return candidate_service.update_stage(db, candidate_id, stage_update.stage, current_user)


@router.post("/{candidate_id}/notes", response_model=CandidateResponse)
def add_candidate_note(
    candidate_id: UUID,
    note: CandidateNoteCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(requires_recruiter),
):
    return candidate_service.add_note(db, candidate_id, note.content, current_user)
