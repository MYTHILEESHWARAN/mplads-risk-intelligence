"""
Rule-based compliance engine for MPLADS projects.
"""
from datetime import date, datetime
from typing import List, Dict


COMPLIANCE_RULES = [
    {
        "rule": "Required project fields complete",
        "severity": "HIGH",
        "weight": 20,
    },
    {
        "rule": "Approval information available",
        "severity": "MEDIUM",
        "weight": 15,
    },
    {
        "rule": "Timeline validity",
        "severity": "HIGH",
        "weight": 20,
    },
    {
        "rule": "Regular progress updates",
        "severity": "MEDIUM",
        "weight": 15,
    },
    {
        "rule": "Completion evidence uploaded",
        "severity": "HIGH",
        "weight": 20,
    },
    {
        "rule": "Supporting documentation complete",
        "severity": "MEDIUM",
        "weight": 10,
    },
]


def _today() -> date:
    return date.today()


def _parse_date(d):
    if d is None:
        return None
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        try:
            return datetime.strptime(d, "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def run_compliance_checks(project: dict, evidence_list: list) -> Dict:
    """
    Runs all compliance rules against a project.
    Returns a dict with checks list and compliance_score.
    """
    checks = []
    total_weight = sum(r["weight"] for r in COMPLIANCE_RULES)
    earned_weight = 0

    today = _today()

    # Rule 1: Required fields
    required = ["project_name", "mp_name", "constituency", "district", "state",
                "project_type", "agency", "sanction_amount", "estimated_cost"]
    missing = [f for f in required if not project.get(f)]
    if not missing:
        checks.append({"rule": COMPLIANCE_RULES[0]["rule"], "status": "Passed",
                        "severity": COMPLIANCE_RULES[0]["severity"], "reason": "All mandatory fields present."})
        earned_weight += COMPLIANCE_RULES[0]["weight"]
    else:
        checks.append({"rule": COMPLIANCE_RULES[0]["rule"], "status": "Failed",
                        "severity": COMPLIANCE_RULES[0]["severity"],
                        "reason": f"Missing fields: {', '.join(missing)}"})

    # Rule 2: Approval info (sanction_date present)
    sanction_date = _parse_date(project.get("sanction_date"))
    if sanction_date:
        checks.append({"rule": COMPLIANCE_RULES[1]["rule"], "status": "Passed",
                        "severity": COMPLIANCE_RULES[1]["severity"], "reason": "Sanction date present."})
        earned_weight += COMPLIANCE_RULES[1]["weight"]
    else:
        checks.append({"rule": COMPLIANCE_RULES[1]["rule"], "status": "Failed",
                        "severity": COMPLIANCE_RULES[1]["severity"], "reason": "Sanction date not recorded."})

    # Rule 3: Timeline
    expected = _parse_date(project.get("expected_completion_date"))
    start = _parse_date(project.get("start_date"))
    actual_completion = _parse_date(project.get("actual_completion_date"))
    status = project.get("status", "")

    if status == "Completed" and actual_completion:
        checks.append({"rule": COMPLIANCE_RULES[2]["rule"], "status": "Passed",
                        "severity": COMPLIANCE_RULES[2]["severity"], "reason": "Project completed."})
        earned_weight += COMPLIANCE_RULES[2]["weight"]
    elif expected and today > expected and status not in ("Completed",):
        overdue_days = (today - expected).days
        checks.append({"rule": COMPLIANCE_RULES[2]["rule"], "status": "Failed",
                        "severity": COMPLIANCE_RULES[2]["severity"],
                        "reason": f"Project is {overdue_days} days past expected completion date."})
    elif expected and start:
        checks.append({"rule": COMPLIANCE_RULES[2]["rule"], "status": "Passed",
                        "severity": COMPLIANCE_RULES[2]["severity"], "reason": "Within expected timeline."})
        earned_weight += COMPLIANCE_RULES[2]["weight"]
    else:
        checks.append({"rule": COMPLIANCE_RULES[2]["rule"], "status": "Pending",
                        "severity": COMPLIANCE_RULES[2]["severity"], "reason": "Timeline information incomplete."})
        earned_weight += COMPLIANCE_RULES[2]["weight"] * 0.5

    # Rule 4: Progress updates (check if financial/physical progress > 0 if started)
    fp = project.get("financial_progress", 0)
    pp = project.get("physical_progress", 0)
    if start and (fp > 0 or pp > 0):
        checks.append({"rule": COMPLIANCE_RULES[3]["rule"], "status": "Passed",
                        "severity": COMPLIANCE_RULES[3]["severity"], "reason": "Progress data recorded."})
        earned_weight += COMPLIANCE_RULES[3]["weight"]
    elif start:
        checks.append({"rule": COMPLIANCE_RULES[3]["rule"], "status": "Failed",
                        "severity": COMPLIANCE_RULES[3]["severity"], "reason": "No progress updates recorded after start date."})
    else:
        checks.append({"rule": COMPLIANCE_RULES[3]["rule"], "status": "Pending",
                        "severity": COMPLIANCE_RULES[3]["severity"], "reason": "Project not yet started."})
        earned_weight += COMPLIANCE_RULES[3]["weight"] * 0.5

    # Rule 5: Completion evidence
    ev_types = [e.get("evidence_type", "") for e in evidence_list]
    has_photo = any("Photo" in t for t in ev_types)
    has_cert = any("Certificate" in t for t in ev_types)
    verified = [e for e in evidence_list if e.get("verification_status") == "Verified"]

    if status == "Completed":
        if has_cert and verified:
            checks.append({"rule": COMPLIANCE_RULES[4]["rule"], "status": "Passed",
                            "severity": COMPLIANCE_RULES[4]["severity"], "reason": "Completion certificate and verified evidence present."})
            earned_weight += COMPLIANCE_RULES[4]["weight"]
        else:
            checks.append({"rule": COMPLIANCE_RULES[4]["rule"], "status": "Failed",
                            "severity": COMPLIANCE_RULES[4]["severity"], "reason": "Completion certificate missing or unverified."})
    else:
        if has_photo:
            checks.append({"rule": COMPLIANCE_RULES[4]["rule"], "status": "Pending",
                            "severity": COMPLIANCE_RULES[4]["severity"], "reason": "Project photos present; completion certificate pending."})
            earned_weight += COMPLIANCE_RULES[4]["weight"] * 0.5
        else:
            checks.append({"rule": COMPLIANCE_RULES[4]["rule"], "status": "Pending",
                            "severity": COMPLIANCE_RULES[4]["severity"], "reason": "No project photos uploaded yet."})

    # Rule 6: Supporting docs (work order)
    has_work_order = any("Work Order" in t for t in ev_types)
    missing_ev = [e for e in evidence_list if e.get("verification_status") == "Missing"]

    if has_work_order and not missing_ev:
        checks.append({"rule": COMPLIANCE_RULES[5]["rule"], "status": "Passed",
                        "severity": COMPLIANCE_RULES[5]["severity"], "reason": "Work order and supporting documents available."})
        earned_weight += COMPLIANCE_RULES[5]["weight"]
    elif missing_ev:
        checks.append({"rule": COMPLIANCE_RULES[5]["rule"], "status": "Failed",
                        "severity": COMPLIANCE_RULES[5]["severity"],
                        "reason": f"{len(missing_ev)} evidence item(s) marked as missing."})
    else:
        checks.append({"rule": COMPLIANCE_RULES[5]["rule"], "status": "Pending",
                        "severity": COMPLIANCE_RULES[5]["severity"], "reason": "Work order not yet uploaded."})
        earned_weight += COMPLIANCE_RULES[5]["weight"] * 0.5

    score = round((earned_weight / total_weight) * 100, 1)

    return {
        "checks": checks,
        "compliance_score": score,
        "compliance_risk": round(100 - score, 1),
    }
