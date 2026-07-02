from sqlalchemy.orm import Session

from app.core.constants import ASSIGNABLE_ROLES
from app.core.exceptions import ServiceError
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.activity_log import ActionType
from app.schemas.user import Role
from app.services.activity_log import log_activity


def list_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return db.query(User).offset(skip).limit(limit).all()


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def update_role(db: Session, user_id: str, new_role: str, current_user: User) -> User:
    if new_role not in ASSIGNABLE_ROLES:
        raise ServiceError(400, "Invalid role specified")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise ServiceError(404, "User not found")

    if target_user.role == Role.SUPERADMIN:
        raise ServiceError(403, "Cannot alter the SUPERADMIN role")

    # Enforce role hierarchy safety to prevent privilege escalation
    if current_user.role != Role.SUPERADMIN:
        if current_user.id == target_user.id:
            raise ServiceError(403, "Cannot alter your own role")
        if target_user.role == Role.ADMIN and new_role != Role.ADMIN:
            raise ServiceError(403, "Admins cannot demote other ADMINs")

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


def create_member(db: Session, name: str, email: str, role: str, current_user: User) -> User:
    # SUPERADMIN cannot be assigned via this endpoint
    if role not in VALID_ROLES:
        raise ServiceError(400, "Invalid role specified")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise ServiceError(400, "The user with this email already exists in the system.")

    # Initial password is the email address
    new_user = User(
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


def reset_password(db: Session, user_id: str, current_user: User) -> User:
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise ServiceError(404, "User not found")

    if target_user.role == "SUPERADMIN" and current_user.role != "SUPERADMIN":
        raise ServiceError(403, "Cannot reset the password of a SUPERADMIN")

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
