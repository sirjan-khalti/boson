from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.job import JobCreate, JobResponse, JobStatusUpdate
from app.api.dependencies import RequireRole
from app.models.user import User
from app.services import job

router = APIRouter(tags=["jobs"])


@router.get("/fetch", response_model=List[JobResponse])
def get_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return job.get_all(db, skip, limit)


@router.get("/active", response_model=List[JobResponse])
def get_active_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return job.get_active(db, skip, limit)


@router.get("/closed", response_model=List[JobResponse])
def get_closed_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return job.get_closed(db, skip, limit)


@router.get("/archived", response_model=List[JobResponse])
def get_archived_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return job.get_archived(db, skip, limit)


@router.get("/departments", response_model=List[str])
def get_departments(db: Session = Depends(get_db)):
    return job.get_departments(db)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    return job.get_active_job_or_404(db, job_id)


@router.post("/create", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN"])),
):
    return job.create_job_with_log(db, job_data, current_user)


@router.post("/{job_id}/status", response_model=JobResponse)
def update_job_status(
    job_id: str,
    status_update: JobStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN", "RECRUITER"])),
):
    return job.set_status(db, job_id, status_update.status, current_user)
