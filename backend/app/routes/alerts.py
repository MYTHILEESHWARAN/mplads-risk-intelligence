from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.alert import Alert

router = APIRouter()


@router.get("/api/alerts")
def list_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if status:
        query = query.filter(Alert.status == status)
    if type:
        query = query.filter(Alert.alert_type == type)

    alerts = query.order_by(Alert.detected_date.desc()).all()
    return {
        "alerts": [
            {
                "id": a.id, "alert_id": a.alert_id, "project_id": a.project_id,
                "project_name": a.project_name, "district": a.district,
                "alert_type": a.alert_type, "severity": a.severity,
                "risk_score": a.risk_score, "reason": a.reason,
                "status": a.status,
                "detected_date": a.detected_date.strftime("%Y-%m-%d") if a.detected_date else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
        "total": len(alerts),
    }


class AlertStatusUpdate(BaseModel):
    status: str  # "New" | "Under Review" | "Resolved" | "Escalated"


@router.patch("/api/alerts/{alert_id}/status")
def update_alert_status(alert_id: str, body: AlertStatusUpdate, db: Session = Depends(get_db)):
    valid = ["New", "Under Review", "Resolved", "Escalated"]
    if body.status not in valid:
        raise HTTPException(status_code=400, detail={"success": False, "message": f"Invalid status. Must be one of: {valid}"})
    alert = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail={"success": False, "message": "Alert not found"})
    alert.status = body.status
    db.commit()
    return {"success": True, "alert_id": alert_id, "status": body.status}
