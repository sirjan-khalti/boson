from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.dependencies import requires_superadmin
from app.schemas.candidate import (
    CandidateResponse,
    PaginatedCandidatesResponse,
    DateRangeFilter,
    JobScopeFilter,
)
from app.services import candidate

router = APIRouter(tags=["evaluations"])


@router.get(
    "/fetch",
    response_model=PaginatedCandidatesResponse,
    dependencies=[Depends(requires_superadmin)],
)
def get_evaluations(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    date_range: DateRangeFilter = Query(DateRangeFilter.TODAY),
    job_scope: JobScopeFilter = Query(JobScopeFilter.OPEN),
    db: Session = Depends(get_db),
):
    """
    Paginated candidate list with evaluation status, for the evaluation
    monitoring page. Accessible only to SUPERADMIN.
    """
    return candidate.get_evaluation_overview(db, page, size, date_range, job_scope)


@router.post(
    "/{candidate_id}/retry",
    response_model=CandidateResponse,
    dependencies=[Depends(requires_superadmin)],
)
def retry_evaluation(
    candidate_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Re-queue the AI evaluation for a single candidate, regardless of its
    current status.
    """
    return candidate.retry_evaluation(db, candidate_id, background_tasks)


@router.post(
    "/retry-failed",
    dependencies=[Depends(requires_superadmin)],
)
def retry_all_failed(
    background_tasks: BackgroundTasks,
    date_range: DateRangeFilter = Query(DateRangeFilter.TODAY),
    job_scope: JobScopeFilter = Query(JobScopeFilter.OPEN),
    db: Session = Depends(get_db),
):
    """
    Re-queue the AI evaluation for every FAILED candidate matching the given
    filters (mirrors the filters applied on the evaluation page).
    """
    count = candidate.retry_all_failed_evaluations(db, background_tasks, date_range, job_scope)
    return {"queued": count}
