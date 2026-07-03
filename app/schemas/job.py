from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import List, Literal
from datetime import datetime

from app.core.constants import DEFAULT_SCORING_CRITERIA

class ScoringCriterionSchema(BaseModel):
    criteria: str
    weight: float
    description: str = ""

def _default_scoring_criteria() -> List[ScoringCriterionSchema]:
    return [ScoringCriterionSchema(**c) for c in DEFAULT_SCORING_CRITERIA]

class JobBase(BaseModel):
    title: str
    department: str
    location: str
    type: str
    description: str
    skills: List[str] = []

class JobCreate(JobBase):
    scoring_criteria: List[ScoringCriterionSchema] = Field(default_factory=_default_scoring_criteria)

    @model_validator(mode="after")
    def _weights_sum_to_100(self) -> "JobCreate":
        total = sum(c.weight for c in self.scoring_criteria)
        if round(total, 2) != 100:
            raise ValueError(f"Scoring criteria weights must sum to 100 (got {total}).")
        return self

class JobResponse(JobBase):
    id: str
    status: str
    applicants: int
    postedDate: datetime
    scoring_criteria: List[ScoringCriterionSchema] = []

    model_config = ConfigDict(from_attributes=True)

class JobStatusUpdate(BaseModel):
    status: Literal["Active", "Closed"]
