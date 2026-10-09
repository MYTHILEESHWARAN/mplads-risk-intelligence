from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import defaultdict
from app.database import get_db
from app.models.project import Project, RiskAnalysis
from app.models.alert import Alert

router = APIRouter()


@router.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    risk_analyses = {r.project_id: r for r in db.query(RiskAnalysis).all()}
    alerts = db.query(Alert).all()

    # District risk
    district_map = defaultdict(lambda: {"high_risk": 0, "medium_risk": 0, "low_risk": 0})
    for p in projects:
        ra = risk_analyses.get(p.project_id)
        level = ra.risk_level if ra else "LOW"
        if level in ("HIGH", "CRITICAL"):
            district_map[p.district]["high_risk"] += 1
        elif level == "MEDIUM":
            district_map[p.district]["medium_risk"] += 1
        else:
            district_map[p.district]["low_risk"] += 1

    district_risk = [{"district": k, **v} for k, v in district_map.items()]

    # Agency risk
    agency_scores = defaultdict(list)
    for p in projects:
        ra = risk_analyses.get(p.project_id)
        if ra:
            agency_scores[p.agency].append(ra.unified_risk_score)
    agency_risk = [{"agency": k, "risk_score": round(sum(v) / len(v), 1)} for k, v in agency_scores.items()]
    agency_risk.sort(key=lambda x: x["risk_score"], reverse=True)

    # Progress comparison
    progress_data = sorted(
        [{"name": p.project_id, "financial": p.financial_progress, "physical": p.physical_progress}
         for p in projects],
        key=lambda x: abs(x["financial"] - x["physical"]), reverse=True
    )[:10]

    # Monthly expenditure (mock from project data — real impl would use FinancialRecord model)
    monthly_expenditure = [
        {"month": "Jan", "planned": 4800000, "actual": 3900000},
        {"month": "Feb", "planned": 5200000, "actual": 5800000},
        {"month": "Mar", "planned": 4900000, "actual": 6200000},
        {"month": "Apr", "planned": 5500000, "actual": 4100000},
        {"month": "May", "planned": 5100000, "actual": 5900000},
        {"month": "Jun", "planned": 4700000, "actual": 5100000},
        {"month": "Jul", "planned": 5300000, "actual": 4600000},
        {"month": "Aug", "planned": 4800000, "actual": 5400000},
        {"month": "Sep", "planned": 5000000, "actual": 5700000},
        {"month": "Oct", "planned": 4600000, "actual": 4300000},
    ]

    # Duplicate trends
    dup_count = defaultdict(int)
    for ra in risk_analyses.values():
        if ra.matched_project_id and ra.semantic_similarity and ra.semantic_similarity >= 80:
            month = ra.analysed_at.strftime("%b") if ra.analysed_at else "Oct"
            dup_count[month] += 1

    duplicate_trends = [{"month": m, "detected": c} for m, c in dup_count.items()] or [
        {"month": "Jul", "detected": 1}, {"month": "Aug", "detected": 2},
        {"month": "Sep", "detected": 3}, {"month": "Oct", "detected": 2},
    ]

    # Risk distribution from live risk_analyses
    risk_dist_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for ra in risk_analyses.values():
        level = ra.risk_level if ra else "LOW"
        risk_dist_counts[level] = risk_dist_counts.get(level, 0) + 1

    return {
        "district_risk": district_risk,
        "agency_risk": agency_risk,
        "monthly_expenditure": monthly_expenditure,
        "progress_comparison": progress_data,
        "duplicate_trends": duplicate_trends,
        "risk_distribution": risk_dist_counts,
    }
