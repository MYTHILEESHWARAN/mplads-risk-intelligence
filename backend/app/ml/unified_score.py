"""
Unified risk score calculator and explainability module.
"""
from typing import List, Dict, Any
from app.config import settings


def compute_unified_score(
    financial_risk: float,
    execution_risk: float,
    duplicate_risk: float,
    compliance_risk: float,
    evidence_risk: float,
) -> float:
    """
    Weighted composite risk score.
    Weights from settings (default: financial=0.25, execution=0.20,
    duplicate=0.15, compliance=0.15, evidence=0.25).
    """
    score = (
        financial_risk * settings.WEIGHT_FINANCIAL
        + execution_risk * settings.WEIGHT_EXECUTION
        + duplicate_risk * settings.WEIGHT_DUPLICATE
        + compliance_risk * settings.WEIGHT_COMPLIANCE
        + evidence_risk * settings.WEIGHT_EVIDENCE
    )
    return round(min(100.0, max(0.0, score)), 1)


def get_risk_level(score: float) -> str:
    if score <= 30:
        return "LOW"
    elif score <= 60:
        return "MEDIUM"
    elif score <= 80:
        return "HIGH"
    return "CRITICAL"


def generate_flagged_reasons(project: dict, duplicate_result: dict, delay_result: dict) -> List[Dict[str, Any]]:
    """
    Produces human-readable, explainable AI reasons for why a project was flagged.

    IMPORTANT: Never states "Fraud confirmed". Always frames findings as risk indicators
    that require investigation by authorised human officers.
    """
    reasons = []
    est = project.get("estimated_cost") or 1
    expenditure = project.get("actual_expenditure", 0)
    ratio = expenditure / est

    fp = project.get("financial_progress", 0)
    pp = project.get("physical_progress", 0)
    mismatch = fp - pp

    # Financial overspend
    if ratio > 1.3:
        reasons.append({
            "icon": "trending-up",
            "severity": "CRITICAL",
            "text": f"Actual expenditure is {round((ratio - 1) * 100, 0):.0f}% above the estimated cost. "
                    "This is significantly higher than comparable projects in the same category."
        })
    elif ratio > 1.1:
        reasons.append({
            "icon": "trending-up",
            "severity": "HIGH",
            "text": f"Actual expenditure is {round((ratio - 1) * 100, 0):.0f}% above the estimated cost."
        })

    # Progress mismatch
    if mismatch > 40:
        reasons.append({
            "icon": "bar-chart-2",
            "severity": "CRITICAL",
            "text": f"Financial progress ({fp}%) is {mismatch} percentage points ahead of physical progress ({pp}%). "
                    "This level of mismatch strongly warrants on-site verification."
        })
    elif mismatch > 20:
        reasons.append({
            "icon": "bar-chart-2",
            "severity": "HIGH",
            "text": f"Financial progress ({fp}%) is {mismatch} percentage points ahead of physical progress ({pp}%)."
        })
    elif mismatch > 10:
        reasons.append({
            "icon": "bar-chart-2",
            "severity": "MEDIUM",
            "text": f"Financial progress ({fp}%) is {mismatch} percentage points ahead of physical progress ({pp}%)."
        })

    # Duplicate
    sem = duplicate_result.get("semantic_similarity", 0)
    geo = duplicate_result.get("geographical_similarity", 0)
    if sem >= 80:
        matched = duplicate_result.get("matched_project", {})
        dist = duplicate_result.get("distance_km")
        dist_text = f" ({dist} km away)" if dist is not None else ""
        reasons.append({
            "icon": "copy",
            "severity": "HIGH",
            "text": f"A semantically similar project{dist_text} was detected "
                    f"({matched.get('project_id', 'unknown')} — {sem}% semantic similarity, {geo}% geographical similarity). "
                    "Possible duplicate expenditure — recommended for cross-verification."
        })

    # Delay
    delay_prob = delay_result.get("delay_probability", 0)
    delay_days = delay_result.get("predicted_delay_days", 0)
    if delay_prob > 0.7:
        reasons.append({
            "icon": "clock",
            "severity": "HIGH",
            "text": f"Delay prediction model estimates {round(delay_prob * 100):.0f}% probability of delay "
                    f"(predicted additional delay: {delay_days} days)."
        })
    elif delay_prob > 0.4 or project.get("status") == "Delayed":
        reasons.append({
            "icon": "clock",
            "severity": "MEDIUM",
            "text": f"Project shows indicators of potential delay. Status: {project.get('status', 'Unknown')}."
        })

    # Evidence
    ev_risk = project.get("evidence_risk", 0)
    if ev_risk > 70:
        reasons.append({
            "icon": "file-x",
            "severity": "HIGH",
            "text": "Required supporting evidence is incomplete or inconsistent with the reported progress."
        })

    # Compliance
    comp_risk = project.get("compliance_risk", 0)
    if comp_risk > 60:
        reasons.append({
            "icon": "shield-off",
            "severity": "MEDIUM",
            "text": "Multiple compliance checks have failed — missing documentation and/or overdue progress updates."
        })

    if not reasons:
        reasons.append({
            "icon": "check-circle",
            "severity": "LOW",
            "text": "No significant anomalies detected. Project appears within normal parameters."
        })

    return reasons


