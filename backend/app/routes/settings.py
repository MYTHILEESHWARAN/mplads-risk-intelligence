"""
Settings API — runtime configurable thresholds and risk weights.
Settings are persisted in a simple JSON file (settings.json) next to the DB.
This avoids requiring an extra DB table while still persisting across restarts.
"""
import json
import os
import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)

SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "settings.json")

DEFAULT_SETTINGS = {
    "weight_financial": 0.25,
    "weight_execution": 0.20,
    "weight_duplicate": 0.15,
    "weight_compliance": 0.15,
    "weight_evidence": 0.25,
    "risk_threshold_alert": 60,
    "duplicate_semantic_threshold": 80,
    "mismatch_high_threshold": 30,
    "mismatch_critical_threshold": 50,
    "alert_email": False,
    "alert_sms": False,
    "critical_alerts_only": False,
    "weekly_report": False,
    "auto_analysis": False,
    "version": 1,
}


def load_settings() -> dict:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                stored = json.load(f)
            # Merge with defaults so new keys always exist
            return {**DEFAULT_SETTINGS, **stored}
        except Exception as e:
            logger.warning(f"Failed to load settings.json: {e}. Using defaults.")
    return dict(DEFAULT_SETTINGS)


def save_settings(data: dict):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=2)


class SettingsUpdate(BaseModel):
    weight_financial: Optional[float] = None
    weight_execution: Optional[float] = None
    weight_duplicate: Optional[float] = None
    weight_compliance: Optional[float] = None
    weight_evidence: Optional[float] = None
    risk_threshold_alert: Optional[int] = None
    duplicate_semantic_threshold: Optional[int] = None
    mismatch_high_threshold: Optional[int] = None
    mismatch_critical_threshold: Optional[int] = None
    alert_email: Optional[bool] = None
    alert_sms: Optional[bool] = None
    critical_alerts_only: Optional[bool] = None
    weekly_report: Optional[bool] = None
    auto_analysis: Optional[bool] = None


@router.get("/api/settings")
def get_settings():
    return load_settings()


@router.put("/api/settings")
def update_settings(body: SettingsUpdate):
    current = load_settings()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}

    # Validate weights sum to 1.0 if any weight is being updated
    weight_keys = ["weight_financial", "weight_execution", "weight_duplicate", "weight_compliance", "weight_evidence"]
    new_weights = {k: update_data.get(k, current[k]) for k in weight_keys}
    total = sum(new_weights.values())
    if abs(total - 1.0) > 0.01:
        return {"success": False, "message": f"Weights must sum to 1.0. Current sum: {round(total, 3)}"}

    current.update(update_data)
    current["version"] = current.get("version", 1) + 1
    save_settings(current)
    return {"success": True, "message": "Settings saved.", "settings": current}
