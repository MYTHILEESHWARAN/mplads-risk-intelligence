"""
Financial Anomaly Detection.

Uses Isolation Forest when scikit-learn is available and there is
sufficient training data (>=10 projects). Falls back to a deterministic
statistical approach when the model cannot be trained.
"""
import logging
import math
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Optional heavy imports
try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import LabelEncoder
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not available. Using statistical fallback for financial anomaly.")


def _expenditure_ratio(project: dict) -> float:
    est = project.get("estimated_cost", 0) or 1
    return project.get("actual_expenditure", 0) / est


def _statistical_score(project: dict, peers: List[dict]) -> float:
    """
    Deterministic fallback.
    Compares project expenditure ratio against peer average and std deviation.
    """
    ratio = _expenditure_ratio(project)

    # Peer comparison within same project_type
    project_type = project.get("project_type", "")
    same_type = [p for p in peers if p.get("project_type") == project_type and p.get("project_id") != project.get("project_id")]
    if len(same_type) >= 2:
        ratios = [_expenditure_ratio(p) for p in same_type]
        mean_r = sum(ratios) / len(ratios)
        std_r = math.sqrt(sum((r - mean_r) ** 2 for r in ratios) / len(ratios)) or 0.1
        z_score = abs(ratio - mean_r) / std_r
    else:
        # No peers — use absolute thresholds
        z_score = max(0.0, (ratio - 1.0) / 0.15)

    # Also factor in absolute deviation from estimated cost
    deviation = max(0.0, ratio - 1.0)  # overspend fraction

    # Combine z_score and direct deviation
    raw = (z_score * 30) + (deviation * 50)
    return min(100.0, max(0.0, raw))


def _ml_score(project: dict, all_projects: List[dict]) -> float:
    """
    Isolation Forest based anomaly score.
    """
    if len(all_projects) < 10:
        return _statistical_score(project, all_projects)

    try:
        le_type = LabelEncoder()
        le_district = LabelEncoder()
        le_agency = LabelEncoder()

        types = [p.get("project_type", "") for p in all_projects]
        districts = [p.get("district", "") for p in all_projects]
        agencies = [p.get("agency", "") for p in all_projects]

        le_type.fit(types)
        le_district.fit(districts)
        le_agency.fit(agencies)

        def feature_vec(p):
            return [
                p.get("sanction_amount", 0) / 1e7,
                p.get("estimated_cost", 0) / 1e7,
                p.get("actual_expenditure", 0) / 1e7,
                _expenditure_ratio(p),
                le_type.transform([p.get("project_type", types[0])])[0],
                le_district.transform([p.get("district", districts[0])])[0],
                le_agency.transform([p.get("agency", agencies[0])])[0],
            ]

        X = np.array([feature_vec(p) for p in all_projects])
        clf = IsolationForest(n_estimators=100, contamination=0.15, random_state=42)
        clf.fit(X)

        target_vec = np.array([feature_vec(project)])
        raw_score = clf.score_samples(target_vec)[0]
        # Raw score is negative; more negative = more anomalous
        # Normalize to 0-100
        normalized = (1 - (raw_score + 0.5)) * 100
        return float(min(100.0, max(0.0, normalized)))
    except Exception as e:
        logger.warning(f"IsolationForest failed: {e}. Using statistical fallback.")
        return _statistical_score(project, all_projects)


def compute_financial_risk(project: dict, all_projects: List[dict]) -> float:
    """
    Main entry point. Returns financial risk score 0-100.
    """
    if SKLEARN_AVAILABLE and len(all_projects) >= 10:
        return _ml_score(project, all_projects)
    return _statistical_score(project, all_projects)
