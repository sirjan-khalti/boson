from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ServiceError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.schemas.activity_log import ActionType
from app.services.activity_log import log_activity


def authenticate(db: Session, email: str, password: str) -> tuple[User, str]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise ServiceError(
            401,
            "Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return user, access_token


def change_password(db: Session, current_user: User, old_password: str, new_password: str) -> None:
    if not verify_password(old_password, current_user.hashed_password):
        raise ServiceError(400, "Incorrect old password")

    current_user.hashed_password = get_password_hash(new_password)

    log_activity(
        db=db,
        action_type=ActionType.PASSWORD_CHANGED,
        description=f"{current_user.name} ({current_user.role}) changed their password",
        user_name=current_user.name,
        user_email=current_user.email,
    )
