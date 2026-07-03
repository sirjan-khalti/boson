from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Annotated, List
from uuid import UUID

from app.core.database import get_db
from app.models.user import Users
from app.schemas.common import PaginationParams, StatusResponse
from app.schemas.user import RoleUpdate, UserCreateInput, UserResponse
from app.api.dependencies import requires_admin
from app.services import user

router = APIRouter(tags=["team"])

@router.get("/fetch", response_model=List[UserResponse], dependencies=[Depends(requires_admin)])
def get_team(
    pagination: Annotated[PaginationParams, Query()],
    db: Session = Depends(get_db),
):
    return user.list_users(db, pagination.skip, pagination.limit)

@router.post("/{user_id}/role", response_model=UserResponse)
def update_role(
    user_id: UUID,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: Users = Depends(requires_admin)
):
    return user.update_role(db, user_id, role_update.role, current_user)

@router.post("/create", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_member(
    user_in: UserCreateInput,
    db: Session = Depends(get_db),
    current_user: Users = Depends(requires_admin)
):
    return user.create_member(db, user_in.name, user_in.email, user_in.role, current_user)

@router.post("/{user_id}/reset-password", response_model=StatusResponse)
def reset_member_password(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: Users = Depends(requires_admin)
):
    user.reset_password(db, user_id, current_user)
    return {"status": "success"}