def compute_score_ledger(
    financial_risk: float,
    execution_risk: float,
    duplicate_risk: float,
    compliance_risk: float,
    evidence_risk: float,
    weights: dict = None,
) -> list:
    """
    Returns a score ledger — every contribution traced.
    The sum of 'points_added' equals the final score exactly.
    """
    if weights is None:
        weights = {
            "financial": 0.25, "execution": 0.20,
            "duplicate": 0.15, "compliance": 0.15, "evidence": 0.25,
        }
    components = [
        ("Financial Anomaly",    financial_risk,  weights["financial"]),
        ("Execution Risk",       execution_risk,  weights["execution"]),
        ("Duplicate Detection",  duplicate_risk,  weights["duplicate"]),
        ("Compliance",           compliance_risk, weights["compliance"]),
        ("Evidence Risk",        evidence_risk,   weights["evidence"]),
    ]
    ledger = []
    for name, raw, weight in components:
        points = round(raw * weight, 2)
        ledger.append({
            "component": name,
            "raw_score": round(raw, 1),
            "weight": weight,
            "points_added": points,
            "description": _component_description(name, raw),
        })
    return ledger


def _component_description(component: str, score: float) -> str:
    level = "low" if score <= 30 else "moderate" if score <= 60 else "elevated" if score <= 80 else "high"
    descriptions = {
        "Financial Anomaly": f"Expenditure pattern shows {level} anomaly vs peer group.",
        "Execution Risk": f"Financial vs physical progress mismatch is {level}.",
        "Duplicate Detection": f"Semantic and geographical similarity to other projects is {level}.",
        "Compliance": f"Compliance with documentation and timeline rules is {level}.",
        "Evidence Risk": f"Evidence completeness and consistency shows {level} concern.",
    }
    return descriptions.get(component, f"Score: {score:.0f}/100")


def compute_confidence(feature_result: dict, component_scores: dict) -> float:
    """
    Confidence 0-100 based on:
    - Input completeness (from feature engineering)
    - Evidence quality (inverse of evidence_risk)
    - Peer group size for Isolation Forest
    """
    base = feature_result.get("confidence", 80.0)

    # Evidence completeness lowers confidence
    ev_risk = component_scores.get("evidence_risk", 50)
    ev_factor = (100 - ev_risk) / 100

    # Peer group size affects IF reliability
    peer_size = feature_result.get("peer_group_size", 0)
    peer_factor = min(1.0, peer_size / 10)

    confidence = base * 0.5 + ev_factor * 30 + peer_factor * 20
    return round(max(10.0, min(100.0, confidence)), 1)
