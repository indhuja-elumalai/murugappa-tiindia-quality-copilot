from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_investigation_is_grounded() -> None:
    response = client.post(
        "/api/v1/investigations",
        json={
            "incident_id": "NCR-1042",
            "division": "Tube Products",
            "problem": "ERW tube weld seam variation above tolerance",
        },
    )
    payload = response.json()
    assert response.status_code == 200
    assert payload["evidence_status"] == "grounded-draft"
    assert payload["citations"]
    assert "engineer review" in payload["disclaimer"]
