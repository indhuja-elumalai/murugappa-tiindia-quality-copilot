# Architecture

## Design goals

The system is organized around a single vertical workflow: detect a quality deviation, contain it, investigate it, approve corrective action, and verify effectiveness. Services are split only where deployment or responsibility differs.

## Web application

The Next.js application provides seven connected workspace views: command center, non-conformance register, 8D history, suppliers, knowledge, reports, and settings. Same-origin route handlers attach the active Clerk session token before forwarding incident and investigation requests to the quality API. The UI does not treat an AI response as authoritative: it shows retrieval method, evidence excerpts, relevance scores, audit ID, storage location, and the engineer-review disclaimer.

## Quality API

The Express service is the system of record for incidents and generated investigation drafts. MongoDB records are scoped by Clerk user ID. Each investigation stores the source NCR, evidence status, containment and root-cause checks, citations, retrieval method, generated timestamp, thread ID, and recommended next action. Compound indexes support tenant-safe NCR numbering and recent-history queries.

## AI service

FastAPI owns retrieval, evidence-grounded checklist assembly, investigation threads, and citation validation. The current implementation deliberately uses deterministic feature-hashing and evidence-specific 8D guidance rather than pretending an unconfigured external LLM produced the answer.

Production retrieval flow:

1. validate the request and user scope;
2. apply document-level access controls;
3. index approved SOPs and verified closed incidents;
4. retrieve candidates from Qdrant using stable feature vectors;
5. reject requests with insufficient matching evidence;
6. assemble a structured 8D draft from evidence-specific controls;
7. attach excerpts and relevance scores;
8. persist the draft separately from approved engineering decisions.

## Planned MCP boundary

Future MCP tools will expose narrow business capabilities rather than raw database access:

- `search_quality_knowledge`
- `get_incident_context`
- `draft_root_cause_checklist`

All write operations remain behind the quality API and require explicit user confirmation.

## Deployment direction

The web application can be hosted independently. MongoDB, Qdrant, and the Python service can run locally with Docker Compose or on their respective free development tiers. Secrets stay in environment variables and are never committed.
