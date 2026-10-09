"""
Project API routes.
"""
import json
import hashlib
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models.project import Project, RiskAnalysis, AnalysisRun
from app.models.evidence import Evidence
from app.models.compliance import ComplianceCheck
from app.schemas.project import (
    ProjectCreate, ProjectResponse, ProjectListResponse,
    RiskBreakdown, DuplicateResult, RiskMapItem
)
from app.services.risk_service import analyse_project, determine_alert_type
from app.utils.helpers import error_response, success_response

router = APIRouter()


def _project_to_dict(p: Project) -> dict:
    return {
        "project_id": p.project_id, "project_name": p.project_name,
        "mp_name": p.mp_name, "constituency": p.constituency,
        "district": p.district, "state": p.state,
        "project_type": p.project_type, "agency": p.agency,
        "sanction_amount": p.sanction_amount, "estimated_cost": p.estimated_cost,
        "actual_expenditure": p.actual_expenditure,
        "physical_progress": p.physical_progress, "financial_progress": p.financial_progress,
        "sanction_date": str(p.sanction_date) if p.sanction_date else None,
        "start_date": str(p.start_date) if p.start_date else None,
        "expected_completion_date": str(p.expected_completion_date) if p.expected_completion_date else None,
        "actual_completion_date": str(p.actual_completion_date) if p.actual_completion_date else None,
        "latitude": p.latitude, "longitude": p.longitude, "status": p.status,
    }


@router.get("/api/projects")
def list_projects(
    search: Optional[str] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    agency: Optional[str] = None,
    sort: Optional[str] = "risk_desc",
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Project)

    if search:
        query = query.filter(
            or_(
                Project.project_name.ilike(f"%{search}%"),
                Project.project_id.ilike(f"%{search}%"),
                Project.mp_name.ilike(f"%{search}%"),
            )
        )
    if district:
        query = query.filter(Project.district == district)
    if state:
        query = query.filter(Project.state == state)
    if status:
        query = query.filter(Project.status == status)
    if agency:
        query = query.filter(Project.agency == agency)

    total = query.count()
    projects = query.offset((page - 1) * limit).limit(limit).all()

    result = []
    for p in projects:
        pd = _project_to_dict(p)
        ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == p.project_id).first()
        if ra:
            pd.update({
                "id": p.id, "risk_score": ra.unified_risk_score, "risk_level": ra.risk_level,
                "financial_risk": ra.financial_risk, "execution_risk": ra.execution_risk,
                "duplicate_risk": ra.duplicate_risk, "compliance_risk": ra.compliance_risk,
                "evidence_risk": ra.evidence_risk,
                "primary_reason": (json.loads(ra.flagged_reasons)[0]["text"] if ra.flagged_reasons else ""),
                "created_at": p.created_at, "updated_at": p.updated_at,
            })
        else:
            pd.update({"id": p.id, "risk_score": 0, "risk_level": "LOW",
                       "created_at": p.created_at, "updated_at": p.updated_at})
        result.append(pd)

    # Sort by risk
    if sort == "risk_desc":
        result.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
    elif sort == "risk_asc":
        result.sort(key=lambda x: x.get("risk_score", 0))
    elif sort == "amount_desc":
        result.sort(key=lambda x: x.get("sanction_amount", 0), reverse=True)

    if risk_level:
        result = [r for r in result if r.get("risk_level") == risk_level]
        total = len(result)

    total_pages = max(1, (total + limit - 1) // limit)

    return {
        "projects": result,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }




@router.post("/api/projects")
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    """
    Create a new project.
    Validates for duplicate project_id before inserting.
    Risk analysis is NOT run automatically � call POST /api/projects/{id}/analyze separately.
    """
    # Duplicate project_id check
    existing = db.query(Project).filter(Project.project_id == payload.project_id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=error_response(
                f"Project ID '{payload.project_id}' already exists.",
                "DUPLICATE_PROJECT_ID"
            )
        )

    p = Project(
        project_id=payload.project_id,
        project_name=payload.project_name,
        mp_name=payload.mp_name or "",
        constituency=payload.constituency or "",
        district=payload.district,
        state=payload.state,
        project_type=payload.project_type,
        agency=payload.agency,
        sanction_amount=payload.sanction_amount,
        estimated_cost=payload.estimated_cost,
        actual_expenditure=payload.actual_expenditure,
        physical_progress=payload.physical_progress,
        financial_progress=payload.financial_progress,
        sanction_date=payload.sanction_date,
        start_date=payload.start_date,
        expected_completion_date=payload.expected_completion_date,
        actual_completion_date=payload.actual_completion_date,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status=payload.status,
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    result = _project_to_dict(p)
    result["id"] = p.id
    result["created_at"] = p.created_at.isoformat() if p.created_at else None
    result["updated_at"] = p.updated_at.isoformat() if p.updated_at else None
    result["risk_score"] = None
    result["risk_level"] = None
    result["analysis_status"] = "PENDING"

    return {
        "success": True,
        "message": f"Project {p.project_id} created. Run risk analysis to generate risk scores.",
        "project": result,
    }

@router.get("/api/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=error_response("Project not found", "PROJECT_NOT_FOUND"))

    pd = _project_to_dict(p)
    pd["id"] = p.id
    pd["created_at"] = p.created_at
    pd["updated_at"] = p.updated_at

    ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == project_id).first()
    if ra:
        pd.update({
            "risk_score": ra.unified_risk_score, "risk_level": ra.risk_level,
            "financial_risk": ra.financial_risk, "execution_risk": ra.execution_risk,
            "duplicate_risk": ra.duplicate_risk, "compliance_risk": ra.compliance_risk,
            "evidence_risk": ra.evidence_risk,
        })
    return pd


@router.get("/api/projects/{project_id}/risk")
def get_project_risk(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=error_response("Project not found", "PROJECT_NOT_FOUND"))

    ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == project_id).first()
    if not ra:
        raise HTTPException(status_code=404, detail=error_response("Risk analysis not found. Run /analyze first.", "RISK_NOT_FOUND"))

    mismatch = (p.financial_progress or 0) - (p.physical_progress or 0)
    from app.ml.execution_risk import get_mismatch_level
    return {
        "financial_risk": ra.financial_risk,
        "execution_risk": ra.execution_risk,
        "duplicate_risk": ra.duplicate_risk,
        "compliance_risk": ra.compliance_risk,
        "evidence_risk": ra.evidence_risk,
        "unified_risk_score": ra.unified_risk_score,
        "risk_level": ra.risk_level,
        "mismatch": mismatch,
        "mismatch_level": get_mismatch_level(mismatch),
        "flagged_reasons": json.loads(ra.flagged_reasons) if ra.flagged_reasons else [],
        "delay_probability": ra.delay_probability,
        "predicted_delay_days": ra.predicted_delay_days,
    }


@router.get("/api/projects/{project_id}/duplicates")
def get_project_duplicates(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=error_response("Project not found", "PROJECT_NOT_FOUND"))

    ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == project_id).first()
    if not ra or not ra.matched_project_id:
        return {"semantic_similarity": 0, "geographical_similarity": 0, "distance_km": None, "matched_project": None, "duplicate_risk": 0}

    matched = db.query(Project).filter(Project.project_id == ra.matched_project_id).first()
    matched_dict = _project_to_dict(matched) if matched else None

    return {
        "semantic_similarity": ra.semantic_similarity,
        "geographical_similarity": ra.geographical_similarity,
        "distance_km": ra.distance_km,
        "matched_project": matched_dict,
        "duplicate_risk": ra.duplicate_risk,
    }


@router.get("/api/projects/{project_id}/evidence")
def get_project_evidence(project_id: str, db: Session = Depends(get_db)):
    evidence = db.query(Evidence).filter(Evidence.project_id == project_id).all()
    return {"evidence": [{"id": e.id, "project_id": e.project_id, "project_name": e.project_name,
                           "evidence_type": e.evidence_type, "upload_date": str(e.upload_date) if e.upload_date else None,
                           "verification_status": e.verification_status, "risk_status": e.risk_status,
                           "notes": e.notes, "file_name": e.file_name} for e in evidence],
            "total": len(evidence)}


@router.get("/api/projects/{project_id}/compliance")
def get_project_compliance(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=error_response("Project not found", "PROJECT_NOT_FOUND"))

    checks = db.query(ComplianceCheck).filter(ComplianceCheck.project_id == project_id).all()
    if not checks:
        return {"compliance_score": 0, "checks": [], "project_id": project_id}

    score = checks[0].compliance_score if checks else 0
    return {
        "project_id": project_id,
        "project_name": p.project_name,
        "compliance_score": score,
        "checks": [{"rule": c.rule, "status": c.status, "severity": c.severity, "reason": c.reason} for c in checks],
    }


@router.post("/api/projects/{project_id}/analyze")
def analyze_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=error_response("Project not found", "PROJECT_NOT_FOUND"))

    all_projects = [_project_to_dict(x) for x in db.query(Project).all()]
    evidence = db.query(Evidence).filter(Evidence.project_id == project_id).all()
    evidence_list = [{"evidence_type": e.evidence_type, "verification_status": e.verification_status} for e in evidence]

    result = analyse_project(_project_to_dict(p), all_projects, evidence_list)

    # Persist risk analysis
    ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == project_id).first()
    if not ra:
        ra = RiskAnalysis(project_id=project_id)
        db.add(ra)

    dup = result.get("duplicate_result", {})
    matched = dup.get("matched_project")

    ra.financial_risk = result["financial_risk"]
    ra.execution_risk = result["execution_risk"]
    ra.duplicate_risk = result["duplicate_risk"]
    ra.compliance_risk = result["compliance_risk"]
    ra.evidence_risk = result["evidence_risk"]
    ra.unified_risk_score = result["unified_risk_score"]
    ra.risk_level = result["risk_level"]
    ra.matched_project_id = matched.get("project_id") if matched else None
    ra.semantic_similarity = dup.get("semantic_similarity", 0)
    ra.geographical_similarity = dup.get("geographical_similarity", 0)
    ra.distance_km = dup.get("distance_km")
    ra.delay_probability = result.get("delay_probability")
    ra.predicted_delay_days = result.get("predicted_delay_days")
    ra.flagged_reasons = json.dumps(result["flagged_reasons"])

    db.commit()

    # Record this analysis run in the ledger
    input_data = json.dumps(_project_to_dict(p), sort_keys=True, default=str)
    input_hash = hashlib.sha256(input_data.encode()).hexdigest()

    run = AnalysisRun(
        project_id=project_id,
        finished_at=datetime.utcnow(),
        triggered_by="user",
        ruleset_version="1.0.0",
        model_versions=json.dumps({
            "isolation_forest": "sklearn-1.9.1",
            "execution_risk": "rule-based-1.0",
            "duplicate_detection": "tfidf-sklearn-1.9.1",
            "compliance_engine": "rules-1.0.0",
            "evidence_risk": "formula-1.0.0",
            "unified_score": "weighted-sum-1.0.0",
        }),
        input_hash=input_hash,
        component_scores=json.dumps({
            "financial_risk": result["financial_risk"],
            "execution_risk": result["execution_risk"],
            "duplicate_risk": result["duplicate_risk"],
            "compliance_risk": result["compliance_risk"],
            "evidence_risk": result["evidence_risk"],
        }),
        weights=json.dumps({
            "financial": 0.25, "execution": 0.20,
            "duplicate": 0.15, "compliance": 0.15, "evidence": 0.25,
        }),
        final_score=result["unified_risk_score"],
        confidence=round(min(100.0, max(10.0, 100.0 - result["evidence_risk"] * 0.3)), 1),
        explanations=json.dumps(result["flagged_reasons"]),
        data_provenance="SYNTHETIC",
        status="completed",
    )
    db.add(run)
    db.commit()

    return {
        "success": True,
        "message": "Analysis complete.",
        "risk_level": result["risk_level"],
        "unified_risk_score": result["unified_risk_score"],
        "run_id": run.id,
        "component_scores": {
            "financial_risk": result["financial_risk"],
            "execution_risk": result["execution_risk"],
            "duplicate_risk": result["duplicate_risk"],
            "compliance_risk": result["compliance_risk"],
            "evidence_risk": result["evidence_risk"],
        },
        "confidence": run.confidence,
    }


@router.post("/api/projects/{project_id}/simulate")
def simulate_project(project_id: str, body: dict, db: Session = Depends(get_db)):
    """
    What-if simulation — compute a hypothetical risk score with modified inputs.
    Does NOT persist anything. Returns the hypothetical score only.
    """
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=error_response("Project not found", "PROJECT_NOT_FOUND"))

    # Override project fields with simulation values
    sim_dict = _project_to_dict(p)
    for k in ["actual_expenditure", "physical_progress", "financial_progress",
              "estimated_cost", "sanction_amount"]:
        if k in body:
            try:
                sim_dict[k] = float(body[k])
            except (ValueError, TypeError):
                pass

    all_projects = [_project_to_dict(x) for x in db.query(Project).all()]
    evidence = db.query(Evidence).filter(Evidence.project_id == project_id).all()
    evidence_list = [{"evidence_type": e.evidence_type, "verification_status": e.verification_status}
                     for e in evidence]

    result = analyse_project(sim_dict, all_projects, evidence_list)
    return {
        "success": True,
        "simulation": True,
        "note": "This is a hypothetical scenario. No data was changed.",
        "hypothetical_risk_level": result["risk_level"],
        "hypothetical_risk_score": result["unified_risk_score"],
        "component_scores": {
            "financial_risk": result["financial_risk"],
            "execution_risk": result["execution_risk"],
            "duplicate_risk": result["duplicate_risk"],
            "compliance_risk": result["compliance_risk"],
            "evidence_risk": result["evidence_risk"],
        },
        "score_ledger": result.get("score_ledger", []),
        "flagged_reasons": result["flagged_reasons"],
    }


@router.get("/api/projects/{project_id}/runs")
def get_project_runs(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail=error_response("Project not found", "PROJECT_NOT_FOUND"))
    runs = db.query(AnalysisRun).filter(
        AnalysisRun.project_id == project_id
    ).order_by(AnalysisRun.created_at.desc()).all()
    return {
        "runs": [
            {
                "id": r.id,
                "project_id": r.project_id,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "finished_at": r.finished_at.isoformat() if r.finished_at else None,
                "triggered_by": r.triggered_by,
                "ruleset_version": r.ruleset_version,
                "final_score": r.final_score,
                "confidence": r.confidence,
                "data_provenance": r.data_provenance,
                "status": r.status,
                "component_scores": json.loads(r.component_scores) if r.component_scores else {},
                "weights": json.loads(r.weights) if r.weights else {},
            }
            for r in runs
        ],
        "total": len(runs),
    }


@router.get("/api/risk-map")
def get_risk_map(db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.latitude.isnot(None)).all()
    result = []
    for p in projects:
        ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == p.project_id).first()
        reason = ""
        if ra and ra.flagged_reasons:
            reasons = json.loads(ra.flagged_reasons)
            reason = reasons[0]["text"] if reasons else ""
        result.append({
            "project_id": p.project_id, "project_name": p.project_name,
            "latitude": p.latitude, "longitude": p.longitude,
            "district": p.district,
            "risk_score": ra.unified_risk_score if ra else 0,
            "risk_level": ra.risk_level if ra else "LOW",
            "primary_reason": reason,
        })
    return {"projects": result}
