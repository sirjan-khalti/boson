from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from uuid import UUID

from app.core.constants import JOB_ARCHIVE_AFTER_DAYS
from app.core.exceptions import JobArchivedError, JobNotFoundError
from app.models.job import Jobs
from app.schemas.job import JobCreate, JobStatus
from app.schemas.activity_log import ActionType
from app.services.activity_log import log_activity


def get_all(db: Session, skip: int = 0, limit: int = 100) -> list[Jobs]:
    return db.query(Jobs).offset(skip).limit(limit).all()


def get_active(db: Session, skip: int = 0, limit: int = 100) -> list[Jobs]:
    return db.query(Jobs).filter(Jobs.status == JobStatus.ACTIVE).offset(skip).limit(limit).all()


def get_by_id(db: Session, job_id: UUID) -> Jobs | None:
    return db.query(Jobs).filter(Jobs.id == job_id, Jobs.status == JobStatus.ACTIVE).first()


def get_any_by_id(db: Session, job_id: UUID) -> Jobs | None:
    return db.query(Jobs).filter(Jobs.id == job_id).first()


def get_departments(db: Session) -> list[str]:
    rows = db.query(Jobs.department).distinct().all()
    return sorted(r[0] for r in rows if r[0])


def get_closed(db: Session, skip: int = 0, limit: int = 100) -> list[Jobs]:
    cutoff = (datetime.now() - timedelta(days=JOB_ARCHIVE_AFTER_DAYS)).date()
    return (
        db.query(Jobs)
        .filter(Jobs.status == JobStatus.CLOSED)
        .filter(Jobs.closed_date >= cutoff)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_archived(db: Session, skip: int = 0, limit: int = 100) -> list[Jobs]:
    cutoff = (datetime.now() - timedelta(days=JOB_ARCHIVE_AFTER_DAYS)).date()
    return (
        db.query(Jobs)
        .filter(Jobs.status == JobStatus.CLOSED)
        .filter(Jobs.closed_date < cutoff)
        .offset(skip)
        .limit(limit)
        .all()
    )


def create(db: Session, data: JobCreate) -> Jobs:
    job = Jobs(**data.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def update_status(db: Session, job: Jobs, new_status: JobStatus) -> Jobs:
    if job.status == new_status:
        return job

    job.closed_date = datetime.now().date() if new_status == JobStatus.CLOSED else None
    job.status = new_status
    db.commit()
    db.refresh(job)
    return job


def can_reopen(job: Jobs) -> bool:
    """Returns False if the job has been closed for JOB_ARCHIVE_AFTER_DAYS+ (archived)."""
    if job.status != JobStatus.CLOSED:
        return True
    closed_date = job.closed_date or job.posted_date.date()
    return (datetime.now().date() - closed_date).days < JOB_ARCHIVE_AFTER_DAYS


def require_active_job(db: Session, job_id: UUID) -> Jobs:
    job = get_by_id(db, job_id)
    if not job:
        raise JobNotFoundError()
    return job


def create_job_with_log(db: Session, data: JobCreate, current_user) -> Jobs:
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


def set_status(db: Session, job_id: UUID, new_status: JobStatus, current_user) -> Jobs:
    job = get_any_by_id(db, job_id)
    if not job:
        raise JobNotFoundError()

    if new_status == JobStatus.ACTIVE and not can_reopen(job):
        raise JobArchivedError()

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
