# AGBA — Learn, Build & Ship AI

**Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
**Live Production Web App:** [https://agba-pi.vercel.app](https://agba-pi.vercel.app)  
**GitHub Repository:** [https://github.com/edvouralearninghub-code/agba](https://github.com/edvouralearninghub-code/agba)  
**Status:** Phase 0 + Phase 0.5 + Phase 0.6 Gate B Verified (`Appwrite 2.6.1 TablesDB` + `Multi-Dimension pgvector` + `AES-256-GCM BYOK Vault`)

> **GitHub Repository "About" Description (Copy & Paste into GitHub Sidebar ⚙️):**  
> `Multi-tenant AI learning (Academy), visual BYOK workflow builder with AES-256-GCM vault & pgvector RAG (Studio), and 160 verified always-free developer tiers (Free Stack). Built in Lagos by Trendtactics Digital.`
>
> **Website:** `https://agba-pi.vercel.app`  
> **Recommended GitHub Topics:** `ai-workflows` `rag` `byok` `appwrite` `pgvector` `free-for-developers` `multi-tenant-saas` `llm-agents` `gemini-api` `openai` `anthropic` `ollama` `typescript` `react` `express` `lagos` `nigeria` `african-tech` `owasp-asvs` `paystack`

---

## What is AGBA?

**AGBA** (from the Yoruba word ***àgbà*** — the respected elder and custodian of wisdom who has seen the path before and guides the community, linked to *agbára* — strength and capability) is a multi-tenant AI learning, visual workflow building, and verified free-tier shipping platform built in **Lagos, Nigeria** by **Trendtactics Digital** for builders, students, founders, and SMEs across Africa and worldwide.

### The Three Pillars of AGBA

1. **01 · Learn (`AGBA Academy`):**
   - **12 interactive AI & RAG starter blueprints** across *Starter*, *RAG Tutorial*, and *Advanced Multi-Agent* tracks.
   - Inspect every system instruction, prompt template, and tool step before importing directly into your Studio workspace in one click.
   - Supports hosted frontier models (`Google Gemini`, `OpenAI`, `Anthropic claude-sonnet-4-5`, `Mistral`) and local open-weights models via `Ollama`.

2. **02 · Build (`AGBA Studio — BYOK & Private RAG`):**
   - **Three-pane visual AI workflow builder** with Bring-Your-Own-Key (`BYOK`) model adapters.
   - **Server-side `AES-256-GCM` envelope encryption** for all model API keys (`96-bit IV` + `128-bit auth tag`). Keys are decrypted only in server memory at workflow execution time and are masked in the UI (`sk-••••••••4c81`).
   - **Strict multi-tenant `workspace_id` isolation** backed by **Appwrite `2.6.1` `TablesDB`** (`10` tables + `rag_files` storage bucket) and **multi-dimension `pgvector`** (`rag_chunks_768`, `rag_chunks_1024`, `rag_chunks_1536`) with transactional Row-Level Security (`SET LOCAL app.workspace_id`).

3. **03 · Ship (`AGBA Free Stack`):**
   - **160 independently researched, verified always-free developer and DevOps tiers** across **10 categories** (*Cloud & Compute*, *Databases & Vector Stores*, *AI & Model APIs*, *Auth & Security*, *Storage & Media CDN*, *Monitoring & Observability*, *CI/CD & DevOps*, *Email & Messaging*, *Analytics & Feature Flags*, and *Nigerian & African Developer Tools*).
   - Every entry includes original prose, free-tier quota limits, direct HTTPS links to official vendor pricing documentation, and a `verifiedOn` date stamp, plus a live CMS editor and one-click Studio publish endpoints.

---

## SEO, Programmatic SEO (pSEO), GEO & AEO Architecture

AGBA is engineered for discoverability across classic search engines (Google, Bing), Answer Engines (Google AI Overviews, Perplexity, Bing Copilot), and Generative AI Engines (ChatGPT Search, Claude, Gemini):

- **Core SEO & Social Cards (`index.html`, `public/og-card.svg`, `public/favicon.svg`):**
  - Optimized 56-character title and 154-character meta description synced with `metadata.json`.
  - Custom Yoruba *Àgbà* crest SVG favicon (`/favicon.svg`) and `1200×630` OpenGraph / Twitter large summary card (`/og-card.svg`).
- **Geographic SEO (`GEO — Lagos, Nigeria`):**
  - Explicit `en-NG` locale, `geo.region="NG-LA"`, `geo.placename="Lagos, Nigeria"`, and `PostalAddress` structured data attributing creation to **Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria**.
- **Programmatic SEO (`pSEO` — `src/lib/seoEngine.ts` & `/sitemap.xml`):**
  - Dynamically generates indexable URLs, canonical tags, custom meta descriptions, and Schema.org `ItemList` JSON-LD for all **10 Free Stack Category Hubs** (`/?view=app&module=freestack&category=...`) and **3 Academy Learning Tracks** (`/?view=app&module=academy&track=...`).
  - Dynamic XML sitemap served at [`/sitemap.xml`](https://agba-pi.vercel.app/sitemap.xml) and catalog metadata at [`/api/seo/catalog`](https://agba-pi.vercel.app/api/seo/catalog).
- **Generative Engine Optimization (`GEO` — `llmstxt.org` Standard):**
  - Serves [`/llms.txt`](https://agba-pi.vercel.app/llms.txt) (concise architectural & entity summary) and [`/llms-full.txt`](https://agba-pi.vercel.app/llms-full.txt) (complete 160-service Free Stack & 12-blueprint Academy knowledge graph) with crawler permissions in [`/robots.txt`](https://agba-pi.vercel.app/robots.txt) for `GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, and `Google-Extended`.
- **Answer Engine Optimization (`AEO` — Schema.org `@graph`):**
  - Embeds linked `Organization`, `WebSite`, `SoftwareApplication`, and `FAQPage` JSON-LD entities directly in `<head>` for zero-click answer citations.

---

## Quick Start (Local, Cloud & Self-Hosted Docker)

1. Copy `.env.example` to `.env` and configure your environment variables:
   ```bash
   cp .env.example .env
   ```
2. (Optional) Start the local self-hosted Appwrite `2.6.1` + `pgvector` Docker stack and bootstrap the 10 `TablesDB` tables + `rag_files` storage bucket:
   ```bash
   docker compose -f infra/appwrite/docker-compose.yml -f infra/appwrite/docker-compose.override.yml up -d
   npm run bootstrap:appwrite
   ```
3. Install dependencies and start the full-stack Express + Vite server on port `3000`:
   ```bash
   npm install && npm run dev
   ```
4. Run the automated 47-check verification suite (`verify:phase0`) and live Appwrite `2.6.1` integration suite (`verify:appwrite-live`):
   ```bash
   npm run verify:phase0
   npm run verify:appwrite-live
   ```

---

## Governance & Reference Documents

- [`SECURITY.md`](./SECURITY.md) — Binding threat model, OWASP ASVS Level 2 controls, BYOK encryption, strict Public Chat BYOK policy, SSRF protection, and multi-tenant isolation rules.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System diagrams, Appwrite `2.6.1` `TablesDB` single source of truth, Firebase-to-Appwrite Identity Bridge (`ADR-008`), and multi-dimension `pgvector` (`768`/`1024`/`1536`) RAG pipeline.
- [`DECISIONS.md`](./DECISIONS.md) & [`docs/adr/ADR-008-firebase-to-appwrite-identity-bridge.md`](./docs/adr/ADR-008-firebase-to-appwrite-identity-bridge.md) — Architectural Decision Records (ADRs) and licensing decisions with dates and rationale.
- [`docs/REBUILD.md`](./docs/REBUILD.md) & [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) — `< 2 Hour` disaster recovery rebuild runbook, `GPG AES-256` offsite backup/restore (`scripts/backup-agba.sh`), key rotation, and `/healthz` + `/readyz` probes.
- [`docs/DEPLOY_COOLIFY.md`](./docs/DEPLOY_COOLIFY.md) — Production self-hosting guide with Coolify, memory limits, swap, UFW firewall, and encrypted backups.
- [`AGENTS.md`](./AGENTS.md) & [`CLAUDE.md`](./CLAUDE.md) — Rules of engagement and phase gate discipline for coding agents.
- [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) — Full dependency license register and third-party attribution.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Conventional commits, PR guidelines, accessibility, and test standards.
