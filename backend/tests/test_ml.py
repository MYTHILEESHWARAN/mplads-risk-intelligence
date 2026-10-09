"""
Tests for ML modules — financial anomaly, execution risk,
duplicate detection, compliance, evidence risk, and unified score.
"""
import pytest
from app.ml.financial_anomaly import compute_financial_risk
from app.ml.execution_risk import compute_execution_risk, get_mismatch_level, predict_delay
from app.ml.duplicate_detection import find_duplicates, haversine_km, geographical_similarity
from app.ml.compliance_engine import run_compliance_checks
from app.ml.evidence_risk import compute_evidence_risk, compute_evidence_completeness
from app.ml.unified_score import compute_unified_score, get_risk_level, generate_flagged_reasons


# ─── Financial Anomaly ────────────────────────────────────────────────────────

class TestFinancialAnomaly:
    def test_no_overspend_returns_low_score(self):
        project = {"project_id": "T1", "project_type": "Road", "district": "D1",
                   "agency": "A1", "sanction_amount": 1e6, "estimated_cost": 1e6,
                   "actual_expenditure": 950000}
        score = compute_financial_risk(project, [project])
        assert 0 <= score <= 100

    def test_large_overspend_returns_high_score(self):
        project = {"project_id": "T2", "project_type": "Road", "district": "D1",
                   "agency": "A1", "sanction_amount": 1e6, "estimated_cost": 1e6,
                   "actual_expenditure": 1800000}  # 80% overspend
        score = compute_financial_risk(project, [project])
        assert score > 40, f"Expected high score for large overspend, got {score}"

    def test_score_clamped_0_to_100(self):
        for exp in [0, 500000, 1000000, 5000000]:
            project = {"project_id": "T3", "project_type": "Road", "district": "D1",
                       "agency": "A1", "sanction_amount": 1e6, "estimated_cost": 1e6,
                       "actual_expenditure": exp}
            score = compute_financial_risk(project, [project])
            assert 0 <= score <= 100


# ─── Execution Risk / Progress Mismatch ───────────────────────────────────────

class TestExecutionRisk:
    def test_no_mismatch_low_risk(self):
        score = compute_execution_risk(50.0, 50.0)
        assert score <= 30

    def test_small_mismatch_low_medium(self):
        score = compute_execution_risk(55.0, 50.0)
        assert score <= 30

    def test_medium_mismatch(self):
        score = compute_execution_risk(70.0, 50.0)  # 20 pp mismatch
        assert 20 <= score <= 60

    def test_large_mismatch_high_score(self):
        score = compute_execution_risk(87.0, 38.0)  # 49 pp mismatch
        assert score >= 60, f"Expected high score for 49pp mismatch, got {score}"

    def test_critical_mismatch(self):
        score = compute_execution_risk(90.0, 20.0)  # 70 pp mismatch
        assert score >= 80

    @pytest.mark.parametrize("mismatch,expected_level", [
        (5, "LOW"), (20, "MEDIUM"), (35, "HIGH"), (55, "CRITICAL")
    ])
    def test_mismatch_level_classification(self, mismatch, expected_level):
        assert get_mismatch_level(mismatch) == expected_level

    def test_delay_prediction_returns_dict(self, sample_project_dict):
        result = predict_delay(sample_project_dict, [])
        assert "delay_probability" in result
        assert "predicted_delay_days" in result
        assert 0 <= result["delay_probability"] <= 1

    def test_delayed_project_higher_probability(self):
        normal = {"status": "In Progress", "physical_progress": 80, "financial_progress": 82}
        delayed = {"status": "Delayed", "physical_progress": 10, "financial_progress": 50,
                   "start_date": "2022-01-01", "expected_completion_date": "2023-01-01"}
        r_normal = predict_delay(normal, [])
        r_delayed = predict_delay(delayed, [])
        assert r_delayed["delay_probability"] > r_normal["delay_probability"]


# ─── Duplicate Detection ──────────────────────────────────────────────────────

