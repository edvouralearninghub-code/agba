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

## 3. Multi-Tenant Data Model (`workspace_id` Isolation)

Every operational record belongs to an Appwrite Team (`workspace_id`).

### 3.1 Appwrite Collections (`agba_core`)
- **`workspaces`**: `{ id, name, slug, ownerUserId, planTier ('free' | 'builder' | 'team'), currency ('NGN' | 'USD'), createdAt }`
- **`workspace_members`**: `{ id, workspace_id, userId, email, role ('owner' | 'admin' | 'member' | 'viewer') }`
- **`model_connections` (BYOK)**: `{ id, workspace_id, provider ('gemini' | 'openai' | 'anthropic' | 'mistral' | 'ollama'), label, encryptedKey, iv, authTag, maskedKey, createdBy, createdAt }`
- **`studio_apps`**: `{ id, workspace_id, name, description, nodesJson, edgesJson, allowedTools[], publishedSlug, apiKeyHash, updatedAt }`
- **`workflow_runs`**: `{ id, workspace_id, appId, status ('running' | 'completed' | 'failed'), durationMs, tokenCount, citationsJson, createdAt }`
- **`audit_logs`**: `{ id, workspace_id, actorId, action, targetId, metadataJson, createdAt }`

### 3.2 Neon Postgres (`pgvector`) Schema
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rag_chunks_workspace ON rag_document_chunks (workspace_id);
CREATE INDEX idx_rag_chunks_hnsw ON rag_document_chunks USING hnsw (embedding vector_cosine_ops);
```
Every retrieval query enforces `WHERE workspace_id = $1` on the server using the authenticated session's `workspace_id`.

---

## 4. Core Execution Flows

1. **RAG Ingestion & Retrieval:**
   - Upload allowlisted file (`.pdf`, `.docx`, `.txt`, `.md`, max 10MB) -> store in Appwrite Storage with UUID key -> chunk text -> generate embeddings on server -> insert into `rag_document_chunks` with `workspace_id`.
   - At query time, server filters chunks strictly by `workspace_id`, wraps retrieved text in `<untrusted_context>` delimiters, and returns grounded answers with source citations.
2. **Allowlisted Agent Tools:**
   - Five standard tools (`http_request`, `web_search`, `calculator`, `document_retrieval`, `send_email_novu`).
   - Before any tool executes, the engine verifies `app.allowedTools.includes(toolName)`. The `http_request` tool passes through `validateUrlAgainstSSRF()` first.
