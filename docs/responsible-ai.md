# Responsible AI and security

## Human accountability

The copilot accelerates evidence gathering; it does not approve containment, root cause, or process changes. A qualified engineer remains responsible for every saved 8D decision.

## Grounding and citations

The service returns source identifiers alongside every recommendation. When available evidence is weak, it responds with a request for more inspection data instead of inventing a cause.

## Data handling

- use synthetic records for demonstrations;
- classify and scope production documents before ingestion;
- prevent cross-division and cross-supplier retrieval leakage;
- redact personal and commercially sensitive fields before model calls;
- retain audit events for document ingestion, retrieval, generation, review, and approval;
- never paste confidential company code or data into public AI tools.

## Evaluation

Track retrieval relevance, citation validity, unsupported-claim rate, time to first containment action, engineer acceptance rate, and repeat-defect rate. Model quality must be evaluated against a reviewed set of historical cases before any production rollout.
