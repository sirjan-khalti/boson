from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Annotated, List
from uuid import UUID

from app.core.database import get_db
from app.schemas.common import PaginationParams
from app.schemas.job import JobCreate, JobResponse, JobStatusUpdate
from app.api.dependencies import requires_admin, requires_recruiter
from app.models.user import Users
from app.services import job

router = APIRouter(tags=["jobs"])


@router.get("/fetch", response_model=List[JobResponse])
def get_jobs(pagination: Annotated[PaginationParams, Query()], db: Session = Depends(get_db)):
    return job.get_all(db, pagination.skip, pagination.limit)


@router.get("/active", response_model=List[JobResponse])
def get_active_jobs(pagination: Annotated[PaginationParams, Query()], db: Session = Depends(get_db)):
    return job.get_active(db, pagination.skip, pagination.limit)


@router.get("/closed", response_model=List[JobResponse])
def get_closed_jobs(pagination: Annotated[PaginationParams, Query()], db: Session = Depends(get_db)):
    return job.get_closed(db, pagination.skip, pagination.limit)


@router.get("/archived", response_model=List[JobResponse])
def get_archived_jobs(pagination: Annotated[PaginationParams, Query()], db: Session = Depends(get_db)):
    return job.get_archived(db, pagination.skip, pagination.limit)


@router.get("/departments", response_model=List[str])
def get_departments(db: Session = Depends(get_db)):
    return job.get_departments(db)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    return job.require_active_job(db, job_id)


@router.post("/create", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(requires_admin),
):
    return job.create_job_with_log(db, job_data, current_user)


@router.post("/{job_id}/status", response_model=JobResponse)
def update_job_status(
    job_id: UUID,
    status_update: JobStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(requires_recruiter),
):
    return job.set_status(db, job_id, status_update.status, current_user)
