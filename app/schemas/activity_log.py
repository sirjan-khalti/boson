from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional
from enum import Enum
from uuid import UUID

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

class ActivityLogFilters(BaseModel):
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)
    action_type: Optional[ActionType] = None
    search: Optional[str] = None

class ActivityLogResponse(BaseModel):
    id: UUID
    timestamp: datetime
    action_type: ActionType
    description: str
    user_name: str
    user_email: Optional[str] = None
    job_id: Optional[UUID] = None
    candidate_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedActivityLogsResponse(BaseModel):
    items: list[ActivityLogResponse]
    total: int
    page: int
    size: int
    pages: int

