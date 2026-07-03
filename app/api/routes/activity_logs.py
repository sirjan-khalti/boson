from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Annotated

from app.core.database import get_db
from app.schemas.activity_log import ActivityLogFilters, PaginatedActivityLogsResponse
from app.api.dependencies import requires_admin
from app.services import activity_log

router = APIRouter(tags=["activity-logs"])

@router.get("/fetch", response_model=PaginatedActivityLogsResponse, dependencies=[Depends(requires_admin)])
def get_activity_logs(
    filters: Annotated[ActivityLogFilters, Query()],
    db: Session = Depends(get_db),
):
    """
    Fetch activity logs sorted by timestamp descending, paginated and filtered.
    Accessible only to SUPERADMIN and ADMIN users.
    """
    return activity_log.get_paginated(db, filters.page, filters.size, filters.action_type, filters.search)
