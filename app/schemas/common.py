from pydantic import BaseModel, Field


class StatusResponse(BaseModel):
    status: str = "success"


class PaginationParams(BaseModel):
    skip: int = Field(0, ge=0)
    limit: int = Field(100, ge=1)
