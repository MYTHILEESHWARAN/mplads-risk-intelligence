from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator, model_validator


class ProjectBase(BaseModel):
    project_id: str
    project_name: str
    mp_name: str
    constituency: str
    district: str
    state: str
    project_type: str
    agency: str
    sanction_amount: float
    estimated_cost: float
    actual_expenditure: float = 0.0
    physical_progress: float = 0.0
    financial_progress: float = 0.0
    sanction_date: Optional[date] = None
    start_date: Optional[date] = None
    expected_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "In Progress"

    @field_validator("sanction_amount", "estimated_cost", "actual_expenditure")
    @classmethod
    def amount_non_negative(cls, v):
        if v < 0:
            raise ValueError("Amount must be >= 0")
        return v

    @field_validator("physical_progress", "financial_progress")
    @classmethod
    def progress_range(cls, v):
        if not (0 <= v <= 100):
            raise ValueError("Progress must be between 0 and 100")
        return v

    @field_validator("latitude")
    @classmethod
    def validate_lat(cls, v):
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_lng(cls, v):
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    # Risk fields (populated from RiskAnalysis)
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    financial_risk: Optional[float] = None
    execution_risk: Optional[float] = None
    duplicate_risk: Optional[float] = None
    compliance_risk: Optional[float] = None
    evidence_risk: Optional[float] = None
    primary_reason: Optional[str] = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class RiskBreakdown(BaseModel):
    financial_risk: float
    execution_risk: float
    duplicate_risk: float
    compliance_risk: float
    evidence_risk: float
    unified_risk_score: float
    risk_level: str
    mismatch: float
    mismatch_level: str
    flagged_reasons: List[dict]
    delay_probability: Optional[float] = None
    predicted_delay_days: Optional[int] = None

    @field_validator("unified_risk_score", "financial_risk", "execution_risk",
                     "duplicate_risk", "compliance_risk", "evidence_risk")
    @classmethod
    def score_range(cls, v):
        return max(0.0, min(100.0, v))


class DuplicateResult(BaseModel):
    semantic_similarity: float
    geographical_similarity: float
    distance_km: Optional[float]
    matched_project: Optional[dict]
    duplicate_risk: float


class RiskMapItem(BaseModel):
    project_id: str
    project_name: str
    latitude: Optional[float]
    longitude: Optional[float]
    district: str
    risk_score: float
    risk_level: str
    primary_reason: str


class DashboardResponse(BaseModel):
    total_projects: int
    active_projects: int
    high_risk_projects: int
    critical_alerts: int
    total_sanctioned_amount: float
    total_expenditure: float
    risk_distribution: dict
    top_risk_projects: List[dict]
    financial_vs_physical: List[dict]
    monthly_alert_trends: List[dict]
