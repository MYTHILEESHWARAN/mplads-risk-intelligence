from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class InvestigationBase(BaseModel):
    project_id: str
    project_name: str
    district: Optional[str] = None
    risk_score: float
    risk_level: str
    risk_factors: Optional[List[str]] = []
    priority: int = 5
    assigned_officer: str = "Unassigned"
    status: str = "New"
    notes: Optional[str] = None


class InvestigationCreate(InvestigationBase):
    pass


class InvestigationResponse(InvestigationBase):
    id: int
    investigation_id: str
    created_at: datetime
    last_updated: datetime

    model_config = {"from_attributes": True}


class InvestigationListResponse(BaseModel):
    investigations: List[InvestigationResponse]
    total: int


class AssignRequest(BaseModel):
    officer_name: str


class StatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None
