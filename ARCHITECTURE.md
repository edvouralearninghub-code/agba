# ARCHITECTURE.md — System Design & Multi-Tenant Data Model

> Owner: Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
> Status: Phase 0 Foundation Architecture

---

## 1. High-Level System Topology

```text
+-----------------------------------------------------------------------------------+
|                                   CLIENT TIER                                     |
|  AGBA Web Application (Marketing Site + App Shell: Studio, Academy, Free Stack)   |
|  Typography: Fraunces + Inter + JetBrains Mono | Tokens: --agba-* (WCAG AA)       |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / JSON (Zod Validated)
                                          v
+-----------------------------------------------------------------------------------+
|                            APPLICATION & AI GATEWAY TIER                          |
|  AGBA Server Gateway (Node/Express in Preview | Next.js App Router + Engine)      |
|  - Tenant Guard Middleware (enforces workspace_id & Appwrite Team Role)           |
|  - AES-256-GCM BYOK Vault (server-only decryption at model invocation time)       |
|  - SSRF Guard (blocks RFC1918, loopback, link-local, 169.254.169.254 metadata)    |
|  - Paystack Webhook Verifier (HMAC-SHA512 + idempotency ledger)                   |
+-------------+---------------------------+---------------------------+-------------+
              |                           |                           |
              v                           v                           v
+---------------------------+ +-----------------------+ +---------------------------+
|     APPWRITE PLATFORM     | |  NEON POSTGRESQL DB   | |    EXTERNAL INTEGRATIONS  |
| - Auth (Email, OAuth)     | | - pgvector extension  | | - BYOK LLM Providers      |
| - Teams (= Workspaces)    | | - Strict workspace_id | |   (Gemini, OpenAI,        |
| - Databases (Metadata)    | |   WHERE clause filter | |    Anthropic, Mistral,    |
| - Storage (RAG Docs)      | | - HNSW cosine index   | |    Ollama / Local)        |
| - Functions (Pipelines)   | |                       | | - Paystack (NGN & USD)    |
+---------------------------+ +-----------------------+ | - Novu (Notifications)    |
                                                        | - Strapi CE (MIT Content) |
                                                        +---------------------------+
```

---

## 2. Phase 0 Verification: Appwrite Vector Search vs. Neon Postgres (`pgvector`)

Per **Section 2** and **Phase 0** of the Master Build Prompt, we verified current Appwrite documentation regarding native vector search:

### Findings
1. **Appwrite VectorsDB (New Multi-Model Update):** Appwrite has introduced `VectorsDB` supporting fixed-dimension vector collections, JSON `metadata`, and HNSW indexes (`hnsw_cosine`, `hnsw_dot`, `hnsw_euclidean`) via `Query.vectorCosine` / `Query.vectorDot` / `Query.vectorEuclidean` with collection/document-level permissions.
2. **Trade-offs for AGBA's BYOK Multi-Provider Model:**
   - Appwrite `VectorsDB` collections require a **fixed vector dimension size** per collection at creation time (e.g., 768 for `nomic-embed-text` or `gemini-embedding-2-preview`, 1536 for OpenAI `text-embedding-3-small`, 1024 for Mistral).
   - Neon Postgres (`pgvector`) supports flexible partial indexing, hybrid full-text + vector SQL joins (`tsvector` + `<=>`), strict relational Row-Level Security (`RLS`) keyed by `workspace_id`, and mature SQL migrations.

### Recommendation (Reported for Owner Decision)
- **Keep `[DECISION] Vector store: Neon Postgres with pgvector` as the primary default** for Phase 1 because hybrid keyword+vector search and PostgreSQL RLS provide stronger defense-in-depth for multi-tenant RAG.
- **Alternative Proposal for Owner:** If you prefer 100% single-platform consolidation inside self-hosted Appwrite, we can adopt Appwrite `VectorsDB` using one collection per embedding dimension (`vectors_768`, `vectors_1024`, `vectors_1536`). We have NOT switched silently; Neon `pgvector` remains the active architectural baseline pending your review.

---

## 3. Multi-Tenant Data Model (`workspace_id` Isolation & Single Source of Truth — ADR-008)

Per **ADR-008** ([`docs/adr/ADR-008-single-source-of-truth.md`](./docs/adr/ADR-008-single-source-of-truth.md)), **Appwrite (`2.6.1` `TablesDB`)** is the single source of truth for all application documents and files, **PostgreSQL (`pgvector`)** with Row-Level Security (`RLS`) is the single source of truth for vector embeddings, **Redis** is the single source of truth for real-time rate-limit counters, and **Firebase Auth** is used strictly as a pluggable identity provider (`IDENTITY_PROVIDER=firebase|appwrite`) mapped via the server-only `identity_links` table.

