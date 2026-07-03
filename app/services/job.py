from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.constants import JOB_ARCHIVE_AFTER_DAYS
from app.core.exceptions import ServiceError
from app.models.job import Job
from app.schemas.job import JobCreate, JobStatus
from app.schemas.activity_log import ActionType
from app.services.activity_log import log_activity


def get_all(db: Session, skip: int = 0, limit: int = 100) -> list[Job]:
    return db.query(Job).offset(skip).limit(limit).all()


def get_active(db: Session, skip: int = 0, limit: int = 100) -> list[Job]:
    return db.query(Job).filter(Job.status == JobStatus.ACTIVE).offset(skip).limit(limit).all()


def get_by_id(db: Session, job_id: str) -> Job | None:
    return db.query(Job).filter(Job.id == job_id, Job.status == JobStatus.ACTIVE).first()


def get_any_by_id(db: Session, job_id: str) -> Job | None:
    return db.query(Job).filter(Job.id == job_id).first()


def get_departments(db: Session) -> list[str]:
    rows = db.query(Job.department).distinct().all()
    return sorted(r[0] for r in rows if r[0])


def get_closed(db: Session, skip: int = 0, limit: int = 100) -> list[Job]:
    cutoff = (datetime.now() - timedelta(days=JOB_ARCHIVE_AFTER_DAYS)).date()
    return (
        db.query(Job)
        .filter(Job.status == JobStatus.CLOSED)
        .filter(Job.closed_date >= cutoff)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_archived(db: Session, skip: int = 0, limit: int = 100) -> list[Job]:
    cutoff = (datetime.now() - timedelta(days=JOB_ARCHIVE_AFTER_DAYS)).date()
    return (
        db.query(Job)
        .filter(Job.status == JobStatus.CLOSED)
        .filter(Job.closed_date < cutoff)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create(db: Session, data: JobCreate) -> Job:
    job = Job(**data.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def update_status(db: Session, job: Job, new_status: JobStatus) -> Job:
    if job.status == new_status:
        return job

    job.closed_date = datetime.now().date() if new_status == JobStatus.CLOSED else None
    job.status = new_status
    db.commit()
    db.refresh(job)
    return job


def can_reopen(job: Job) -> bool:
    """Returns False if the job has been closed for JOB_ARCHIVE_AFTER_DAYS+ (archived)."""
    if job.status != JobStatus.CLOSED:
        return True
    closed_date = job.closed_date or job.posted_date.date()
    return (datetime.now().date() - closed_date).days < JOB_ARCHIVE_AFTER_DAYS


def get_active_job_or_404(db: Session, job_id: str) -> Job:
    job = get_by_id(db, job_id)
    if not job:
        raise ServiceError(404, "Job not found")
    return job


def create_job_with_log(db: Session, data: JobCreate, current_user) -> Job:
    new_job = create(db, data)
    log_activity(
        db=db,
        action_type=ActionType.JOB_CREATED,
        description=f"{current_user.name} ({current_user.role}) created a new job: {new_job.title} ({new_job.department})",
        user_name=current_user.name,
        user_email=current_user.email,
        job_id=new_job.id,
    )
    return new_job


def set_status(db: Session, job_id: str, new_status: JobStatus, current_user) -> Job:
    job = get_any_by_id(db, job_id)
    if not job:
        raise ServiceError(404, "Job not found")

    if new_status == JobStatus.ACTIVE and not can_reopen(job):
        raise ServiceError(
            400,
            f"This job has been closed for more than {JOB_ARCHIVE_AFTER_DAYS} days and is archived. It cannot be reopened.",
        )

    if job.status == new_status:
        return job

    updated = update_status(db, job, new_status)
    log_activity(
        db=db,
        action_type=ActionType.JOB_STATUS_UPDATED,
        description=f"{current_user.name} ({current_user.role}) updated job '{updated.title}' status to {new_status}",
        user_name=current_user.name,
        user_email=current_user.email,
        job_id=updated.id,
    )
    return updated
