"""Members (MPs) and fund flow API routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.extended import Member, FundLedger, GroundTruth
from app.models.project import Project, RiskAnalysis

router = APIRouter()


@router.get("/api/members")
def list_members(
    state: Optional[str] = None,
    house: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Member)
    if state:
        query = query.filter(Member.state == state)
    if house:
        query = query.filter(Member.house == house)
    if search:
        query = query.filter(Member.name.ilike(f"%{search}%"))

    total = query.count()
    members = query.offset((page - 1) * limit).limit(limit).all()

    result = []
    for m in members:
        # Fund stats
        ledger = db.query(FundLedger).filter(FundLedger.member_code == m.member_code).all()
        total_released = sum(fl.amount_released for fl in ledger)
        total_unspent = sum(fl.unspent_closing for fl in ledger)
        utilisation = round((1 - total_unspent / total_released) * 100, 1) if total_released > 0 else 0.0

        # Project stats
        projects = db.query(Project).filter(Project.mp_name == m.name).all()
        proj_risk = []
        for p in projects:
            ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == p.project_id).first()
            if ra:
                proj_risk.append(ra.unified_risk_score)

        result.append({
            "member_code": m.member_code,
            "name": m.name,
            "house": m.house,
            "party": m.party,
            "state": m.state,
            "constituency_name": m.constituency_name,
            "is_synthetic": m.is_synthetic,
            "total_released": total_released,
            "total_unspent": total_unspent,
            "utilisation_pct": utilisation,
            "project_count": len(projects),
            "avg_risk_score": round(sum(proj_risk) / len(proj_risk), 1) if proj_risk else None,
        })

    return {"members": result, "total": total, "page": page, "limit": limit}


@router.get("/api/members/{member_code}")
def get_member(member_code: str, db: Session = Depends(get_db)):
    m = db.query(Member).filter(Member.member_code == member_code).first()
    if not m:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"message": "Member not found"})

    ledger = db.query(FundLedger).filter(FundLedger.member_code == member_code).order_by(FundLedger.financial_year).all()
    projects = db.query(Project).filter(Project.mp_name == m.name).all()

    proj_details = []
    for p in projects:
        ra = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == p.project_id).first()
        proj_details.append({
            "project_id": p.project_id, "project_name": p.project_name,
            "district": p.district, "status": p.status,
            "sanction_amount": p.sanction_amount, "actual_expenditure": p.actual_expenditure,
            "physical_progress": p.physical_progress,
            "risk_score": ra.unified_risk_score if ra else None,
            "risk_level": ra.risk_level if ra else "PENDING",
        })

    return {
        "member": {
            "member_code": m.member_code, "name": m.name, "house": m.house,
            "party": m.party, "state": m.state,
            "constituency_name": m.constituency_name, "is_synthetic": m.is_synthetic,
        },
        "fund_ledger": [
            {
                "financial_year": fl.financial_year, "entitlement": fl.entitlement,
                "amount_released": fl.amount_released, "unspent_closing": fl.unspent_closing,
                "utilisation_pct": round((1 - fl.unspent_closing / fl.amount_released) * 100, 1) if fl.amount_released > 0 else 0,
            }
            for fl in ledger
        ],
        "projects": proj_details,
        "provenance": "SYNTHETIC",
    }


@router.get("/api/funds/flow")
def get_fund_flow(
    financial_year: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Returns data for the Fund Flow Sankey diagram."""
    query = db.query(FundLedger)
    if financial_year:
        query = query.filter(FundLedger.financial_year == financial_year)

    ledger_rows = query.all()
    members = {m.member_code: m for m in db.query(Member).all()}

    nodes, links = [], []
    node_map = {}

    def get_node(name, node_type):
        if name not in node_map:
            node_map[name] = len(nodes)
            nodes.append({"id": len(nodes), "name": name, "type": node_type})
        return node_map[name]

    central_id = get_node("Central Government", "source")

    for row in ledger_rows:
        m = members.get(row.member_code)
        if not m:
            continue
        if state and m.state != state:
            continue
        mp_id = get_node(m.name, "mp")
        links.append({"source": central_id, "target": mp_id, "value": row.amount_released})

        # Projects for this MP
        projs = db.query(Project).filter(Project.mp_name == m.name).all()
        for p in projs:
            agency_id = get_node(p.agency, "agency")
            links.append({"source": mp_id, "target": agency_id, "value": p.sanction_amount / max(1, len(projs))})
            proj_id = get_node(p.project_id, "project")
            links.append({"source": agency_id, "target": proj_id, "value": p.actual_expenditure})

    # Aggregate duplicate links
    agg = {}
    for lnk in links:
        key = (lnk["source"], lnk["target"])
        agg[key] = agg.get(key, 0) + lnk["value"]
    final_links = [{"source": s, "target": t, "value": round(v, 2)} for (s, t), v in agg.items()]

    return {
        "nodes": nodes,
        "links": final_links,
        "financial_year": financial_year or "all",
        "provenance": "SYNTHETIC",
    }
