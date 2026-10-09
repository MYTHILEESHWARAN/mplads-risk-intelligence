"""
Reports Center — generates downloadable CSV and JSON reports.
All reports include: title, generated timestamp, filters, provenance,
methodology summary, and the disclaimer about risk indicators.
PDF/Excel support (openpyxl) is planned; CSV/JSON available now.
"""
import json
import csv
import io
import hashlib
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project, RiskAnalysis
from app.models.alert import Alert
from app.models.investigation import Investigation

router = APIRouter()

DISCLAIMER = (
    "Risk indicators support prioritization of human review and are not findings of wrongdoing. "
    "All risk scores are produced by an AI decision-support tool. "
    "Final determinations rest solely with authorised human officers."
)


def _meta_header(report_type: str, filters: dict, row_count: int) -> dict:
    return {
        "report_type": report_type,
        "generated_at": datetime.utcnow().isoformat(),
        "filters_applied": filters,
        "row_count": row_count,
        "data_provenance": "SYNTHETIC",
        "disclaimer": DISCLAIMER,
        "methodology": "Unified risk score = Financial×0.25 + Execution×0.20 + Duplicate×0.15 + Compliance×0.15 + Evidence×0.25",
    }


def _sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


@router.get("/api/reports/projects")
def report_projects(
    format: str = Query("csv", regex="^(csv|json)$"),
    risk_level: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Download all projects with risk scores as CSV or JSON."""
    query = db.query(Project)
    if state: query = query.filter(Project.state == state)
    if district: query = query.filter(Project.district == district)
    if status: query = query.filter(Project.status == status)
    projects = query.all()

    ra_map = {r.project_id: r for r in db.query(RiskAnalysis).all()}

    rows = []
    for p in projects:
        ra = ra_map.get(p.project_id)
        if risk_level and (ra is None or ra.risk_level != risk_level):
            continue
        rows.append({
            "project_id": p.project_id,
            "project_name": p.project_name,
            "mp_name": p.mp_name,
            "constituency": p.constituency,
            "district": p.district,
            "state": p.state,
            "project_type": p.project_type,
            "agency": p.agency,
            "sanction_amount": p.sanction_amount,
            "estimated_cost": p.estimated_cost,
            "actual_expenditure": p.actual_expenditure,
            "physical_progress": p.physical_progress,
            "financial_progress": p.financial_progress,
            "status": p.status,
            "risk_score": ra.unified_risk_score if ra else None,
            "risk_level": ra.risk_level if ra else "PENDING",
            "financial_risk": ra.financial_risk if ra else None,
            "execution_risk": ra.execution_risk if ra else None,
            "duplicate_risk": ra.duplicate_risk if ra else None,
            "compliance_risk": ra.compliance_risk if ra else None,
            "evidence_risk": ra.evidence_risk if ra else None,
            "data_provenance": "SYNTHETIC",
        })

    filters = {k: v for k, v in {"risk_level": risk_level, "state": state, "district": district, "status": status}.items() if v}

    if format == "json":
        payload = {**_meta_header("High-Risk Project Register", filters, len(rows)), "rows": rows}
        content = json.dumps(payload, indent=2, default=str)
        data_hash = _sha256(content)
        payload["data_sha256"] = data_hash
        content = json.dumps(payload, indent=2, default=str)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="projects_report_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json"'},
        )

    # CSV
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        # Meta rows
        output.write(f"# Report: High-Risk Project Register\n")
        output.write(f"# Generated: {datetime.utcnow().isoformat()}\n")
        output.write(f"# Disclaimer: {DISCLAIMER}\n")
        output.write(f"# Data provenance: SYNTHETIC\n")
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="projects_report_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv"'},
    )


@router.get("/api/reports/alerts")
def report_alerts(
    format: str = Query("csv", regex="^(csv|json)$"),
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Download alerts report as CSV or JSON."""
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    alerts = query.order_by(Alert.detected_date.desc()).all()

    rows = [
        {
            "alert_id": a.alert_id,
            "project_id": a.project_id,
            "project_name": a.project_name,
            "district": a.district,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "risk_score": a.risk_score,
            "reason": a.reason,
            "status": a.status,
            "detected_date": str(a.detected_date) if a.detected_date else None,
            "data_provenance": "SYNTHETIC",
        }
        for a in alerts
    ]

    filters = {"severity": severity} if severity else {}

    if format == "json":
        payload = {**_meta_header("Risk Alerts Report", filters, len(rows)), "rows": rows}
        content = json.dumps(payload, indent=2, default=str)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="alerts_report_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json"'},
        )

    output = io.StringIO()
    output.write(f"# Risk Alerts Report\n# Generated: {datetime.utcnow().isoformat()}\n# {DISCLAIMER}\n")
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="alerts_report_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv"'},
    )


@router.get("/api/reports/investigations")
def report_investigations(
    format: str = Query("csv", regex="^(csv|json)$"),
    db: Session = Depends(get_db),
):
    """Download investigation queue as CSV or JSON."""
    invs = db.query(Investigation).order_by(Investigation.priority).all()
    rows = [
        {
            "investigation_id": i.investigation_id,
            "project_id": i.project_id,
            "project_name": i.project_name,
            "district": i.district,
            "risk_score": i.risk_score,
            "risk_level": i.risk_level,
            "priority": i.priority,
            "assigned_officer": i.assigned_officer,
            "status": i.status,
            "created_at": str(i.created_at) if i.created_at else None,
            "last_updated": str(i.last_updated) if i.last_updated else None,
            "data_provenance": "SYNTHETIC",
        }
        for i in invs
    ]

    if format == "json":
        payload = {**_meta_header("Investigation Queue Report", {}, len(rows)), "rows": rows}
        content = json.dumps(payload, indent=2, default=str)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="investigations_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json"'},
        )

    output = io.StringIO()
    output.write(f"# Investigation Queue Report\n# Generated: {datetime.utcnow().isoformat()}\n# {DISCLAIMER}\n")
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="investigations_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv"'},
    )


@router.get("/api/reports/dashboard-summary")
def report_dashboard_summary(
    format: str = Query("json", regex="^(csv|json)$"),
    db: Session = Depends(get_db),
):
    """Download dashboard summary as JSON."""
    db.expire_all()
    projects = db.query(Project).all()
    risk_analyses = db.query(RiskAnalysis).all()
    ra_map = {r.project_id: r for r in risk_analyses}
    alerts = db.query(Alert).all()

    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for p in projects:
        ra = ra_map.get(p.project_id)
        level = ra.risk_level if ra else "LOW"
        risk_dist[level] = risk_dist.get(level, 0) + 1

    summary = {
        "total_projects": len(projects),
        "active_projects": sum(1 for p in projects if p.status == "In Progress"),
        "high_risk_projects": risk_dist.get("HIGH", 0) + risk_dist.get("CRITICAL", 0),
        "critical_alerts": sum(1 for a in alerts if a.severity == "CRITICAL" and a.status == "New"),
        "total_sanctioned": sum(p.sanction_amount for p in projects),
        "total_expenditure": sum(p.actual_expenditure for p in projects),
        "risk_distribution": risk_dist,
        "data_provenance": "SYNTHETIC",
    }

    payload = {**_meta_header("Dashboard Summary", {}, len(projects)), "summary": summary}
    content = json.dumps(payload, indent=2, default=str)
    return StreamingResponse(
        iter([content]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="dashboard_summary_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json"'},
    )
