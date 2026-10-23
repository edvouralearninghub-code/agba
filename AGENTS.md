# AGENTS.md — Coding Agent Governance & Operating Rules

> Binding instructions for Antigravity, Claude, and any other coding agent operating in this repository.  
> Owner: Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria.

## 1. Mandatory Pre-Flight Sequence

Before modifying or adding any code in this repository, every agent MUST:
1. Read `README.md`, `AGENTS.md`, `CLAUDE.md`, `SECURITY.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`, and `docs/RUNBOOK.md`.
2. Treat `SECURITY.md` as a hard, binding constraint. No feature convenience may bypass tenant isolation, key encryption, SSRF filtering, or input validation.
3. Read the `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, and `README.md` of any reference repository or new package before introducing it.

## 2. Phase Gate Discipline

- Work strictly phase by phase (`Phase 0` → `Phase 1` → `Phase 2` → `Phase 3` → `Phase 4` → `Phase 5`).
- At the end of each phase, **STOP** and produce the mandatory **Section 9 End-of-Phase Report**:
  1. What was built (bullet list)
  2. What was tested and the results (including cross-tenant isolation tests)
  3. License check result and any new entries in `THIRD_PARTY_NOTICES.md`
  4. Security checklist status against `SECURITY.md`
  5. Deviations from the Master Build Prompt, with reasons
  6. Open questions for the owner
  7. Proposed scope for the next phase
- Do not silently change any item marked **`[DECISION]`** without owner approval.

## 3. Data Integrity & Anti-Fabrication Policy

- **Zero Fake Proof:** Never invent statistics, testimonials, customer logos, benchmarks, or pricing figures.
- Use explicit placeholders until verified data is supplied by the owner:
  - Pricing: `[PRICE_TBD]`
  - Social proof / metrics: `[PROOF: real metric needed]`
- **Yoruba Copy Review:** Any Yoruba text or proverbs must be flagged for owner review and approval before shipping to production.

## 4. Intellectual Property & Reference Repo Boundaries

- **Dify (`langgenius/dify`):** Feature-set inspiration only. Never copy code, layout details, CSS, assets, or interactive appearance patterns.
- **free-for-dev (`ripienaar/free-for-dev`):** Category inspiration only. Every entry in AGBA Free Stack must be independently researched, written in original prose, linked to the official vendor pricing page, and dated with a `verifiedOn` timestamp.
- **Flowise (`FlowiseAI/Flowise`):** Apache-2.0 core only. Never include or enable `packages/server/src/enterprise`.
- **Strapi (`strapi/strapi`):** MIT Community Edition only. Never include or enable any `ee/` directory.
