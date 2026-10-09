import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.investigation import Investigation
from app.schemas.investigation import AssignRequest, StatusUpdateRequest
from app.utils.helpers import error_response

router = APIRouter()


@router.get("/api/investigations")
def list_investigations(db: Session = Depends(get_db)):
    invs = db.query(Investigation).order_by(Investigation.priority).all()
    return {
        "investigations": [
            {
                "id": i.id, "investigation_id": i.investigation_id,
                "project_id": i.project_id, "project_name": i.project_name,
                "district": i.district, "risk_score": i.risk_score, "risk_level": i.risk_level,
                "risk_factors": json.loads(i.risk_factors) if i.risk_factors else [],
                "priority": i.priority, "assigned_officer": i.assigned_officer,
                "status": i.status, "notes": i.notes,
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "last_updated": i.last_updated.isoformat() if i.last_updated else None,
            }
            for i in invs
        ],
        "total": len(invs),
    }


@router.post("/api/investigations/{project_id}/assign")
def assign_investigation(project_id: str, body: AssignRequest, db: Session = Depends(get_db)):
    inv = db.query(Investigation).filter(Investigation.project_id == project_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=error_response("Investigation not found", "INV_NOT_FOUND"))
    inv.assigned_officer = body.officer_name
    inv.status = "Assigned"
    db.commit()
    return {"success": True, "message": f"Assigned to {body.officer_name}"}


@router.post("/api/investigations/{project_id}/status")
def update_investigation_status(project_id: str, body: StatusUpdateRequest, db: Session = Depends(get_db)):
    valid_statuses = ["New", "Assigned", "Under Review", "Evidence Verification", "Resolved", "Escalated"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=error_response(f"Invalid status. Must be one of: {valid_statuses}", "INVALID_STATUS"))

    inv = db.query(Investigation).filter(Investigation.project_id == project_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=error_response("Investigation not found", "INV_NOT_FOUND"))

    inv.status = body.status
    if body.notes:
        inv.notes = body.notes
    db.commit()
    return {"success": True, "message": f"Status updated to {body.status}"}


class CaseNote(BaseModel):
    note: str
    actor: Optional[str] = "Officer"


@router.post("/api/investigations/{project_id}/note")
def add_investigation_note(project_id: str, body: CaseNote, db: Session = Depends(get_db)):
    inv = db.query(Investigation).filter(Investigation.project_id == project_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail=error_response("Investigation not found", "INV_NOT_FOUND"))
    existing = json.loads(inv.notes) if inv.notes and inv.notes.startswith('[') else []
    existing.append({"actor": body.actor, "note": body.note, "timestamp": datetime.utcnow().isoformat()})
    inv.notes = json.dumps(existing)
    db.commit()
    return {"success": True, "notes": existing}
