from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.evidence import Evidence

router = APIRouter()


@router.get("/api/evidence")
def list_evidence(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Evidence)
    if project_id:
        query = query.filter(Evidence.project_id == project_id)
    if status:
        query = query.filter(Evidence.verification_status == status)

    evidence = query.all()
    return {
        "evidence": [
            {
                "id": e.id, "project_id": e.project_id, "project_name": e.project_name,
                "evidence_type": e.evidence_type,
                "upload_date": str(e.upload_date) if e.upload_date else None,
                "verification_status": e.verification_status, "risk_status": e.risk_status,
                "notes": e.notes, "file_name": e.file_name,
            }
            for e in evidence
        ],
        "total": len(evidence),
    }
