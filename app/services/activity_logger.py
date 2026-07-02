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