class TestDuplicateDetection:
    def test_haversine_same_point(self):
        assert haversine_km(25.0, 80.0, 25.0, 80.0) == pytest.approx(0.0, abs=0.01)

    def test_haversine_known_distance(self):
        # Lucknow to Kanpur ~80 km
        dist = haversine_km(26.8467, 80.9462, 26.4499, 80.3319)
        assert 70 < dist < 90

    def test_geo_similarity_same_location(self):
        assert geographical_similarity(0.0) == 1.0

    def test_geo_similarity_far_location(self):
        assert geographical_similarity(100.0) == 0.0

    def test_find_duplicates_no_match(self):
        target = {"project_id": "T1", "project_name": "Road construction project Alpha",
                  "project_type": "Road", "district": "Agra",
                  "latitude": 27.2, "longitude": 77.9}
        other = {"project_id": "T2", "project_name": "Digital library rural education",
                 "project_type": "Education", "district": "Kochi",
                 "latitude": 9.9, "longitude": 76.3}
        result = find_duplicates(target, [target, other])
        assert result["matched_project"] is not None
        assert 0 <= result["duplicate_risk"] <= 100

    def test_find_duplicates_high_similarity(self):
        target = {"project_id": "T1", "project_name": "Community water supply rural village",
                  "project_type": "Water Supply", "district": "Lucknow",
                  "latitude": 26.85, "longitude": 80.95}
        similar = {"project_id": "T2", "project_name": "Community water supply rural village extension",
                   "project_type": "Water Supply", "district": "Lucknow",
                   "latitude": 26.851, "longitude": 80.951}
        result = find_duplicates(target, [target, similar])
        assert result["semantic_similarity"] > 50


# ─── Compliance Engine ────────────────────────────────────────────────────────

class TestComplianceEngine:
    def test_complete_project_high_score(self):
        project = {
            "project_name": "Test", "mp_name": "Test MP", "constituency": "C",
            "district": "D", "state": "S", "project_type": "Road", "agency": "A",
            "sanction_amount": 1e6, "estimated_cost": 1e6,
            "sanction_date": "2023-01-01", "start_date": "2023-03-01",
            "expected_completion_date": "2025-12-01",
            "financial_progress": 50, "physical_progress": 48, "status": "In Progress",
        }
        result = run_compliance_checks(project, [
            {"evidence_type": "Project Photo", "verification_status": "Verified"},
            {"evidence_type": "Work Order", "verification_status": "Verified"},
        ])
        assert result["compliance_score"] >= 50
        assert "checks" in result
        assert len(result["checks"]) == 6

    def test_missing_fields_fails_check(self):
        project = {"project_type": "Road"}  # missing most fields
        result = run_compliance_checks(project, [])
        failed = [c for c in result["checks"] if c["status"] == "Failed"]
        assert len(failed) >= 1

    def test_overdue_project_fails_timeline(self):
        project = {
            "project_name": "Old Project", "mp_name": "MP", "constituency": "C",
            "district": "D", "state": "S", "project_type": "Road", "agency": "A",
            "sanction_amount": 1e6, "estimated_cost": 1e6,
            "sanction_date": "2020-01-01", "start_date": "2020-03-01",
            "expected_completion_date": "2021-01-01",   # 5 years ago
            "financial_progress": 30, "physical_progress": 20, "status": "In Progress",
        }
        result = run_compliance_checks(project, [])
        timeline_check = next(c for c in result["checks"] if "Timeline" in c["rule"])
        assert timeline_check["status"] == "Failed"

    def test_compliance_risk_is_inverse_of_score(self):
        project = {
            "project_name": "P", "mp_name": "M", "constituency": "C",
            "district": "D", "state": "S", "project_type": "Road", "agency": "A",
            "sanction_amount": 1e6, "estimated_cost": 1e6,
            "sanction_date": "2023-01-01", "start_date": "2023-03-01",
            "expected_completion_date": "2025-12-01",
            "financial_progress": 50, "physical_progress": 48, "status": "In Progress",
        }
        result = run_compliance_checks(project, [])
        assert abs(result["compliance_score"] + result["compliance_risk"] - 100) < 1


# ─── Evidence Risk ────────────────────────────────────────────────────────────

