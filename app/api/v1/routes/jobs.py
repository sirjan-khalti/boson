from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.job import JobCreate, JobResponse, JobStatusUpdate
from app.api.deps import RequireRole, get_current_user
from app.models.user import User
from app.services import job_service
from app.services.activity_logger import log_activity

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/fetch", response_model=List[JobResponse])
def get_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return job_service.get_all(db, skip, limit)


@router.get("/active", response_model=List[JobResponse])
def get_active_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return job_service.get_active(db, skip, limit)


@router.get("/closed", response_model=List[JobResponse])
def get_closed_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return job_service.get_closed(db, skip, limit)


@router.get("/archived", response_model=List[JobResponse])
def get_archived_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return job_service.get_archived(db, skip, limit)


@router.get("/departments", response_model=List[str])
def get_departments(db: Session = Depends(get_db)):
    return job_service.get_departments(db)


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = job_service.get_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/create", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN"])),
):
    new_job = job_service.create(db, job)
    log_activity(
        db=db,
        action_type="job_created",
        description=f"{current_user.name} ({current_user.role}) created a new job: {new_job.title} ({new_job.department})",
        user_name=current_user.name,
        user_email=current_user.email,
        job_id=new_job.id,
    )
    return new_job


@router.post("/{job_id}/status", response_model=JobResponse)
def update_job_status(
    job_id: str,
    status_update: JobStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN", "RECRUITER"])),
):
    from app.models.job import Job as JobModel
    existing = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")

    if status_update.status == "Active" and not job_service.can_reopen(existing):
        raise HTTPException(
            status_code=400,
            detail="This job has been closed for more than 30 days and is archived. It cannot be reopened.",
        )

    updated = job_service.update_status(db, job_id, status_update.status)
    log_activity(
        db=db,
        action_type="job_status_updated",
        description=f"{current_user.name} ({current_user.role}) updated job '{updated.title}' status to {status_update.status}",
        user_name=current_user.name,
        user_email=current_user.email,
        job_id=updated.id,
    )
    return updated
