# TII Supplier Quality & 8D Copilot

An AI-assisted supplier quality workspace designed around the public operational-excellence priorities of Tube Investments of India (TII): continuous improvement, failure prevention, waste reduction, supplier quality, and SOP-led manufacturing.

> **Portfolio prototype:** This is an independent demonstration built with public information and synthetic data. It is not an official TII product and contains no confidential company or supplier information.

## The problem

Quality engineers often investigate a non-conformance by moving between inspection records, supplier responses, procedures, and older corrective-action reports. That fragmentation makes repeat defects harder to identify and slows down 8D closure.

The prototype brings the workflow into one place:

- create and prioritize a non-conformance report (NCR);
- retrieve related procedures and similar historical cases;
- draft a traceable 8D investigation with source references;
- preserve engineer approval for every AI-generated recommendation;
- track containment, root cause, corrective action, and effectiveness review;
- monitor supplier PPM, repeat defects, and on-time closure.

## Product walkthrough

1. Open the **Quality command center** to review active NCRs and operational KPIs.
2. Filter incidents by severity or search by NCR, supplier, and component.
3. Select a case to open the contextual **8D Investigation Copilot**.
4. Review similar-case evidence and the linked SOP references.
5. Create a new NCR through the structured quality intake form.

The seed data covers precision tubes, industrial chains, metal-formed automotive components, fine blanking, and bicycles. All records are fictional.

## Architecture

```text
React / Next.js quality workspace
              |
       REST API contract
       /              \
Express + MongoDB     FastAPI AI service
NCR workflow          retrieval + 8D drafting
audit history         sessions + citations
       \              /
        MCP quality tools
```

The deployed demo focuses on the complete interactive product experience. The service folders define the next production slice without coupling the UI to a paid model provider.

## Repository layout

```text
app/                  Interactive web application
services/api/         Express/MongoDB quality API
services/ai/          FastAPI retrieval and investigation service
services/mcp/         MCP tools for quality workflows
docs/                 Architecture and responsible-AI decisions
tests/                Rendered output checks
```

## Run the web app

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Authentication requires a Clerk application. Copy `.env.example` to `.env.local` and replace the two Clerk placeholders. Without keys, the interface runs in an explicitly labelled portfolio demo mode.

Build and test:

```bash
npm run build
npm test
```

## Run the AI service

The service uses a deterministic local retriever by default, so the demo requires no API key or paid account.

```bash
cd services/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API documentation is then available at `http://localhost:8000/docs`.

## Free and open-source stack

- React, Next.js, TypeScript and Tailwind CSS
- FastAPI and Pydantic
- Express and MongoDB Community Edition
- Qdrant Community Edition for the production vector-store path
- Docker Compose for local infrastructure
- Node test runner and Pytest

No paid model, extension, database, or hosting plan is required for local development.

## Responsible AI decisions

- AI output is presented as a draft, never as an approved quality decision.
- Every recommendation must retain its supporting procedure or incident citation.
- Safety and process changes require a qualified engineer's review.
- Synthetic demo data is visibly separated from production data.
- Retrieval returns an explicit low-evidence response when the source set is insufficient.
- The design avoids sending company documents to external model providers by default.

See [docs/architecture.md](docs/architecture.md) and [docs/responsible-ai.md](docs/responsible-ai.md) for design details and planned production controls.

See [docs/deployment.md](docs/deployment.md) for the Vercel, Clerk, Render, MongoDB Atlas, and Qdrant deployment topology and the exact environment values required.

Before merging or deploying, complete [docs/acceptance-test-checklist.md](docs/acceptance-test-checklist.md), which covers every navigation item, button, modal, persisted workflow, export, authentication boundary, and responsive control.

## Roadmap

- persist NCRs and audit events through the Express/MongoDB service;
- connect the UI to FastAPI investigation threads;
- add Qdrant-backed hybrid retrieval and evaluation fixtures;
- export reviewed 8D reports as PDF;
- add role-based access for engineers, suppliers, and quality managers;
- track retrieval precision, citation coverage, and suggestion acceptance.

## License

This project is available under the repository's MIT License.
