# AGBA — Learn, Build & Ship AI

**Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
**Status:** Phase 0 Foundation + Interactive Studio Preview (v1)

AGBA (from the Yoruba word *àgbà* — elder, a person of wisdom and respect, linked to *agbára* — strength, power) is a multi-tenant SaaS platform where builders, students, founders, and SMEs across Nigeria, Africa, and worldwide can **learn AI, build AI apps visually, and find verified always-free developer tools to ship them**.

---

## Three Pillars

1. **Learn (AGBA Academy):** Guided tutorials and working example agents (Starter, Advanced Multi-Agent, and RAG pipelines) that import directly into your workspace with one click.
2. **Build (AGBA Studio):** A three-pane visual AI workflow builder with bring-your-own-key (BYOK) model adapters, server-side AES-256-GCM key encryption, tenant-isolated RAG vector retrieval, and allowlisted agent tools.
3. **Ship (AGBA Free Stack):** An independently researched, verified directory of always-free developer and DevOps tiers with recorded verification dates and one-click Studio deployment endpoints.

---

## Quick Start (One-Command Run)

1. Copy `.env.example` to `.env` and set your environment variables:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies and start the full-stack server on port 3000:
   ```bash
   npm install && npm run dev
   ```
3. Run the automated verification suite (cross-tenant isolation tests, AES-256-GCM encryption tests, SSRF blocker tests, Paystack HMAC-SHA512 webhook verification, WCAG AA contrast check, and license hygiene check):
   ```bash
   npm run verify:phase0
   ```

---

## Governance & Reference Documents

- [`SECURITY.md`](./SECURITY.md) — Binding threat model, OWASP ASVS Level 2 controls, BYOK encryption, SSRF protection, and multi-tenant isolation rules.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System diagrams, workspace multi-tenancy data model, RAG pipeline, and Appwrite + Neon pgvector verification.
- [`DECISIONS.md`](./DECISIONS.md) — Architectural Decision Records (ADRs) and licensing decisions with dates and rationale.
- [`AGENTS.md`](./AGENTS.md) & [`CLAUDE.md`](./CLAUDE.md) — Rules of engagement and phase gate discipline for coding agents.
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) — Full dependency license register and third-party attribution.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Conventional commits, PR guidelines, accessibility, and test standards.
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — Deployment, key rotation, backup, and restore procedures.
