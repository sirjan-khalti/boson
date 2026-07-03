from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLogs
from app.schemas.activity_log import ActionType

def log_activity(
    db: Session,
    action_type: ActionType,
    description: str,
    user_name: str,
    user_email: Optional[str] = None,
    job_id: Optional[UUID] = None,
    candidate_id: Optional[UUID] = None
):
    """
    Utility function to log recruiter and system activities in the database.
    """
    log_entry = ActivityLogs(
        action_type=action_type,
        description=description,
        user_name=user_name,
        user_email=user_email,
        job_id=job_id,
        candidate_id=candidate_id
    )
    db.add(log_entry)


def get_paginated(
    db: Session,
    page: int,
    size: int,
    action_type: Optional[ActionType] = None,
    search: Optional[str] = None,
) -> dict:
    """
    Fetch activity logs sorted by timestamp descending, paginated and filtered.
    """
    query = db.query(ActivityLogs)

    if action_type:
        query = query.filter(ActivityLogs.action_type == action_type)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (ActivityLogs.description.ilike(search_filter)) |
            (ActivityLogs.user_name.ilike(search_filter)) |
            (ActivityLogs.user_email.ilike(search_filter))
        )

    total = query.count()
    offset = (page - 1) * size
    logs = query.order_by(ActivityLogs.timestamp.desc()).offset(offset).limit(size).all()
    pages = (total + size - 1) // size if total > 0 else 0

    return {
        "items": logs,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }
