from sqlalchemy.orm import Session
from uuid import UUID

from app.core.exceptions import (
    EmailAlreadyExistsError,
    ForbiddenError,
    InvalidRoleError,
    UserNotFoundError,
)
from app.core.security import get_password_hash
from app.models.user import Users
from app.schemas.activity_log import ActionType
from app.schemas.user import Role
from app.services.activity_log import log_activity

# Roles that can be assigned to a team member (SUPERADMIN is not assignable).
# Lives here rather than app.core.constants because it depends on
# app.schemas.user.Role — core must not depend on schemas, or any schema
# module that itself imports from core.constants creates an import cycle.
ASSIGNABLE_ROLES = [Role.ADMIN, Role.RECRUITER, Role.VIEWER]


def list_users(db: Session, skip: int = 0, limit: int = 100) -> list[Users]:
    return db.query(Users).offset(skip).limit(limit).all()


def get_by_email(db: Session, email: str) -> Users | None:
    return db.query(Users).filter(Users.email == email).first()


def update_role(db: Session, user_id: UUID, new_role: Role, current_user: Users) -> Users:
    if new_role not in ASSIGNABLE_ROLES:
        raise InvalidRoleError()

    target_user = db.query(Users).filter(Users.id == user_id).first()
    if not target_user:
        raise UserNotFoundError()

    if target_user.role == Role.SUPERADMIN:
        raise ForbiddenError()

    # Enforce role hierarchy safety to prevent privilege escalation
    if current_user.role != Role.SUPERADMIN:
        if current_user.id == target_user.id:
            raise ForbiddenError()
        if target_user.role == Role.ADMIN and new_role != Role.ADMIN:
            raise ForbiddenError()

    old_role = target_user.role
    target_user.role = new_role

    log_activity(
        db=db,
        action_type=ActionType.MEMBER_ROLE_UPDATED,
        description=f"{current_user.name} ({current_user.role}) updated team member {target_user.name}'s role from {old_role} to {new_role}",
        user_name=current_user.name,
        user_email=current_user.email,
    )

    db.commit()
    db.refresh(target_user)
    return target_user


def create_member(db: Session, name: str, email: str, role: Role, current_user: Users) -> Users:
    # SUPERADMIN cannot be assigned via this endpoint
    if role not in ASSIGNABLE_ROLES:
        raise InvalidRoleError()

    existing_user = db.query(Users).filter(Users.email == email).first()
    if existing_user:
        raise EmailAlreadyExistsError()

    # Initial password is the email address
    new_user = Users(
        name=name,
        email=email,
        hashed_password=get_password_hash(email),
        role=role,
    )
    db.add(new_user)
    db.flush()

    log_activity(
        db=db,
        action_type=ActionType.MEMBER_CREATED,
        description=f"{current_user.name} ({current_user.role}) created a new team member: {new_user.name} ({new_user.role})",
        user_name=current_user.name,
        user_email=current_user.email,
    )

    db.commit()
    db.refresh(new_user)
    return new_user


def reset_password(db: Session, user_id: UUID, current_user: Users) -> Users:
    target_user = db.query(Users).filter(Users.id == user_id).first()
    if not target_user:
        raise UserNotFoundError()

    if target_user.role == Role.SUPERADMIN and current_user.role != Role.SUPERADMIN:
        raise ForbiddenError()

    target_user.hashed_password = get_password_hash(target_user.email)

    log_activity(
        db=db,
        action_type=ActionType.MEMBER_PASSWORD_RESET,
        description=f"{current_user.name} ({current_user.role}) reset team member {target_user.name}'s password to their email address",
        user_name=current_user.name,
        user_email=current_user.email,
    )

    db.commit()
    return target_user
