from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Date
from app.database import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)
    project_name = Column(String(500), nullable=False)

    evidence_type = Column(String(100), nullable=False)
    # Project Photo | Completion Certificate | Payment Record | Work Order | Supporting Document

    upload_date = Column(Date, nullable=True)
    verification_status = Column(String(30), default="Pending")
    # Verified | Pending | Missing | Mismatch

    risk_status = Column(String(20), default="LOW")
    notes = Column(Text, nullable=True)
    file_name = Column(String(300), nullable=True)
    file_path = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
