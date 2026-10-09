"""
Extended MPLADS data models — Phase 3 additions.
These add to the existing schema; nothing is replaced.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Text, Boolean, ForeignKey, Index
from app.database import Base


class Member(Base):
    """MPs — Lok Sabha, Rajya Sabha, Nominated."""
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    member_code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    house = Column(String(30), nullable=False)  # "Lok Sabha" | "Rajya Sabha" | "Nominated"
    party = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    constituency_name = Column(String(200), nullable=True)  # null for RS/Nominated
    term_start = Column(Date, nullable=True)
    term_end = Column(Date, nullable=True)
    is_synthetic = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class FundLedger(Base):
    """Annual fund release per MP per financial year."""
    __tablename__ = "fund_ledger"

    id = Column(Integer, primary_key=True, index=True)
    member_code = Column(String(20), index=True, nullable=False)
    financial_year = Column(String(10), nullable=False)  # e.g. "2023-24"
    entitlement = Column(Float, default=0.0)
    installment_no = Column(Integer, default=1)
    amount_released = Column(Float, default=0.0)
    released_date = Column(Date, nullable=True)
    interest_earned = Column(Float, default=0.0)
    unspent_opening = Column(Float, default=0.0)
    unspent_closing = Column(Float, default=0.0)
    source = Column(String(20), default="SYNTHETIC")  # SYNTHETIC | OFFICIAL_IMPORT
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_fund_ledger_member_fy", "member_code", "financial_year"),
    )


class ExpenditureEntry(Base):
    """Time-series payment entries per project."""
    __tablename__ = "expenditure_entries"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)
    entry_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    payment_type = Column(String(20), default="running")  # advance | running | final
    voucher_ref = Column(String(100), nullable=True)
    cumulative_total = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_expenditure_project_date", "project_id", "entry_date"),
    )


class ProgressUpdate(Base):
    """Time-series physical progress updates per project."""
    __tablename__ = "progress_updates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)
    update_date = Column(Date, nullable=False)
    physical_progress_pct = Column(Float, nullable=False)
    updated_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GroundTruth(Base):
    """
    Injected anomaly labels for synthetic data evaluation.
    NEVER included in ML features — only used to measure precision/recall.
    """
    __tablename__ = "ground_truth"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), index=True, nullable=False, unique=True)
    injected_anomaly_type = Column(String(100), nullable=True)
    # Values: overspend | progress_gap | duplicate | deadline_overrun |
    #         missing_docs | cost_unit_outlier | round_payment | split_payment | none
    anomaly_severity = Column(String(20), nullable=True)  # LOW | MEDIUM | HIGH | CRITICAL
    ground_truth_risk_level = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DataQualityIssue(Base):
    """Tracks missing, invalid, or inconsistent fields per project."""
    __tablename__ = "data_quality_issues"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(20), index=True, nullable=False)
    field_name = Column(String(100), nullable=False)
    issue_type = Column(String(50), nullable=False)
    # missing_value | invalid_range | inconsistent | stale | duplicate_suspected
    severity = Column(String(20), nullable=False)  # LOW | MEDIUM | HIGH
    detail = Column(Text, nullable=True)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
