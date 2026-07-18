from collections import Counter
from math import sqrt
import re
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


app = FastAPI(
    title="TII Quality Copilot AI Service",
    description="Evidence-first retrieval and 8D investigation drafting.",
    version="0.1.0",
)


DOCUMENTS = [
    {
        "id": "SOP-TUBE-014",
        "title": "ERW weld variation containment",
        "division": "Tube Products",
        "text": "Quarantine the affected coil and finished lot. Verify incoming material chemistry, weld current stability, roll alignment, and seam temperature records before parameter changes.",
    },
    {
        "id": "WI-WELD-008",
        "title": "Weld seam inspection",
        "division": "Tube Products",
        "text": "Measure seam geometry at the defined sampling interval. Record mill speed, current, squeeze pressure, and calibration status for each suspect batch.",
    },
    {
        "id": "NCR-0918",
        "title": "Historical ERW seam deviation",
        "division": "Tube Products",
        "text": "A repeat weld seam deviation was traced to progressive guide-roll misalignment. Correction included alignment verification at setup and a layered process audit.",
    },
    {
        "id": "SOP-CHAIN-021",
        "title": "Roller chain dimensional control",
        "division": "Industrial Chains",
        "text": "For pitch deviation, verify punch wear, strip thickness, press setup, gauge calibration, and heat-treatment distortion before releasing the lot.",
    },
]


def tokens(value: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", value.lower())


def cosine(left: Counter, right: Counter) -> float:
    common = set(left) & set(right)
    numerator = sum(left[word] * right[word] for word in common)
    left_norm = sqrt(sum(value * value for value in left.values()))
    right_norm = sqrt(sum(value * value for value in right.values()))
    return numerator / (left_norm * right_norm) if left_norm and right_norm else 0.0


def retrieve(query: str, limit: int = 3) -> list[dict]:
    query_vector = Counter(tokens(query))
    ranked = []
    for document in DOCUMENTS:
        searchable = f"{document['title']} {document['division']} {document['text']}"
        score = cosine(query_vector, Counter(tokens(searchable)))
        ranked.append({**document, "score": round(score, 4)})
    return sorted(ranked, key=lambda item: item["score"], reverse=True)[:limit]


class InvestigationRequest(BaseModel):
    incident_id: str = Field(min_length=3, max_length=40)
    problem: str = Field(min_length=12, max_length=2000)
    division: str = Field(min_length=2, max_length=100)


class Citation(BaseModel):
    source_id: str
    title: str
    relevance: float


class InvestigationResponse(BaseModel):
    thread_id: str
    incident_id: str
    evidence_status: str
    containment_checks: list[str]
    root_cause_checks: list[str]
    citations: list[Citation]
    disclaimer: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "retriever": "local-evidence-demo"}


@app.post("/api/v1/investigations", response_model=InvestigationResponse)
def investigate(request: InvestigationRequest) -> InvestigationResponse:
    matches = retrieve(f"{request.division} {request.problem}")
    relevant = [match for match in matches if match["score"] > 0]
    if not relevant:
        raise HTTPException(status_code=422, detail="Insufficient approved evidence for a grounded draft.")

    return InvestigationResponse(
        thread_id=str(uuid4()),
        incident_id=request.incident_id,
        evidence_status="grounded-draft",
        containment_checks=[
            "Quarantine and identify the affected lot.",
            "Confirm gauge calibration and inspection sampling records.",
            "Preserve process parameters before making adjustments.",
        ],
        root_cause_checks=[
            "Compare material and process records with the approved specification.",
            "Check equipment setup, alignment, wear, and calibration.",
            "Reproduce the deviation under controlled engineering review.",
        ],
        citations=[Citation(source_id=item["id"], title=item["title"], relevance=item["score"]) for item in relevant],
        disclaimer="Draft for qualified engineer review; not an approved root-cause decision.",
    )
