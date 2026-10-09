"""
SQLAlchemy models for Project and related entities.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Text, Boolean
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), unique=True, index=True, nullable=False)
    project_name = Column(String(500), nullable=False)
    mp_name = Column(String(200), nullable=False)
    constituency = Column(String(200), nullable=False)
    district = Column(String(200), nullable=False)
    state = Column(String(200), nullable=False)
    project_type = Column(String(100), nullable=False)
    agency = Column(String(300), nullable=False)

    # Financial
    sanction_amount = Column(Float, nullable=False)
    estimated_cost = Column(Float, nullable=False)
    actual_expenditure = Column(Float, default=0.0)

    # Progress (0-100)
    physical_progress = Column(Float, default=0.0)
    financial_progress = Column(Float, default=0.0)

    # Dates
    sanction_date = Column(Date, nullable=True)
    start_date = Column(Date, nullable=True)
    expected_completion_date = Column(Date, nullable=True)
    actual_completion_date = Column(Date, nullable=True)

    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Status
    status = Column(String(50), default="In Progress")

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RiskAnalysis(Base):
    __tablename__ = "risk_analyses"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)

    financial_risk = Column(Float, default=0.0)
    execution_risk = Column(Float, default=0.0)
    duplicate_risk = Column(Float, default=0.0)
    compliance_risk = Column(Float, default=0.0)
    evidence_risk = Column(Float, default=0.0)
    unified_risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW")

    # Duplicate detection
    matched_project_id = Column(String(20), nullable=True)
    semantic_similarity = Column(Float, default=0.0)
    geographical_similarity = Column(Float, default=0.0)
    distance_km = Column(Float, nullable=True)

    # Delay prediction
    delay_probability = Column(Float, default=0.0)
    predicted_delay_days = Column(Integer, default=0)

    flagged_reasons = Column(Text, nullable=True)  # JSON string

    analysed_at = Column(DateTime, default=datetime.utcnow)


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    triggered_by = Column(String(50), default="user")  # "user" | "system"
    ruleset_version = Column(String(20), default="1.0.0")
    model_versions = Column(Text, nullable=True)   # JSON: {"isolation_forest": "sklearn-1.9.1", ...}
    input_hash = Column(String(64), nullable=True)  # SHA-256 of input snapshot
    component_scores = Column(Text, nullable=True)  # JSON: {financial, execution, ...}
    weights = Column(Text, nullable=True)            # JSON: {financial: 0.25, ...}
    final_score = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)        # 0-100 based on input completeness
    explanations = Column(Text, nullable=True)       # JSON: flagged_reasons list
    data_provenance = Column(String(20), default="SYNTHETIC")  # SYNTHETIC | OFFICIAL_IMPORT | USER_ENTERED
    status = Column(String(20), default="completed")  # completed | failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
