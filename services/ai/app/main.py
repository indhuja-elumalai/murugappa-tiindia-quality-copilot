from collections import Counter
import hashlib
from math import sqrt
import os
import re
import secrets
from uuid import NAMESPACE_URL, uuid4, uuid5

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="TII Quality Copilot AI Service",
    description="Evidence-first retrieval and 8D investigation drafting.",
    version="0.1.0",
)

allowed_origins = [origin.strip() for origin in os.getenv("AI_CORS_ORIGIN", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Internal-API-Key"],
)


def verify_internal_api_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    expected = os.getenv("AI_INTERNAL_API_KEY", "development-only")
    if not x_internal_api_key or not secrets.compare_digest(x_internal_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid service credential.")


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

QDRANT_URL = os.getenv("QDRANT_URL", "").rstrip("/")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "quality_approved_evidence")
VECTOR_SIZE = 256


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


def embedding(value: str) -> list[float]:
    """Create a stable, dependency-free feature-hashing vector for private evidence."""
    vector = [0.0] * VECTOR_SIZE
    for token in tokens(value):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % VECTOR_SIZE
        vector[index] += 1.0 if digest[4] % 2 == 0 else -1.0
    norm = sqrt(sum(item * item for item in vector))
    return [item / norm for item in vector] if norm else vector


def qdrant_headers() -> dict[str, str]:
    return {"api-key": QDRANT_API_KEY} if QDRANT_API_KEY else {}


async def retrieve_from_qdrant(query: str, limit: int = 3) -> list[dict]:
    if not QDRANT_URL:
        return retrieve(query, limit)

    try:
        async with httpx.AsyncClient(timeout=10.0, headers=qdrant_headers()) as client:
            collection = await client.get(f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}")
            if collection.status_code == 404:
                created = await client.put(
                    f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}",
                    json={"vectors": {"size": VECTOR_SIZE, "distance": "Cosine"}},
                )
                created.raise_for_status()
                points = []
                for document in DOCUMENTS:
                    searchable = f"{document['title']} {document['division']} {document['text']}"
                    points.append({
                        "id": str(uuid5(NAMESPACE_URL, document["id"])),
                        "vector": embedding(searchable),
                        "payload": document,
                    })
                indexed = await client.put(
                    f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}/points?wait=true",
                    json={"points": points},
                )
                indexed.raise_for_status()
            else:
                collection.raise_for_status()

            result = await client.post(
                f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}/points/query",
                json={"query": embedding(query), "limit": limit, "with_payload": True},
            )
            result.raise_for_status()
            matches = result.json().get("result", {}).get("points", [])
            return [
                {**item["payload"], "score": round(float(item["score"]), 4)}
                for item in matches
                if item.get("payload")
            ]
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=503, detail="Vector evidence service unavailable.") from error


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
    return {"status": "healthy", "retriever": "qdrant" if QDRANT_URL else "local-evidence-demo"}


@app.post("/api/v1/investigations", response_model=InvestigationResponse, dependencies=[Depends(verify_internal_api_key)])
async def investigate(request: InvestigationRequest) -> InvestigationResponse:
    matches = await retrieve_from_qdrant(f"{request.division} {request.problem}")
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
