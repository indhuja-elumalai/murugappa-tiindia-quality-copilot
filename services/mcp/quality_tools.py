"""MCP-facing quality tool contracts.

Production registration can wrap these functions with the official MCP Python SDK.
Keeping the domain functions isolated makes them independently testable.
"""

from services.ai.app.main import retrieve


def search_quality_knowledge(query: str, limit: int = 3) -> dict:
    """Return approved quality evidence for an investigation."""
    return {"query": query, "results": retrieve(query, min(max(limit, 1), 5))}


def draft_root_cause_checklist(incident_id: str, problem: str) -> dict:
    """Create a review-only checklist with explicit evidence links."""
    evidence = retrieve(problem, 3)
    return {
        "incident_id": incident_id,
        "status": "draft_requires_engineer_review",
        "checks": [
            "Validate measurement-system calibration.",
            "Compare incoming material with specification.",
            "Review process setup, wear, and parameter history.",
        ],
        "source_ids": [item["id"] for item in evidence if item["score"] > 0],
    }