### 3.1 Appwrite `2.6.1` `TablesDB` Tables (`agba_core`)
- **`identity_links`** *(Server-Only — `permissions: []`)*: `{ firebaseUid (unique), appwriteUserId (unique), email, createdAt, updatedAt }` — maps Firebase Auth UIDs to Appwrite User IDs (never matched by email alone).
- **`admins`** *(Server-Only — `permissions: []`)*: `{ uid, email, role, createdAt }`
- **`workspaces`** *(Client Read via `Role.team(workspaceId)` / Writes via Express only)*: `{ id, teamId, ownerId, name, slug, planTier ('free' | 'builder' | 'team'), currency ('NGN' | 'USD'), createdAt, updatedAt }`
- **`workflows`** *(Client Read via `Role.team(workspaceId)` / Writes via Express only)*: `{ id, workspace_id, ownerId, name, description, category, status ('draft' | 'published' | 'archived'), allowedToolsJson, nodesJson, edgesJson, publishedSlug, createdAt, updatedAt }`
- **`free_stack_entries`** *(Client Read via `Role.team(workspaceId)` / Writes via Express only)*: `{ id, workspace_id, ownerId, serviceName, description, category, freeTierSummary, officialPricingUrl, verifiedOn, createdAt, updatedAt }`
- **`rag_documents`** *(Client Read via `Role.team(workspaceId)` / Writes via Express only)*: `{ id, workspace_id, storageBucketId, storageFileId, originalFilename, sanitizedFilename, mimeType, sizeBytes, chunksCount, embeddingDim, uploadedBy, createdAt }`
- **`byok_keys`** *(Server-Only — `permissions: []`)*: `{ id, workspace_id, provider, label, maskedKey, ciphertextHex, ivHex, authTagHex, createdBy, createdAt }`
- **`webhook_events`** *(Server-Only — `permissions: []`)*: `{ eventId, eventType, workspace_id, amountSmallestUnit, currency, status, processedAt }`
- **`usage`** *(Server-Only — `permissions: []`)*: `{ id, workspace_id, appId, periodDate, runsCount, tokensUsed, updatedAt }` (populated via daily rollups from Redis rate-limit counters)
- **`audit_log`** *(Server-Only — `permissions: []`)*: `{ id, workspace_id, actorUid, actorRole, action, targetResource, outcome, ipHash, createdAt }`

### 3.2 PostgreSQL (`pgvector`) Multi-Dimension Schema with Row-Level Security (`768`, `1024`, `1536`)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag_chunks_768 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rag_chunks_768_workspace ON rag_chunks_768 (workspace_id);
CREATE INDEX idx_rag_chunks_768_hnsw ON rag_chunks_768 USING hnsw (embedding vector_cosine_ops);

ALTER TABLE rag_chunks_768 ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks_768 FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy_768 ON rag_chunks_768
  USING (workspace_id = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true));
```
*(Identical DDL and RLS policies apply to `rag_chunks_1024` and `rag_chunks_1536`.)*

---

## 4. Core Execution & Reliability Flows

1. **Identity Bridge (`IDENTITY_PROVIDER=firebase|appwrite`):**
   - Browser signs in with Firebase Google OAuth $\rightarrow$ Express verifies ID token (`email_verified === true`) $\rightarrow$ looks up or creates `appwriteUserId` in `identity_links` keyed strictly by `firebaseUid` $\rightarrow$ calls Appwrite `users.createToken(appwriteUserId)` $\rightarrow$ browser exchanges token via `account.createSession(userId, secret)` for a native Appwrite session.
2. **RAG Ingestion & Retrieval (Appwrite Storage `rag_files` $\rightarrow$ `pgvector` with RLS):**
   - Upload allowlisted file (`.pdf`, `.docx`, `.txt`, `.md`, max 10MB) $\rightarrow$ store binary in Appwrite Storage bucket `rag_files` with UUID key and `Role.team(workspaceId)` read permission $\rightarrow$ record metadata in `rag_documents` $\rightarrow$ chunk text $\rightarrow$ generate embeddings using the workspace's BYOK key $\rightarrow$ insert into `rag_chunks_<dim>` inside an RLS-scoped transaction (`SET LOCAL app.workspace_id = $1`).
3. **Zero-Cost Reliability & Recovery (`ADR-008` Section 5):**
   - `GET /healthz` (liveness) and `GET /readyz` (Appwrite + Postgres + Redis + disk readiness) monitored externally by **UptimeRobot** (5-min) and **Better Stack** (3-min) with **Telegram Bot** + email alerts, **Healthchecks.io** dead-man's-switch heartbeats for nightly AES-256 encrypted backups to **Cloudflare R2 / Backblaze B2**, and **Sentry Developer Free** error tracking.


