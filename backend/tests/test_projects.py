"""Tests for project creation, retrieval, and risk analysis."""
import pytest
from datetime import date
from app.models.project import Project, RiskAnalysis
from app.models.evidence import Evidence


def _create_test_project(db, project_id="MPL-T001", financial_progress=80.0, physical_progress=40.0,
                          actual_expenditure=3250000, estimated_cost=2500000, status="In Progress"):
    p = Project(
        project_id=project_id,
        project_name="Test Water Supply Project",
        mp_name="Test MP",
        constituency="Test Constituency",
        district="Test District",
        state="Test State",
        project_type="Water Supply",
        agency="Test Agency",
        sanction_amount=2500000,
        estimated_cost=estimated_cost,
        actual_expenditure=actual_expenditure,
        financial_progress=financial_progress,
        physical_progress=physical_progress,
        sanction_date=date(2023, 1, 1),
        start_date=date(2023, 3, 1),
        expected_completion_date=date(2024, 3, 1),
        latitude=25.3176,
        longitude=82.9739,
        status=status,
    )
    db.add(p)
    db.commit()
    return p


class TestProjectRetrieval:
    def test_list_projects_empty(self, client):
        response = client.get("/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert "total" in data
        assert "page" in data
        assert "total_pages" in data

    def test_list_projects_pagination_defaults(self, client):
        response = client.get("/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["limit"] == 10

    def test_get_project_not_found(self, client):
        response = client.get("/api/projects/NONEXISTENT-999")
        assert response.status_code == 404

    def test_get_project_found(self, client, db):
        _create_test_project(db, "MPL-FETCH-01")
        response = client.get("/api/projects/MPL-FETCH-01")
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == "MPL-FETCH-01"
        assert data["project_type"] == "Water Supply"

    def test_list_projects_search_filter(self, client, db):
        _create_test_project(db, "MPL-SEARCH-01")
        response = client.get("/api/projects?search=Water")
        assert response.status_code == 200

    def test_list_projects_status_filter(self, client, db):
        _create_test_project(db, "MPL-STATUS-01", status="Delayed")
        response = client.get("/api/projects?status=Delayed")
        assert response.status_code == 200

    def test_analyze_project(self, client, db):
        _create_test_project(db, "MPL-ANALYZE-01")
        response = client.post("/api/projects/MPL-ANALYZE-01/analyze")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "risk_level" in data
        assert data["risk_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
        assert 0 <= data["unified_risk_score"] <= 100

    def test_risk_endpoint_after_analysis(self, client, db):
        _create_test_project(db, "MPL-RISK-01")
        client.post("/api/projects/MPL-RISK-01/analyze")
        response = client.get("/api/projects/MPL-RISK-01/risk")
        assert response.status_code == 200
        data = response.json()
        assert "financial_risk" in data
        assert "execution_risk" in data
        assert "unified_risk_score" in data
        assert "flagged_reasons" in data

    def test_duplicates_endpoint(self, client, db):
        _create_test_project(db, "MPL-DUP-01")
        client.post("/api/projects/MPL-DUP-01/analyze")
        response = client.get("/api/projects/MPL-DUP-01/duplicates")
        assert response.status_code == 200
        data = response.json()
        assert "semantic_similarity" in data
        assert "duplicate_risk" in data

    def test_evidence_endpoint(self, client, db):
        _create_test_project(db, "MPL-EV-01")
        ev = Evidence(
            project_id="MPL-EV-01",
            project_name="Test Water Supply Project",
            evidence_type="Project Photo",
            verification_status="Verified",
            risk_status="LOW",
        )
        db.add(ev)
        db.commit()
        response = client.get("/api/projects/MPL-EV-01/evidence")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["evidence"][0]["evidence_type"] == "Project Photo"
