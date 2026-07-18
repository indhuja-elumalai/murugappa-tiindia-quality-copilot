# Architecture

## Design goals

The system is organized around a single vertical workflow: detect a quality deviation, contain it, investigate it, approve corrective action, and verify effectiveness. Services are split only where deployment or responsibility differs.

## Web application

The React application owns presentation and temporary form state. It does not treat an AI response as authoritative. Domain language—NCR, containment, 8D, PPM, and corrective action—is represented directly in components instead of hidden behind generic dashboard abstractions.

## Quality API

The Express service is the system of record for incidents, suppliers, investigation steps, comments, and audit events. MongoDB is appropriate for evolving investigation records while indexes on NCR number, supplier, status, and component support operational filtering.

## AI service

FastAPI owns retrieval, prompt assembly, investigation sessions, and citation validation. The local implementation deliberately returns an evidence-first draft rather than imitating a production model response.

Production retrieval flow:

1. validate the request and user scope;
2. apply document-level access controls;
3. chunk approved SOPs and prior closed incidents;
4. retrieve candidates from Qdrant;
5. rerank by division, component, process, and recency;
6. generate a structured 8D draft;
7. reject unsupported claims and attach citations;
8. persist the draft separately from approved engineering records.

## MCP boundary

MCP tools expose narrow business capabilities rather than raw database access:

- `search_quality_knowledge`
- `get_incident_context`
- `draft_root_cause_checklist`

All write operations remain behind the quality API and require explicit user confirmation.

## Deployment direction

The web application can be hosted independently. MongoDB, Qdrant, and the Python service can run locally with Docker Compose or on their respective free development tiers. Secrets stay in environment variables and are never committed.
