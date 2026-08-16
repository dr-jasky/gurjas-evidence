# Gurjas Research Desk

The Research Desk is the product layer of Gurjas: a question-first interface for research discovery, methods, evidence, AI-in-research workflows, publication alignment, data work and institutional evidence.

## Product rule

Do not make the user choose a consulting service before understanding the problem. Start with the research question, classify the intent, expose a useful first route, and only then offer tools or human support.

## Workflow model

`Question → Discovery → Evidence → Method → Analysis → Verification → Output`

## Current implementation

- Question-first landing interface
- Suggested research prompts
- Structured workflow registry in `research-map.json`
- Human-service layer for publication, methods, NGO/CSR/impact, institutional evidence and integrity work
- Explicit integrity boundaries

## Next implementation milestones

1. Replace the local intent router with a real search/retrieval service.
2. Add source cards with provenance, verification date and limitations.
3. Add Journal Intelligence as a standalone workflow.
4. Add Method Finder with structured inputs and explainable recommendations.
5. Add upload-based Paper Alignment and Data Clinic workflows.
6. Add persistent Research Workspace and shareable Evidence Records.
7. Add analytics instrumentation for search intent, tool activation, completion and return visits.

## Non-goals

- No fake AI claims.
- No fabricated citations or indexing status.
- No decorative chatbot that cannot perform a research task.
- No thin programmatic SEO pages without useful underlying data.
