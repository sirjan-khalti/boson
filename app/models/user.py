from sqlalchemy import Column, String, Enum as SAEnum
from app.core.database import BaseModelDB
from app.schemas.user import Role

class Users(BaseModelDB):
    __tablename__ = "users"

    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(
        SAEnum(Role, name="user_role_enum", values_callable=lambda enum: [e.value for e in enum]),
        nullable=False,
        default=Role.VIEWER,
        server_default=Role.VIEWER.value,
    )
