def test_root_health_endpoint(client):
    """Requirement 1: Health endpoint check at /health."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "AgentShield" in data["service"]

def test_api_health_endpoint(client):
    """Requirement 1: Health endpoint check at /api/health."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
