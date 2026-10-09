from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base


class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)
    project_name = Column(String(500), nullable=False)

    rule = Column(String(300), nullable=False)
    status = Column(String(20), nullable=False)    # Passed | Failed | Pending
    severity = Column(String(20), nullable=False)  # LOW | MEDIUM | HIGH | CRITICAL
    reason = Column(Text, nullable=True)

    compliance_score = Column(Float, default=0.0)  # 0-100 for the project overall

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
