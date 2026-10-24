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
- **Decision:** Structure the codebase cleanly into modular domain boundaries (`src/server/` for backend security, tenant isolation, encryption, SSRF guard, webhook verification, and Gemini execution; `src/client/` / `src/components/` for the AGBA Marketing Site and App Shell; `scripts/verify-phase0.ts` for automated CI verification) so the live preview works out-of-the-box while remaining 100% portable to the Coolify / Docker self-hosted deployment topology.

---

## ADR-007: Appwrite 2.6 (`TablesDB`) + Multi-Dimension `pgvector` Baseline
- **Date:** 2026-10-23
- **Status:** Partially Superseded by **ADR-008** (Dual-write to Firestore retired; `TablesDB` schema, strict Public Chat BYOK, and multi-dimension `pgvector` retained — see [`docs/adr/ADR-007-appwrite-migration.md`](./docs/adr/ADR-007-appwrite-migration.md))

---

## ADR-008: Appwrite 2.6.1 as Single Source of Truth, Firebase Identity Bridge & Zero-Cost Reliability `[DECISION]`
- **Date:** 2026-10-24
- **Status:** Accepted at Gate A with Owner Conditions; Currently at Gate B Review (See [`docs/adr/ADR-008-single-source-of-truth.md`](./docs/adr/ADR-008-single-source-of-truth.md))
- **Context:** Dual-writing application data to both Firebase Cloud Firestore and Appwrite `TablesDB` introduces split-brain drift risk and requires maintaining two parallel rule systems. In addition, container image digests, real-Appwrite integration tests, and $0 external uptime/backup/alerting safeguards must be verified with concrete evidence.
- **Decision Summary:**
  1. **Single Source of Truth (`Appwrite 2.6.1`):** Appwrite `2.6.1` (`TablesDB` + Storage `rag_files` + Teams) generated via the official Appwrite `2.6.1` installer (`infra/appwrite/docker-compose.yml` kept 100% unmodified, with AGBA extras in `infra/agba-extras.docker-compose.yml`) is the sole system of record for workspaces, workflows, Free Stack CMS entries, BYOK keys, webhook ledgers, usage rollups, audit logs, identity links, and files. Firestore application data writes and reads are retired after a one-time migration script (`scripts/migrate-firestore-to-appwrite.ts`), enforced by a CI import-ban check (`scripts/check-no-firestore-imports.ts`).
  2. **Identity Bridge (`IDENTITY_PROVIDER=firebase|appwrite`):** Browser signs in with Firebase Google Auth, Express verifies the Firebase ID token (`email_verified === true`), maps `firebaseUid -> appwriteUserId` via the server-only `identity_links` table (never by email alone), and mints an Appwrite custom token via `users.createToken` so the browser establishes a genuine Appwrite session.
  3. **Read-via-Team / Write-via-Express Permissions & Postgres RLS:** Client roles receive `read` permission via `Role.team(workspaceId)` and **zero write permissions** on Appwrite tables (all writes validated by Express + strict Zod schemas). PostgreSQL `rag_chunks_768`/`1024`/`1536` tables enforce Row-Level Security (`RLS`) bound to `app.workspace_id`. Rate-limit counters move to Redis.
  4. **Zero-Cost Reliability Stack (Commercial-Use Verified on `2026-10-24`):** `/healthz` + `/readyz` probed by **UptimeRobot** (50 free monitors, 5-min interval) and **Better Stack** (10 free monitors, 3-min interval), mobile push alerts via **Telegram Bot API**, cron heartbeats via **Healthchecks.io** (20 free checks), error tracking via **Sentry Developer Free** (5,000 events/mo), and nightly AES-256 encrypted offsite backups to **Cloudflare R2** (10 GB free, $0 egress) / **Backblaze B2** (10 GB free). Oracle Cloud Always-Free idle reclamation (`< 20%` 95th-percentile threshold over 7 days) is addressed via strictly `$0` Always-Free options with no paid plan.



