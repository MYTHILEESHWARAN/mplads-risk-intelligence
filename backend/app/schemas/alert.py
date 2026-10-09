from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AlertBase(BaseModel):
    project_id: str
    project_name: str
    district: Optional[str] = None
    alert_type: str
    severity: str
    risk_score: float
    reason: str
    status: str = "New"


class AlertCreate(AlertBase):
    pass


class AlertResponse(AlertBase):
    id: int
    alert_id: str
    detected_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total: int
