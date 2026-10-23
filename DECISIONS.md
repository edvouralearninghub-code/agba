# DECISIONS.md — Architectural & Licensing Decision Log

> Items marked **`[DECISION]`** originate from the Owner / Architect (Akinola Olujobi, Trendtactics Digital) and may not be altered without explicit owner approval.

---

## ADR-001: Self-Hosted Appwrite as Core Backend Platform `[DECISION]`
- **Date:** 2026-10-23
- **Status:** Accepted (Binding)
- **Context:** AGBA requires authentication, multi-tenant team management, document storage, metadata databases, and background functions.
- **Decision:** Use self-hosted **Appwrite** (BSD-3-Clause) with Appwrite Teams mapped 1:1 to AGBA Workspaces (`workspace_id`).
- **Consequences:** Consolidates auth, RBAC teams, storage, and functions under a permissive BSD-3-Clause license.

---

## ADR-002: Neon Postgres with `pgvector` for RAG Embeddings `[DECISION]`
- **Date:** 2026-10-23
- **Status:** Accepted (Verified in Phase 0; alternative reported)
- **Context:** RAG workflows require low-latency vector similarity search with strict server-side `workspace_id` isolation across multiple BYOK embedding providers.
- **Phase 0 Verification Note:** Appwrite recently introduced `VectorsDB` with HNSW indexing (`hnsw_cosine`, `hnsw_dot`, `hnsw_euclidean`). However, `VectorsDB` requires fixed vector dimensions per collection, whereas Neon `pgvector` supports SQL Row-Level Security (`RLS`), flexible dimensions, and hybrid keyword + semantic search. We retain Neon `pgvector` as the active default and report `VectorsDB` as an optional consolidation path for the owner to review.

---

## ADR-003: Flowise Apache-2.0 Core & Strict Exclusion of Enterprise Directory `[DECISION]`
- **Date:** 2026-10-23
- **Status:** Accepted (Binding)
- **Context:** AGBA Studio requires a node execution engine for LLM chains, RAG pipelines, and tool-calling agents.
- **Decision:** Use the Apache-2.0 licensed core concepts/nodes of Flowise behind AGBA's custom design system, while **strictly excluding `packages/server/src/enterprise`**.
- **Dify Restriction:** Dify (`langgenius/dify`) is referenced solely for high-level product capability inspiration. Zero code, UI layout, styling, or interactive design patterns from Dify are used due to its commercial multi-tenant clause and appearance patent notice.

---

## ADR-004: Independent Verification for AGBA Free Stack Directory
- **Date:** 2026-10-23
- **Status:** Accepted (Binding)
- **Context:** `ripienaar/free-for-dev` does not display a standard permissive open-source license file in its root.
- **Decision:** Do not copy text or lists from `free-for-dev`. Every entry in AGBA Free Stack is written in our own words, links directly to the vendor's official pricing/documentation URL, and records an explicit `verifiedOn` ISO date.

---

## ADR-005: AES-256-GCM Server-Side Encryption for BYOK Credentials
- **Date:** 2026-10-23
- **Status:** Accepted (Binding)
- **Context:** Users connect their own OpenAI, Anthropic, Google Gemini, and Mistral keys.
- **Decision:** Encrypt all keys at rest with AES-256-GCM (96-bit IV, 128-bit auth tag) using `AGBA_MASTER_ENCRYPTION_KEY`. Decrypt only in server memory during execution; mask all keys in API responses (`sk-...XXXX`).

---

## ADR-006: AI Studio Runtime Adapter (Phase 0 Preview Architecture)
- **Date:** 2026-10-23
- **Status:** Accepted (Environment Constraint)
- **Context:** The AI Studio live preview environment runs a single-port (`3000`) Vite + Express TypeScript server (`server.ts`).
- **Decision:** Structure the codebase cleanly into modular domain boundaries (`src/server/` for backend security, tenant isolation, encryption, SSRF guard, webhook verification, and Gemini execution; `src/client/` / `src/components/` for the AGBA Marketing Site and App Shell; `scripts/verify-phase0.ts` for automated CI verification) so the live preview works out-of-the-box while remaining 100% portable to the Vercel + Railway monorepo deployment topology.
