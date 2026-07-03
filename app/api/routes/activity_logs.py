from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas.activity_log import PaginatedActivityLogsResponse, ActionType
from app.api.dependencies import requires_admin
from app.services import activity_log

router = APIRouter(tags=["activity-logs"])

@router.get("/fetch", response_model=PaginatedActivityLogsResponse, dependencies=[Depends(requires_admin)])
def get_activity_logs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    action_type: Optional[ActionType] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Fetch activity logs sorted by timestamp descending, paginated and filtered.
    Accessible only to SUPERADMIN and ADMIN users.
    """
    return activity_log.get_paginated(db, page, size, action_type, search)
