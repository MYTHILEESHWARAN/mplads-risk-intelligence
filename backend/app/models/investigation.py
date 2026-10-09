from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(String(30), unique=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)
    project_name = Column(String(500), nullable=False)
    district = Column(String(200), nullable=True)

    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW")
    risk_factors = Column(Text, nullable=True)  # JSON array string
    priority = Column(Integer, default=5)

    assigned_officer = Column(String(300), default="Unassigned")
    status = Column(String(50), default="New")
    # NEW | ASSIGNED | UNDER_REVIEW | EVIDENCE_VERIFICATION | RESOLVED | ESCALATED

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
