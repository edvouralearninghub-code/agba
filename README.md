# AGBA — Learn, Build & Ship AI

**Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
**Status:** Phase 0 + Phase 0.5 Dual-Backend Foundation (Appwrite `2.6.0` `TablesDB` + Firebase Firestore + `pgvector`)

AGBA (from the Yoruba word *àgbà* — elder, a person of wisdom and respect, linked to *agbára* — strength, power) is a multi-tenant SaaS platform where builders, students, founders, and SMEs across Nigeria, Africa, and worldwide can **learn AI, build AI apps visually, and find verified always-free developer tools to ship them**.

---

## Three Pillars

1. **Learn (AGBA Academy):** Guided tutorials and 12 working example agents (Starter, Advanced Multi-Agent, and RAG pipelines) that import directly into your workspace with one click.
2. **Build (AGBA Studio):** A three-pane visual AI workflow builder with bring-your-own-key (BYOK) model adapters (`Gemini`, `OpenAI`, `Anthropic claude-sonnet-4-5`, `Mistral`, `Ollama`), server-side AES-256-GCM key encryption, tenant-isolated multi-dimension `pgvector` retrieval (`768`, `1024`, `1536`), and allowlisted agent tools.
3. **Ship (AGBA Free Stack):** An independently researched, verified directory of 160 always-free developer and DevOps tiers with recorded verification dates, live CMS editor, and one-click Studio deployment endpoints.

---

## Quick Start (Local & Self-Hosted Docker)

1. Copy `.env.example` to `.env` and set your environment variables:
   ```bash
   cp .env.example .env
   ```
2. (Optional) Start the local self-hosted Appwrite `2.6.0` + `pgvector` stack and bootstrap the 9 `TablesDB` tables:
   ```bash
   docker compose -f infra/appwrite/docker-compose.yml up -d
   npm run bootstrap:appwrite
   ```
3. Install dependencies and start the full-stack server on port 3000:
   ```bash
   npm install && npm run dev
   ```
4. Run the automated verification suite (Appwrite `2.6.0` `TablesDB` parity, Firestore Dirty Dozen rules, cross-tenant isolation, strict Public Chat BYOK guard, AES-256-GCM encryption, SSRF blocker, Paystack HMAC-SHA512 webhook verification, WCAG AA contrast check, and license hygiene check):
   ```bash
   npm run verify:phase0
   ```

---

## Governance & Reference Documents

- [`SECURITY.md`](./SECURITY.md) — Binding threat model, OWASP ASVS Level 2 controls, BYOK encryption, strict Public Chat BYOK policy, SSRF protection, and multi-tenant isolation rules.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System diagrams, Dual-Backend Bridge (`Appwrite 2.6.0 TablesDB` + `Firebase Firestore`), multi-dimension `pgvector` (`768`/`1024`/`1536`), and RAG pipeline.
- [`DECISIONS.md`](./DECISIONS.md) & [`docs/adr/ADR-007-appwrite-migration.md`](./docs/adr/ADR-007-appwrite-migration.md) — Architectural Decision Records (ADRs) and licensing decisions with dates and rationale.
- [`docs/DEPLOY_COOLIFY.md`](./docs/DEPLOY_COOLIFY.md) — Production self-hosting guide for a single `2 OCPU / 12 GB RAM` ARM server with Coolify, memory limits, swap, UFW firewall, and encrypted backups.
- [`AGENTS.md`](./AGENTS.md) & [`CLAUDE.md`](./CLAUDE.md) — Rules of engagement and phase gate discipline for coding agents.
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) — Full dependency license register and third-party attribution.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Conventional commits, PR guidelines, accessibility, and test standards.
- [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — Operations, key rotation, backup, and restore procedures.
