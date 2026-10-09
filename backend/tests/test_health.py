"""Tests for the health endpoint."""


def test_health_returns_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app" in data
    assert "version" in data
    assert "timestamp" in data


def test_health_app_name(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "MPLADS" in data["app"]
