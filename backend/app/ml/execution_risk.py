"""
Execution Risk — based on financial vs physical progress mismatch.
Also attempts XGBoost delay prediction.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import numpy as np
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False
    logger.warning("XGBoost not available. Using rule-based delay prediction.")


# ─── Date helper ──────────────────────────────────────────────────────────────

def _parse_date(d):
    """Parse a date from string, date, or None. Returns date or None."""
    from datetime import date as _date, datetime as _datetime
    if d is None:
        return None
    if isinstance(d, _date):
        return d
    if isinstance(d, str):
        try:
            return _datetime.strptime(d, "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


# ─── Progress Mismatch ────────────────────────────────────────────────────────

def compute_execution_risk(financial_progress: float, physical_progress: float) -> float:
    """
    Converts progress mismatch into execution risk score.
    mismatch = financial_progress - physical_progress
    """
    mismatch = financial_progress - physical_progress
    if mismatch <= 10:
        return min(30.0, max(0.0, mismatch * 2))
    elif mismatch <= 30:
        score = 30 + (mismatch - 10) * 1.5
        return min(60.0, score)
    elif mismatch <= 50:
        score = 60 + (mismatch - 30) * 1.0
        return min(80.0, score)
    else:
        score = 80 + (mismatch - 50) * 0.5
        return min(100.0, score)


def get_mismatch_level(mismatch: float) -> str:
    if mismatch <= 10:
        return "LOW"
    elif mismatch <= 30:
        return "MEDIUM"
    elif mismatch <= 50:
        return "HIGH"
    return "CRITICAL"


# ─── Delay Prediction ─────────────────────────────────────────────────────────

def _rule_based_delay(project: dict) -> dict:
    """
    Rule-based delay prediction when XGBoost is unavailable.
    """
    from datetime import date
    physical_progress = project.get("physical_progress", 0)
    financial_progress = project.get("financial_progress", 0)
    status = project.get("status", "")
    start_date = project.get("start_date")
    expected_date = project.get("expected_completion_date")

    # Base probability from status
    prob = 0.1
    if status == "Delayed":
        prob += 0.5
    if physical_progress < 30 and financial_progress > 50:
        prob += 0.3
    elif physical_progress < financial_progress - 20:
        prob += 0.2

    # Days elapsed vs expected
    try:
        today = date.today()
        if isinstance(start_date, str):
            from datetime import datetime
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if isinstance(expected_date, str):
            from datetime import datetime
            expected_date = datetime.strptime(expected_date, "%Y-%m-%d").date()

        if start_date and expected_date:
            total_days = (expected_date - start_date).days or 1
            elapsed = (today - start_date).days
            elapsed_fraction = elapsed / total_days

            remaining_work = 100 - physical_progress
            if elapsed_fraction > 0.5 and remaining_work > 60:
                prob += 0.25

            if today > expected_date:
                prob += 0.3
                days_overdue = (today - expected_date).days
                predicted_delay = int(days_overdue + remaining_work * 2)
            else:
                if physical_progress > 0:
                    rate = physical_progress / max(elapsed, 1)
                    days_needed = remaining_work / max(rate, 0.01)
                    days_left = (expected_date - today).days
                    predicted_delay = max(0, int(days_needed - days_left))
                else:
                    predicted_delay = 180
        else:
            predicted_delay = 60
    except Exception:
        predicted_delay = 60

    prob = min(0.99, max(0.01, prob))
    return {
        "delay_probability": round(prob, 2),
        "predicted_delay_days": predicted_delay,
    }


def predict_delay(project: dict, training_data: list) -> dict:
    """
    Main entry. Uses XGBoost if available, else rule-based.
    NOTE: XGBoost here requires pre-trained model or sufficient training data.
    For demo, always falls back to rule-based as we don't have a pre-trained model file.
    """
    return _rule_based_delay(project)
