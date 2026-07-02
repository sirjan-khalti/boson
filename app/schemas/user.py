from pydantic import BaseModel, EmailStr, ConfigDict
from enum import Enum

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
    id: str
    name: str
    email: EmailStr
    role: str
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ChangePasswordInput(BaseModel):
    old_password: str
    new_password: str
