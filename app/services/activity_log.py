from typing import Optional
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActionType

def log_activity(
    db: Session,
    action_type: ActionType,
    description: str,
    user_name: str,
    user_email: str = None,
    job_id: str = None,
    candidate_id: str = None
):
    """
    Utility function to log recruiter and system activities in the database.
    """
    log_entry = ActivityLog(
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
    query = db.query(ActivityLog)

    if action_type:
        query = query.filter(ActivityLog.action_type == action_type)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (ActivityLog.description.ilike(search_filter)) |
            (ActivityLog.user_name.ilike(search_filter)) |
            (ActivityLog.user_email.ilike(search_filter))
        )

    total = query.count()
    offset = (page - 1) * size
    logs = query.order_by(ActivityLog.timestamp.desc()).offset(offset).limit(size).all()
    pages = (total + size - 1) // size if total > 0 else 0

    return {
        "items": logs,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }
