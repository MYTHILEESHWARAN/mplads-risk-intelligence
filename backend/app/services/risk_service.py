"""
Risk analysis orchestration service.
Coordinates all ML modules to produce a complete risk profile.
"""
import json
import logging
from typing import List, Dict, Any

from app.ml.financial_anomaly import compute_financial_risk
from app.ml.execution_risk import compute_execution_risk, get_mismatch_level, predict_delay
from app.ml.duplicate_detection import find_duplicates
from app.ml.compliance_engine import run_compliance_checks
from app.ml.evidence_risk import compute_evidence_risk
from app.ml.unified_score import compute_unified_score, get_risk_level, generate_flagged_reasons
from app.ml.features import compute_features
from app.ml.unified_score import compute_score_ledger, compute_confidence

logger = logging.getLogger(__name__)


def analyse_project(project: dict, all_projects: List[dict], evidence_list: List[dict]) -> dict:
    """
    Full risk analysis pipeline for a single project.

    Returns a complete risk profile dict.
    """
    project_id = project.get("project_id", "unknown")
    logger.info(f"Analysing project {project_id}")

    # 1. Financial anomaly
    financial_risk = compute_financial_risk(project, all_projects)

    # 2. Execution risk (progress mismatch)
    fp = float(project.get("financial_progress", 0))
    pp = float(project.get("physical_progress", 0))
    execution_risk = compute_execution_risk(fp, pp)
    mismatch = fp - pp
    mismatch_level = get_mismatch_level(mismatch)

    # 3. Delay prediction
    delay_result = predict_delay(project, all_projects)

    # 4. Duplicate detection
    duplicate_result = find_duplicates(project, all_projects)
    duplicate_risk = duplicate_result.get("duplicate_risk", 0.0)

    # 5. Compliance
    compliance_result = run_compliance_checks(project, evidence_list)
    compliance_risk = compliance_result.get("compliance_risk", 0.0)

    # 6. Evidence risk
    evidence_risk = compute_evidence_risk(evidence_list)

    # Attach sub-scores to project dict for reason generation
    project_with_scores = {
        **project,
        "financial_risk": financial_risk,
        "execution_risk": execution_risk,
        "duplicate_risk": duplicate_risk,
        "compliance_risk": compliance_risk,
        "evidence_risk": evidence_risk,
    }

    # 7. Unified score
    unified_score = compute_unified_score(
        financial_risk, execution_risk, duplicate_risk, compliance_risk, evidence_risk
    )
    risk_level = get_risk_level(unified_score)

    # 8. Explainable AI reasons
    flagged_reasons = generate_flagged_reasons(project_with_scores, duplicate_result, delay_result)

    # 9. Feature engineering (for confidence calculation)
    feature_result = compute_features(project, all_projects)

    # 10. Score ledger (every contribution traceable)
    ledger = compute_score_ledger(
        financial_risk, execution_risk, duplicate_risk, compliance_risk, evidence_risk
    )

    # 11. Confidence score
    confidence = compute_confidence(
        feature_result,
        {"evidence_risk": evidence_risk, "financial_risk": financial_risk}
    )

    return {
        "project_id": project_id,
        "financial_risk": round(financial_risk, 1),
        "execution_risk": round(execution_risk, 1),
        "duplicate_risk": round(duplicate_risk, 1),
        "compliance_risk": round(compliance_risk, 1),
        "evidence_risk": round(evidence_risk, 1),
        "unified_risk_score": unified_score,
        "risk_level": risk_level,
        "mismatch": round(mismatch, 1),
        "mismatch_level": mismatch_level,
        "flagged_reasons": flagged_reasons,
        "delay_probability": delay_result.get("delay_probability"),
        "predicted_delay_days": delay_result.get("predicted_delay_days"),
        "duplicate_result": duplicate_result,
        "compliance_result": compliance_result,
        "score_ledger": ledger,
        "confidence": confidence,
        "features": feature_result["features"],
        "missing_inputs": feature_result["missing_inputs"],
    }


def determine_alert_type(risk_result: dict, project: dict) -> List[dict]:
    """Generate alerts from a risk analysis result."""
    alerts = []
    score = risk_result.get("unified_risk_score", 0)
    level = risk_result.get("risk_level", "LOW")

    fp = float(project.get("financial_progress", 0))
    pp = float(project.get("physical_progress", 0))
    mismatch = fp - pp

    if risk_result.get("financial_risk", 0) > 70:
        alerts.append({
            "alert_type": "FINANCIAL_ANOMALY",
            "severity": level if score > 60 else "MEDIUM",
            "reason": f"Financial expenditure anomaly detected. Expenditure ratio: "
                      f"{round(project.get('actual_expenditure', 0) / max(project.get('estimated_cost', 1), 1), 2):.2f}"
        })

    if mismatch > 20:
        sev = "CRITICAL" if mismatch > 40 else "HIGH" if mismatch > 25 else "MEDIUM"
        alerts.append({
            "alert_type": "PROGRESS_MISMATCH",
            "severity": sev,
            "reason": f"Financial progress ({fp}%) is {mismatch:.0f} percentage points ahead of physical progress ({pp}%)."
        })

    dup = risk_result.get("duplicate_result", {})
    if dup.get("semantic_similarity", 0) >= 80:
        alerts.append({
            "alert_type": "POSSIBLE_DUPLICATE",
            "severity": "HIGH",
            "reason": f"Possible duplicate detected: {dup.get('semantic_similarity', 0):.0f}% semantic similarity with "
                      f"{dup.get('matched_project', {}).get('project_id', 'unknown')}."
        })

    delay = risk_result.get("delay_probability", 0)
    if delay and delay > 0.6:
        alerts.append({
            "alert_type": "DELAY_WARNING",
            "severity": "HIGH" if delay > 0.8 else "MEDIUM",
            "reason": f"Delay probability: {round(delay * 100):.0f}%. "
                      f"Predicted delay: {risk_result.get('predicted_delay_days', 0)} days."
        })

    comp = risk_result.get("compliance_result", {})
    failed = [c for c in comp.get("checks", []) if c.get("status") == "Failed"]
    if len(failed) >= 2:
        alerts.append({
            "alert_type": "COMPLIANCE_VIOLATION",
            "severity": "HIGH" if len(failed) >= 3 else "MEDIUM",
            "reason": f"{len(failed)} compliance checks failed: {', '.join(c['rule'] for c in failed[:2])}."
        })

    ev_risk = risk_result.get("evidence_risk", 0)
    if ev_risk > 60:
        alerts.append({
            "alert_type": "MISSING_EVIDENCE",
            "severity": "HIGH" if ev_risk > 80 else "MEDIUM",
            "reason": f"Evidence risk score: {ev_risk:.0f}/100. Required documents missing or inconsistent."
        })

    return alerts
