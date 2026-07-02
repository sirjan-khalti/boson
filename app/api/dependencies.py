from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.models.user import User
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

    user = user.get_by_email(db, email)
    if user is None:
        raise UnauthorizedError()
    return user

class RequireRole:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise ForbiddenError()
        return current_user
