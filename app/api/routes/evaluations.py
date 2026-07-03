from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session
from typing import Annotated
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies import requires_superadmin
from app.schemas.candidate import (
    CandidateResponse,
    EvaluationListFilters,
    EvaluationScopeFilters,
    PaginatedCandidatesResponse,
    RetryFailedEvaluationsResponse,
)
from app.services import candidate

router = APIRouter(tags=["evaluations"])


@router.get(
    "/fetch",
    response_model=PaginatedCandidatesResponse,
    dependencies=[Depends(requires_superadmin)],
)
def get_evaluations(
    filters: Annotated[EvaluationListFilters, Query()],
    db: Session = Depends(get_db),
):
    """
    Paginated candidate list with evaluation status, for the evaluation
    monitoring page. Accessible only to SUPERADMIN.
    """
    return candidate.get_evaluation_overview(db, filters.page, filters.size, filters.date_range, filters.job_scope)


@router.post(
    "/{candidate_id}/retry",
    response_model=CandidateResponse,
    dependencies=[Depends(requires_superadmin)],
)
def retry_evaluation(
    candidate_id: UUID,
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
    response_model=RetryFailedEvaluationsResponse,
    dependencies=[Depends(requires_superadmin)],
)
def retry_all_failed(
    background_tasks: BackgroundTasks,
    filters: Annotated[EvaluationScopeFilters, Query()],
    db: Session = Depends(get_db),
):
    """
    Re-queue the AI evaluation for every FAILED candidate matching the given
    filters (mirrors the filters applied on the evaluation page).
    """
    count = candidate.retry_all_failed_evaluations(db, background_tasks, filters.date_range, filters.job_scope)
    return {"queued": count}
