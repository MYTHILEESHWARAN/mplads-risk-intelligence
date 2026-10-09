from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


class EvidenceBase(BaseModel):
    project_id: str
    project_name: str
    evidence_type: str
    upload_date: Optional[date] = None
    verification_status: str = "Pending"
    risk_status: str = "LOW"
    notes: Optional[str] = None
    file_name: Optional[str] = None


class EvidenceCreate(EvidenceBase):
    pass


class EvidenceResponse(EvidenceBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class EvidenceListResponse(BaseModel):
    evidence: List[EvidenceResponse]
    total: int
