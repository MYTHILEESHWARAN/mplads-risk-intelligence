"""Dashboard API route."""
import json
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.project import Project, RiskAnalysis
from app.models.alert import Alert

router = APIRouter()


@router.get("/api/dashboard")
def get_dashboard(response: Response, db: Session = Depends(get_db)):
    # Expire SQLAlchemy identity map so every query hits the DB, not the session cache.
    # This guarantees counts reflect the very latest committed data.
    db.expire_all()

    # Tell the browser and any proxy: do not cache this response.
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"

    projects = db.query(Project).all()
    alerts = db.query(Alert).all()

    total_projects = len(projects)
    active_projects = sum(1 for p in projects if p.status == "In Progress")
    total_sanctioned = sum(p.sanction_amount for p in projects)
    total_expenditure = sum(p.actual_expenditure for p in projects)

    # Risk distribution
    risk_analyses = db.query(RiskAnalysis).all()
    ra_map = {r.project_id: r for r in risk_analyses}

    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    high_risk = 0
    for p in projects:
        ra = ra_map.get(p.project_id)
        level = ra.risk_level if ra else "LOW"
        risk_dist[level] = risk_dist.get(level, 0) + 1
        if level in ("HIGH", "CRITICAL"):
            high_risk += 1

    critical_alerts = sum(1 for a in alerts if a.severity == "CRITICAL" and a.status == "New")

    # Top risk projects
    top_risk = []
    for p in projects:
        ra = ra_map.get(p.project_id)
        if ra:
            reason = ""
            if ra.flagged_reasons:
                try:
                    reasons = json.loads(ra.flagged_reasons)
                    reason = reasons[0]["text"] if reasons else ""
                except Exception:
                    pass
            top_risk.append({
                "project_id": p.project_id, "project_name": p.project_name,
                "district": p.district, "sanction_amount": p.sanction_amount,
                "actual_expenditure": p.actual_expenditure,
                "physical_progress": p.physical_progress,
                "financial_progress": p.financial_progress,
                "risk_score": ra.unified_risk_score, "risk_level": ra.risk_level,
                "primary_reason": reason, "status": p.status,
            })
    top_risk.sort(key=lambda x: x["risk_score"], reverse=True)

    # Financial vs physical progress
    fvp = [{"name": p.project_id, "financial": p.financial_progress, "physical": p.physical_progress}
           for p in sorted(projects, key=lambda x: abs((x.financial_progress or 0) - (x.physical_progress or 0)), reverse=True)[:10]]

    # Monthly alert trends (last 6 months)
    from collections import defaultdict
    monthly = defaultdict(int)
    for a in alerts:
        month = a.created_at.strftime("%b") if a.created_at else "Unknown"
        monthly[month] += 1

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    today = datetime.utcnow()
    last_6 = [(today - timedelta(days=30 * i)).strftime("%b") for i in range(5, -1, -1)]
    monthly_trends = [{"month": m, "alerts": monthly.get(m, 0)} for m in last_6]

    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "high_risk_projects": high_risk,
        "critical_alerts": critical_alerts,
        "total_sanctioned_amount": total_sanctioned,
        "total_expenditure": total_expenditure,
        "risk_distribution": risk_dist,
        "top_risk_projects": top_risk[:8],
        "financial_vs_physical": fvp,
        "monthly_alert_trends": monthly_trends,
    }
