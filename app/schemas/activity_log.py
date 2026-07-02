from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from enum import Enum

class ActionType(str, Enum):
    JOB_CREATED = "job_created"
    JOB_STATUS_UPDATED = "job_status_updated"
    CANDIDATE_APPLIED = "candidate_applied"
    CANDIDATE_EVALUATED = "candidate_evaluated"
    CANDIDATE_STAGE_UPDATED = "candidate_stage_updated"
    CANDIDATE_NOTE_ADDED = "candidate_note_added"
    MEMBER_CREATED = "member_created"
    MEMBER_ROLE_UPDATED = "member_role_updated"
    MEMBER_PASSWORD_RESET = "member_password_reset"
    PASSWORD_CHANGED = "password_changed"

class ActivityLogResponse(BaseModel):
    id: str
    timestamp: datetime
    action_type: ActionType
    description: str
    user_name: str
    user_email: Optional[str] = None
    job_id: Optional[str] = None
    candidate_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedActivityLogsResponse(BaseModel):
    items: list[ActivityLogResponse]
    total: int
    page: int
    size: int
    pages: int

