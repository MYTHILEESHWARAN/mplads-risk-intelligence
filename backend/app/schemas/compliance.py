from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ComplianceCheckItem(BaseModel):
    rule: str
    status: str
    severity: str
    reason: str


class ComplianceProjectResponse(BaseModel):
    id: int
    project_id: str
    project_name: str
    compliance_score: float
    checks: List[ComplianceCheckItem]

    model_config = {"from_attributes": True}


class ComplianceListResponse(BaseModel):
    compliance: List[ComplianceProjectResponse]
    total: int
