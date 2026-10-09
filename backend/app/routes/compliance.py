from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import defaultdict
from app.database import get_db
from app.models.compliance import ComplianceCheck

router = APIRouter()


@router.get("/api/compliance")
def list_compliance(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ComplianceCheck)
    if project_id:
        query = query.filter(ComplianceCheck.project_id == project_id)

    checks = query.all()

    # Group by project
    grouped = defaultdict(list)
    scores = {}
    names = {}
    for c in checks:
        grouped[c.project_id].append(c)
        scores[c.project_id] = c.compliance_score
        names[c.project_id] = c.project_name

    result = []
    for pid, items in grouped.items():
        result.append({
            "id": items[0].id,
            "project_id": pid,
            "project_name": names[pid],
            "compliance_score": scores[pid],
            "checks": [
                {"rule": c.rule, "status": c.status, "severity": c.severity, "reason": c.reason}
                for c in items
            ],
        })

    return {"compliance": result, "total": len(result)}
