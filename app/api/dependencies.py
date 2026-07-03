from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.models.user import User
from app.schemas.user import Role
from app.services import user

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    actual_token = token
    if not actual_token:
        actual_token = request.cookies.get("access_token")

    if not actual_token:
        raise UnauthorizedError()
    try:
        payload = jwt.decode(actual_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise UnauthorizedError()
    except JWTError:
        raise UnauthorizedError()

    current_user = user.get_by_email(db, email)
    if current_user is None:
        raise UnauthorizedError()
    return current_user

def get_current_user_optional(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Like get_current_user, but returns None instead of raising when there's
    no (or an invalid) session — for endpoints reachable both anonymously and
    by a logged-in recruiter, where the caller's identity changes behavior
    rather than gating access."""
    try:
        return get_current_user(request, token, db)
    except UnauthorizedError:
        return None

def requires_recruiter(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (Role.SUPERADMIN, Role.ADMIN, Role.RECRUITER):
        raise ForbiddenError()
    return current_user


def requires_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (Role.SUPERADMIN, Role.ADMIN):
        raise ForbiddenError()
    return current_user


def requires_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != Role.SUPERADMIN:
        raise ForbiddenError()
    return current_user