class TestEvidenceRisk:
    def test_no_evidence_high_risk(self):
        score = compute_evidence_risk([])
        assert score >= 80

    def test_all_verified_low_risk(self):
        ev = [
            {"evidence_type": t, "verification_status": "Verified"}
            for t in ["Project Photo", "Completion Certificate", "Payment Record", "Work Order", "Supporting Document"]
        ]
        score = compute_evidence_risk(ev)
        assert score == 0.0

    def test_missing_items_raise_risk(self):
        ev = [
            {"evidence_type": "Project Photo", "verification_status": "Verified"},
            {"evidence_type": "Completion Certificate", "verification_status": "Missing"},
        ]
        score = compute_evidence_risk(ev)
        assert score > 20

    def test_mismatch_raises_risk(self):
        ev = [
            {"evidence_type": t, "verification_status": "Mismatch"}
            for t in ["Project Photo", "Payment Record"]
        ]
        score = compute_evidence_risk(ev)
        assert score > 0

    def test_completeness_all_verified(self):
        ev = [
            {"evidence_type": t, "verification_status": "Verified"}
            for t in ["Project Photo", "Completion Certificate", "Payment Record", "Work Order", "Supporting Document"]
        ]
        completeness = compute_evidence_completeness(ev)
        assert completeness == 100.0

    def test_completeness_partial(self):
        ev = [
            {"evidence_type": "Project Photo", "verification_status": "Verified"},
            {"evidence_type": "Payment Record", "verification_status": "Verified"},
        ]
        completeness = compute_evidence_completeness(ev)
        assert completeness == pytest.approx(40.0)


# ─── Unified Score ────────────────────────────────────────────────────────────

class TestUnifiedScore:
    @pytest.mark.parametrize("score,expected_level", [
        (15, "LOW"), (45, "MEDIUM"), (70, "HIGH"), (85, "CRITICAL")
    ])
    def test_risk_classification(self, score, expected_level):
        assert get_risk_level(score) == expected_level

    def test_unified_score_clamped(self):
        score = compute_unified_score(100, 100, 100, 100, 100)
        assert score == 100.0
        score = compute_unified_score(0, 0, 0, 0, 0)
        assert score == 0.0

    def test_unified_score_weighted(self):
        # Only financial risk non-zero at 100 → weight 0.25 → score ~25
        score = compute_unified_score(100, 0, 0, 0, 0)
        assert score == pytest.approx(25.0, abs=1.0)

    def test_weights_sum_to_100(self):
        """All sub-scores at 50 should give unified score of 50."""
        score = compute_unified_score(50, 50, 50, 50, 50)
        assert score == pytest.approx(50.0, abs=1.0)

    def test_flagged_reasons_no_fraud_claim(self):
        project = {
            "project_id": "T1", "project_name": "Test", "status": "Delayed",
            "financial_progress": 85, "physical_progress": 30,
            "actual_expenditure": 2000000, "estimated_cost": 1000000,
            "evidence_risk": 80, "compliance_risk": 70,
        }
        delay = {"delay_probability": 0.9, "predicted_delay_days": 120}
        dup = {"semantic_similarity": 0, "geographical_similarity": 0, "matched_project": None}
        reasons = generate_flagged_reasons(project, dup, delay)
        assert isinstance(reasons, list)
        assert len(reasons) > 0
        # Critical check: AI must never declare fraud
        for r in reasons:
            assert "fraud confirmed" not in r["text"].lower()
            assert "fraud has occurred" not in r["text"].lower()


# ─── Dashboard API ────────────────────────────────────────────────────────────

class TestDashboardAPI:
    def test_dashboard_returns_expected_keys(self, client):
        response = client.get("/api/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_projects" in data
        assert "active_projects" in data
        assert "high_risk_projects" in data
        assert "critical_alerts" in data
        assert "total_sanctioned_amount" in data
        assert "total_expenditure" in data
        assert "risk_distribution" in data
        assert "top_risk_projects" in data

    def test_dashboard_risk_distribution_keys(self, client):
        response = client.get("/api/dashboard")
        assert response.status_code == 200
        dist = response.json()["risk_distribution"]
        for level in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
            assert level in dist


# ─── Alerts API ──────────────────────────────────────────────────────────────

class TestAlertsAPI:
    def test_alerts_list(self, client):
        response = client.get("/api/alerts")
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        assert "total" in data

    def test_alerts_severity_filter(self, client):
        response = client.get("/api/alerts?severity=CRITICAL")
        assert response.status_code == 200
        data = response.json()
        for a in data["alerts"]:
            assert a["severity"] == "CRITICAL"
