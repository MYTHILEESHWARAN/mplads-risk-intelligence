from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(30), unique=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)
    project_name = Column(String(500), nullable=False)
    district = Column(String(200), nullable=True)

    alert_type = Column(String(50), nullable=False)
    # FINANCIAL_ANOMALY | PROGRESS_MISMATCH | POSSIBLE_DUPLICATE |
    # DELAY_WARNING | COMPLIANCE_VIOLATION | MISSING_EVIDENCE

    severity = Column(String(20), nullable=False)  # LOW | MEDIUM | HIGH | CRITICAL
    risk_score = Column(Float, default=0.0)
    reason = Column(Text, nullable=False)

    status = Column(String(30), default="New")
    # New | Under Review | Resolved | Escalated

    detected_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
