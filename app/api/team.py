from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.api.dependencies import RequireRole
from app.core.security import get_password_hash
from app.services.activity_logger import log_activity
from app.schemas.activity_log import ActionType

router = APIRouter(prefix="/team", tags=["team"])

class RoleUpdate(BaseModel):
    role: str

class UserCreateInput(BaseModel):
    name: str
    email: str
    role: str

@router.get("/fetch", response_model=List[UserResponse], dependencies=[Depends(RequireRole(["SUPERADMIN", "ADMIN"]))])
def get_team(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return db.query(User).offset(skip).limit(limit).all()

@router.post("/{user_id}/role", response_model=UserResponse)
def update_role(
    user_id: str,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN"]))
):
    valid_roles = ["ADMIN", "RECRUITER", "VIEWER"]
    if role_update.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role specified")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.role == "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Cannot alter the SUPERADMIN role")
        
    # Enforce role hierarchy safety to prevent privilege escalation
    if current_user.role != "SUPERADMIN":
        if current_user.id == target_user.id:
            raise HTTPException(status_code=403, detail="Cannot alter your own role")
        if target_user.role == "ADMIN" and role_update.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Admins cannot demote other ADMINs")
        
    old_role = target_user.role
    target_user.role = role_update.role
    
    log_activity(
        db=db,
        action_type=ActionType.MEMBER_ROLE_UPDATED,
        description=f"{current_user.name} ({current_user.role}) updated team member {target_user.name}'s role from {old_role} to {role_update.role}",
        user_name=current_user.name,
        user_email=current_user.email
    )
    
    db.commit()
    db.refresh(target_user)
    return target_user

@router.post("/create", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_member(
    user_in: UserCreateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN"]))
):
    # Validate role - SUPERADMIN cannot be assigned
    valid_roles = ["ADMIN", "RECRUITER", "VIEWER"]
    if user_in.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role specified")
        
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
        
    # Create the user: initial password is the email address
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.email),
        role=user_in.role
    )
    db.add(new_user)
    db.flush()
    
    log_activity(
        db=db,
        action_type=ActionType.MEMBER_CREATED,
        description=f"{current_user.name} ({current_user.role}) created a new team member: {new_user.name} ({new_user.role})",
        user_name=current_user.name,
        user_email=current_user.email
    )
    
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/{user_id}/reset-password")
def reset_member_password(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole(["SUPERADMIN", "ADMIN"]))
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if target_user.role == "SUPERADMIN" and current_user.role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Cannot reset the password of a SUPERADMIN")
        
    target_user.hashed_password = get_password_hash(target_user.email)
    
    log_activity(
        db=db,
        action_type=ActionType.MEMBER_PASSWORD_RESET,
        description=f"{current_user.name} ({current_user.role}) reset team member {target_user.name}'s password to their email address",
        user_name=current_user.name,
        user_email=current_user.email
    )
    
    db.commit()
    return {"status": "success"}

