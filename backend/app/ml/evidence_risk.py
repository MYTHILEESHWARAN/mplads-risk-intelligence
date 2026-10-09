"""
Evidence risk calculator.
"""
from typing import List

REQUIRED_EVIDENCE_TYPES = [
    "Project Photo",
    "Completion Certificate",
    "Payment Record",
    "Work Order",
    "Supporting Document",
]


def compute_evidence_risk(evidence_list: List[dict]) -> float:
    """
    Calculates evidence risk score 0-100.

    Logic:
    - Base penalty: missing required evidence types
    - Additional penalty: Mismatch items
    """
    if not evidence_list:
        # No evidence at all — maximum risk
        return 90.0

    ev_types = {e.get("evidence_type", ""): e for e in evidence_list}
    statuses = {e.get("evidence_type", ""): e.get("verification_status", "") for e in evidence_list}

    total = len(REQUIRED_EVIDENCE_TYPES)
    missing_count = 0
    mismatch_count = 0
    pending_count = 0

    for req in REQUIRED_EVIDENCE_TYPES:
        if req not in ev_types:
            missing_count += 1
        elif statuses.get(req) == "Missing":
            missing_count += 1
        elif statuses.get(req) == "Mismatch":
            mismatch_count += 1
        elif statuses.get(req) == "Pending":
            pending_count += 1

    # Scoring
    missing_penalty = (missing_count / total) * 60
    mismatch_penalty = (mismatch_count / total) * 30
    pending_penalty = (pending_count / total) * 10

    risk = missing_penalty + mismatch_penalty + pending_penalty
    return min(100.0, max(0.0, round(risk, 1)))


def compute_evidence_completeness(evidence_list: List[dict]) -> float:
    """Returns completeness percentage 0-100."""
    if not evidence_list:
        return 0.0
    total = len(REQUIRED_EVIDENCE_TYPES)
    ev_types = {e.get("evidence_type", ""): e for e in evidence_list}
    complete = sum(
        1 for req in REQUIRED_EVIDENCE_TYPES
        if req in ev_types and ev_types[req].get("verification_status") == "Verified"
    )
    return round((complete / total) * 100, 1)
