"""
Feature engineering for the MPLADS risk ML pipeline.
Computes and documents every feature. Missing inputs lower confidence, not raise risk.
"""
from typing import Optional
import math


def compute_features(project: dict, all_projects: list, expenditure_entries: list = None) -> dict:
    """
    Compute all features for a project.
    Returns a dict with feature values and a confidence score.
    """
    features = {}
    missing = []

    def get(key, default=None):
        val = project.get(key, default)
        if val is None:
            missing.append(key)
        return val

    sanction = get("sanction_amount") or 1
    estimated = get("estimated_cost") or 1
    actual_exp = get("actual_expenditure") or 0
    fp = get("financial_progress") or 0
    pp = get("physical_progress") or 0

    # Core ratios
    features["utilisation_pct"] = round(actual_exp / sanction * 100, 2)
    features["progress_gap"] = round(fp - pp, 2)
    features["spend_vs_sanction_ratio"] = round(actual_exp / sanction, 4)
    features["expenditure_ratio"] = round(actual_exp / estimated, 4)

    # Peer group comparison (same category + state)
    category = get("project_type", "")
    state = get("state", "")
    peers = [
        p for p in all_projects
        if p.get("project_type") == category
        and p.get("state") == state
        and p.get("project_id") != project.get("project_id")
    ]
    if len(peers) >= 3:
        peer_ratios = [p.get("actual_expenditure", 0) / max(p.get("estimated_cost", 1), 1) for p in peers]
        peer_mean = sum(peer_ratios) / len(peer_ratios)
        peer_std = math.sqrt(sum((r - peer_mean) ** 2 for r in peer_ratios) / len(peer_ratios)) or 0.01
        features["cost_per_unit_z_vs_peer"] = round((features["expenditure_ratio"] - peer_mean) / peer_std, 3)
        features["peer_group_size"] = len(peers)
    else:
        features["cost_per_unit_z_vs_peer"] = None
        features["peer_group_size"] = len(peers)
        missing.append("peer_group_size_insufficient")

    # Timeline features
    from datetime import date
    from app.ml.execution_risk import _parse_date
    today = date.today()
    start = _parse_date(get("start_date"))
    expected_end = _parse_date(get("expected_completion_date"))

    if start and expected_end:
        total_days = max((expected_end - start).days, 1)
        elapsed = max((today - start).days, 0)
        features["schedule_elapsed_pct"] = round(elapsed / total_days * 100, 2)
        features["days_overdue"] = max(0, (today - expected_end).days)
    else:
        features["schedule_elapsed_pct"] = None
        features["days_overdue"] = None
        missing.extend(["start_date", "expected_completion_date"])

    # Burn rate vs progress rate
    if features.get("schedule_elapsed_pct") and features["schedule_elapsed_pct"] > 0:
        burn_rate = fp / features["schedule_elapsed_pct"]
        progress_rate = pp / features["schedule_elapsed_pct"]
        features["burn_rate_vs_progress_rate"] = round(burn_rate / max(progress_rate, 0.01), 3)
    else:
        features["burn_rate_vs_progress_rate"] = None

    # Payment pattern features
    if expenditure_entries:
        amounts = [e.get("amount", 0) for e in expenditure_entries]
        total = sum(amounts) or 1
        features["payment_count"] = len(amounts)
        features["largest_payment_share"] = round(max(amounts) / total, 3) if amounts else None

        # Round number payment share (multiples of 1 lakh = 100000)
        round_count = sum(1 for a in amounts if a > 0 and abs(a % 100000) < 1)
        features["round_number_payment_share"] = round(round_count / len(amounts), 3) if amounts else 0
    else:
        features["payment_count"] = None
        features["largest_payment_share"] = None
        features["round_number_payment_share"] = None
        missing.extend(["expenditure_entries"])

    # Confidence: reduces with missing features
    total_features = 12
    missing_count = sum(1 for v in [
        features.get("utilisation_pct"), features.get("progress_gap"),
        features.get("schedule_elapsed_pct"), features.get("days_overdue"),
        features.get("burn_rate_vs_progress_rate"), features.get("payment_count"),
    ] if v is None)
    confidence = round(max(20.0, 100.0 - (missing_count / total_features) * 60), 1)

    return {
        "features": features,
        "missing_inputs": list(set(missing)),
        "confidence": confidence,
        "peer_group_size": len(peers),
    }
