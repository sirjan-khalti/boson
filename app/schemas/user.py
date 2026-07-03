from pydantic import BaseModel, EmailStr, ConfigDict
from enum import Enum
from uuid import UUID

class Role(str, Enum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    RECRUITER = "RECRUITER"
    VIEWER = "VIEWER"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: Role
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ChangePasswordInput(BaseModel):
    old_password: str
    new_password: str

class RoleUpdate(BaseModel):
    role: Role

class UserCreateInput(BaseModel):
    name: str
    email: str
    role: Role
