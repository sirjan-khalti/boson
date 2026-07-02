from sqlalchemy import case, cast, Date, func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.models.job import Job
from app.schemas.job import JobCreate


def get_all(db: Session, skip: int = 0, limit: int = 100) -> list[Job]:
    return db.query(Job).offset(skip).limit(limit).all()


def get_active(db: Session, skip: int = 0, limit: int = 100) -> list[Job]:
    return db.query(Job).filter(Job.status == "Active").offset(skip).limit(limit).all()


def get_by_id(db: Session, job_id: str) -> Job | None:
    return db.query(Job).filter(Job.id == job_id, Job.status == "Active").first()


def get_any_by_id(db: Session, job_id: str) -> Job | None:
    return db.query(Job).filter(Job.id == job_id).first()


def get_departments(db: Session) -> list[str]:
    rows = db.query(Job.department).distinct().all()
    return sorted(r[0] for r in rows if r[0])


def get_closed(db: Session, skip: int = 0, limit: int = 100) -> list[Job]:
    cutoff = (datetime.now() - timedelta(days=30)).date()
    closed_date = _closed_date_expr()
    return (
        db.query(Job)
        .filter(Job.status.like("Closed%"))
        .filter(closed_date >= cutoff)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_archived(db: Session, skip: int = 0, limit: int = 100) -> list[Job]:
    cutoff = (datetime.now() - timedelta(days=30)).date()
    closed_date = _closed_date_expr()
    return (
        db.query(Job)
        .filter(Job.status.like("Closed%"))
        .filter(closed_date < cutoff)
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


def update_status(db: Session, job: Job, new_status: str) -> Job:
    if new_status == "Closed":
        job.status = f"Closed:{datetime.now(timezone.utc).date().isoformat()}"
    else:
        job.status = new_status
    db.commit()
    db.refresh(job)
    return job


def can_reopen(job: Job) -> bool:
    """Returns False if the job has been closed for 30+ days (archived)."""
    if not job.status or not job.status.startswith("Closed"):
        return True
    try:
        date_str = job.status.split(":")[1] if ":" in job.status else None
        closed_date = (
            datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if date_str
            else job.postedDate.replace(tzinfo=timezone.utc)
        )
        return (datetime.now(timezone.utc) - closed_date).days < 30
    except Exception:
        return True


def _closed_date_expr():
    return case(
        (Job.status.like("Closed:%"), cast(func.split_part(Job.status, ":", 2), Date)),
        else_=cast(Job.postedDate, Date),
    )
