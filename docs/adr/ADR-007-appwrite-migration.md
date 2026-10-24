# ADR-007: Appwrite 2.6 (`TablesDB`) + Firebase Dual-Backend Architecture & Security Parity

- **Date:** 2026-10-23
- **Status:** Proposed — Awaiting Owner Approval (Phase 0.5 Step 1 Gate)
- **Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria
- **Pinned Appwrite Version:** `appwrite/appwrite:2.6.0` (Hyperloop Engine, `TablesDB` API)

---

## 0. Executive Summary & Dual-Backend Mandate

Per the Owner's directive:
1. **Self-Hosted Appwrite (`appwrite/appwrite:2.6.0`)** is introduced as AGBA's self-hostable backend for authentication (Google OAuth + Email/Password with verification), multi-tenant workspaces (Appwrite Teams), structured relational-document tables (`TablesDB`), and binary RAG file storage (`Appwrite Storage`).
2. **Firebase Auth & Cloud Firestore (`gen-lang-client-0795320136`) are preserved** as a live synchronized bridge layer (`DualBackendRepository`) rather than deleted. When Firebase is active, workspace metadata, workflows, and Free Stack entries stay synchronized across both backends, and files/documents uploaded through the app are passed through `server.ts` into **Appwrite Storage** and indexed in **PostgreSQL (`pgvector`)**.
3. **Zero Security Regression:** Every invariant enforced in `SECURITY.md` and `firestore.rules` is enforced on the Express gateway (`server.ts`) via `zod` schemas, server-derived Appwrite Team roles, and Appwrite row/file permissions.

---

## 1. Data Model Mapping (Firestore Paths $\leftrightarrow$ Appwrite 2.6 `TablesDB`)

> **Appwrite 2.6 API Note:** Appwrite `2.x` (`2.6.0`) uses the **`TablesDB`** API where *Collections* are **Tables**, *Documents* are **Rows**, and *Attributes* are **Columns** (`tablesDB.createTable`, `tablesDB.createRow`, `tablesDB.listRows`, `tablesDB.updateRow`, `tablesDB.deleteRow`).

Database ID: `agba_core`

| Firestore Path (Preserved Bridge) | Appwrite `TablesDB` Table ID | Primary Key (`rowId`) | Columns & Types | Purpose |
|---|---|---|---|---|
| `/admins/{adminUid}` | `admins` | `adminUid` | `uid` (string, 128, req), `email` (string, 255, req), `createdAt` (datetime, req) | System administrator registry |
| `/workspaces/{workspaceId}` | `workspaces` | `workspaceId` (`== Appwrite Team ID`) | `id` (string, 128, req), `ownerId` (string, 128, req), `name` (string, 80, req), `slug` (string, 80, req, unique idx), `planTier` (enum: `free`,`builder`,`team`), `currency` (enum: `NGN`,`USD`), `createdAt` (datetime), `updatedAt` (datetime) | Multi-tenant workspace mapped 1:1 to an Appwrite Team |
| `/workspaces/{workspaceId}/workflows/{workflowId}` | `workflows` | `workflowId` | `id` (string, 128), `workspace_id` (string, 128, idx), `ownerId` (string, 128), `name` (string, 120), `description` (string, 500), `category` (enum: `Starter`,`RAG`,`Multi-Agent`), `status` (enum: `draft`,`published`,`archived`), `allowedToolsJson` (string, 1000), `nodesJson` (string, 65535), `edgesJson` (string, 32768), `publishedSlug` (string, 120), `createdAt` (datetime), `updatedAt` (datetime) | Studio visual AI workflows |
| `/workspaces/{workspaceId}/free_stack_entries/{entryId}` | `free_stack_entries` | `entryId` | `id` (string, 128), `workspace_id` (string, 128, idx), `ownerId` (string, 128), `serviceName` (string, 120), `description` (string, 400), `category` (string, 64, idx), `freeTierSummary` (string, 500), `officialPricingUrl` (string, 300), `verifiedOn` (string, 10), `createdAt` (datetime), `updatedAt` (datetime) | Workspace-scoped Free Stack CMS directory entries |
| *(Server-Only Vault)* | `byok_keys` | `keyId` | `id` (string, 128), `workspace_id` (string, 128, idx), `provider` (enum: `gemini`,`openai`,`anthropic`,`mistral`,`ollama`), `defaultModel` (string, 120), `label` (string, 120), `maskedKey` (string, 64), `ciphertextB64` (string, 2048), `ivB64` (string, 64), `authTagB64` (string, 64), `createdBy` (string, 128), `createdAt` (datetime) | AES-256-GCM encrypted BYOK keys (ciphertext only; never readable by client SDK) |
| *(Storage Metadata)* | `rag_documents` | `documentId` | `id` (string, 128), `workspace_id` (string, 128, idx), `storageFileId` (string, 128), `originalFilename` (string, 255), `mimeType` (string, 128), `sizeBytes` (integer), `chunkCount` (integer), `embeddingDimension` (integer: `768`,`1024`,`1536`), `uploadedBy` (string, 128), `createdAt` (datetime) | Metadata linking uploaded files in Appwrite Storage bucket `rag_files` to `pgvector` chunks |
| *(Server-Only Billing)* | `webhook_events` | `eventId` | `eventId` (string, 128, unique), `provider` (string, 32), `eventType` (string, 64), `workspace_id` (string, 128), `amountMinorUnits` (integer), `currency` (string, 8), `processedAt` (datetime) | Paystack HMAC-SHA512 idempotency ledger |
| *(Server-Only Metering)* | `usage` | `usageKey` (`${workspace_id}:${YYYY-MM-DD}`) | `id` (string, 128), `workspace_id` (string, 128, idx), `dateKey` (string, 10), `studioRunsCount` (integer), `publicChatCount` (integer), `tokensUsed` (integer), `dailyQuotaLimit` (integer), `updatedAt` (datetime) | Daily per-workspace rate-limit & quota counter |
| *(Server-Only Security)* | `audit_log` | `auditId` | `id` (string, 128), `workspace_id` (string, 128, idx), `actorId` (string, 128), `actorRole` (string, 32), `action` (string, 120), `targetType` (string, 64), `targetId` (string, 128), `metadataJson` (string, 4000), `createdAt` (datetime) | Immutable security audit trail (key creation, role changes, billing events) |

---

## 2. Permissions Matrix (Appwrite Team Roles & Server-Only Isolation)

Every workspace is an **Appwrite Team** (`teamId == workspace_id`) with four roles: `owner`, `admin`, `member`, `viewer`.

| Resource (`TablesDB` Table or Storage Bucket) | Row / File Security Enabled? | Client SDK Access? | `owner` | `admin` | `member` | `viewer` | Server API Key (`server.ts`) |
|---|---|---|---|---|---|---|---|
| `admins` | Yes | **No (Server-Only)** | None | None | None | None | Read (`databases.read`) |
| `workspaces` | Yes | Read-Only via Team | Read, Update, Delete | Read, Update | Read | Read | Full CRUD (after Zod + RBAC check) |
| `workflows` | Yes | Read-Only via Team | Read, Create, Update, Delete | Read, Create, Update, Delete | Read, Create, Update | Read | Full CRUD (after Zod + RBAC check) |
| `free_stack_entries` | Yes | Read-Only via Team | Read, Create, Update, Delete | Read, Create, Update, Delete | Read | Read | Full CRUD (Owner/Admin only for writes) |
| `rag_documents` | Yes | Read-Only via Team | Read, Create, Delete | Read, Create, Delete | Read, Create | Read | Full CRUD (Viewer blocked on writes) |
| **`byok_keys`** | Yes | **NONE (`permissions: []`)** | **Denied** (Masked list via `/api/keys` only) | **Denied** | **Denied** | **Denied** | **Server-Only** (Never returns ciphertext or raw key) |
| **`webhook_events`** | Yes | **NONE (`permissions: []`)** | **Denied** | **Denied** | **Denied** | **Denied** | **Server-Only** (Paystack webhook handler only) |
| **`usage`** | Yes | **NONE (`permissions: []`)** | **Denied** | **Denied** | **Denied** | **Denied** | **Server-Only** (Quota & rate-limit enforcement) |
| **`audit_log`** | Yes | **NONE (`permissions: []`)** | **Denied** | **Denied** | **Denied** | **Denied** | **Server-Only** (Append-only security logging) |
| **Bucket: `rag_files`** | Yes (File Security) | Read via Team | Read, Create, Delete | Read, Create, Delete | Read, Create | Read | Full CRUD (10 MB max, `.pdf`,`.docx`,`.txt`,`.md` only) |

---

## 3. Firestore Rule Parity Table (Defense-in-Depth Across Both Layers)

Appwrite `TablesDB` provides table-level and row-level ACL permissions (`Role.team(workspaceId, 'owner')`), plus column type/length constraints, **but does not execute CEL field-comparison expressions** (such as `incoming().ownerId == existing().ownerId` or `existing().status != 'archived'`).

Therefore, every field-level invariant from `firestore.rules` is enforced in **two places**:
1. **On the Express Gateway (`server.ts` + Repository Layer)** via strict `zod` validation and pre-write state checks before calling `tablesDB`, AND
2. **In `firestore.rules`** for the bridged Firebase Firestore collection paths.

| Security Property | Old `firestore.rules` Enforcement | New Appwrite + Express Server Enforcement (Honest Parity) |
|---|---|---|
| **1. Default-Deny Catch-All** | `match /{document=**} { allow read, write: if false; }` | All Appwrite tables default to `permissions: []` (zero public/any access). Sensitive tables (`byok_keys`, `webhook_events`, `usage`, `audit_log`) grant zero permissions even to authenticated users. |
| **2. Verified Email Required for Writes** | `request.auth.token.email_verified == true` | Express `requireVerifiedTenantSession` middleware inspects the user account from Appwrite (`account.emailVerification === true`) and Firebase (`email_verified === true`) and rejects all `POST`/`PUT`/`DELETE` requests with `403 UnverifiedEmailError` if unverified. |
| **3. Master Gate / Parent Workspace Ownership** | `exists(.../workspaces/$(workspaceId))` and `ownerId == request.auth.uid` | Server queries Appwrite `Teams.listMemberships(workspaceId)` using the authenticated `userId` on every request; row permissions also attach `Permission.read(Role.team(workspaceId))` and `Permission.write(Role.team(workspaceId, 'owner'))`. |
| **4. Strict Key Allowlists (`hasAll` / `hasOnly`)** | `data.keys().hasAll(...) && data.keys().hasOnly(...)` | Server validates all incoming payloads with `z.object({...}).strict()` (Zod `.strict()` rejects any payload containing unknown/ghost fields such as `isSuperAdmin: true` with HTTP 400). Appwrite `TablesDB` schema also rejects undeclared columns. |
| **5. Volumetric & Regex Bounds** | `id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')` | Enforced both by Zod `.min()/.max()/.regex()` validators in `server.ts` AND by Appwrite `TablesDB` column `size` definitions. |
| **6. Immutable Fields (`id`, `workspace_id`, `ownerId`, `createdAt`)** | `incoming().ownerId == existing().ownerId` | Appwrite does not have immutable column flags on update; therefore `UpdateSchemas` in `server.ts` strip/reject `id`, `workspace_id`, `ownerId`, and `createdAt`, and the Repository layer fetches the existing row first to assert those fields remain unchanged before calling `tablesDB.updateRow`. |
| **7. Server Timestamps (`request.time`)** | `incoming().createdAt == request.time` | Client-supplied `createdAt`/`updatedAt` values are ignored by `server.ts`; the server injects `new Date().toISOString()` on the Appwrite row and `serverTimestamp()` on the Firestore bridge. |
| **8. Terminal State Locking (`status == 'archived'`)** | `existing().status != 'archived' \|\| isAdmin()` | Before updating a row in `workflows`, `WorkflowRepo.update()` loads the current row from Appwrite `TablesDB`; if `existing.status === 'archived'` and caller role is not `admin`/`owner`, it throws `TerminalStateLockedError (403)`. |
| **9. Query Enforcer (No Cross-Tenant List Scraping)** | `allow list: if existing().ownerId == request.auth.uid` | Every `tablesDB.listRows` query injects `Query.equal('workspace_id', [verifiedContext.workspace_id])` on the server, backed by row-level `Role.team(workspaceId)` read permissions. |

---

## 4. Authentication Flow & Dual-Backend Identity Bridge

1. **Supported Sign-In Methods:**
   - **Google OAuth2:** Appwrite Web SDK `account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl)` + bridged Firebase `signInWithPopup` in preview environments.
   - **Email & Password + Verification:** `account.create(ID.unique(), email, password, name)` $\rightarrow$ `account.createEmailPasswordSession(email, password)` $\rightarrow$ `account.createVerification(verifyCallbackUrl)`. In local development, verification emails are captured by **Mailpit** (`http://localhost:8025`).
2. **Session & JWT Transport:**
   - The browser obtains a short-lived JWT via `account.createJWT()` (or passes the session cookie / Bearer token) in `Authorization: Bearer <token>` and `x-agba-workspace-id: <teamId>`.
3. **Server-Derived Roles (Removal of Client-Trusted Role Switcher):**
   - `server.ts` **never** trusts `x-agba-role` or `req.body.role` in production/Appwrite mode.
   - The middleware verifies the user's token, queries Appwrite `teams.listMemberships(workspaceId, [Query.equal('userId', user.$id)])`, and derives `role` (`owner`, `admin`, `member`, `viewer`) strictly from the server membership record.
   - In the UI, the header displays the user's server-verified role badge as **read-only**.
4. **Logout & Account Deletion:**
   - Logout calls `account.deleteSession('current')` (and `signOut(auth)` on the Firebase bridge).
   - Account deletion (`DELETE /api/account`) verifies the session, removes the user's personal workspaces/keys, logs an `account.deleted` event in `audit_log`, and invokes `users.delete(userId)` via the Server SDK.

---

## 5. Appwrite-as-Code (`appwrite.json` & Bootstrap Script)

All Appwrite resources are defined declaratively in `/appwrite.json` and provisioned idempotently by `scripts/bootstrap-appwrite.ts`:
- **Project:** `agba-core` (`AGBA Platform`)
- **Database:** `agba_core`
- **Tables (9):** `admins`, `workspaces`, `workflows`, `free_stack_entries`, `byok_keys`, `rag_documents`, `webhook_events`, `usage`, `audit_log` with explicit column types, sizes, required flags, and composite indexes on `(workspace_id, createdAt)`.
- **Storage Bucket:** `rag_files` (`fileSecurity: true`, `maximumFileSize: 10485760` [10 MB], `allowedFileExtensions: ['pdf', 'docx', 'txt', 'md']`, `encryption: true`, `antivirus: false` on 12 GB RAM budget to save 1.2 GB ClamAV RAM).
- **Least-Privilege Server API Key Scopes:** `users.read`, `users.write`, `teams.read`, `teams.write`, `databases.read`, `databases.write`, `files.read`, `files.write`.

---

## 6. Multi-Dimension BYOK Embedding Design (`pgvector`)

Because AGBA is a BYOK platform, different workspaces may choose different embedding models:
- **Google Gemini (`gemini-embedding-001` / `text-embedding-004`)** or **Ollama (`nomic-embed-text`)**: `768` dimensions
- **Mistral (`mistral-embed`)** or **BGE-Large**: `1024` dimensions
- **OpenAI (`text-embedding-3-small` / `text-embedding-ada-002`)**: `1536` dimensions

### Evaluation of `pgvector` Storage Approaches

| Approach | How It Works | Pros | Cons |
|---|---|---|---|
| **Option A (Recommended): Dimension-Partitioned Tables (`rag_chunks_768`, `rag_chunks_1024`, `rag_chunks_1536`)** | Parent document metadata lives in Appwrite `rag_documents` (recording `embeddingDimension`). Vector chunks are stored in `rag_document_chunks_768`, `rag_document_chunks_1024`, or `rag_document_chunks_1536`, each with its own typed `vector(N)` column and HNSW index. | Full native HNSW index acceleration (`vector_cosine_ops`), zero precision loss, strict `WHERE workspace_id = $1` filtering. | 3 DDL tables instead of 1 (handled cleanly by a single helper `getChunkTableForDim(dim)`). |
| **Option B: Matryoshka Truncation to 768 dims** | Truncate OpenAI `text-embedding-3-small` (`dimensions: 768` API parameter) so all providers output 768 floats in one table. | Single SQL table. | Does not work for legacy models that don't support Matryoshka dimension reduction (e.g., `mistral-embed` fixed at 1024). |
| **Option C: Untyped `vector` column** | Single column `embedding vector` without dimension constraint. | Single table. | **Cannot build a standard HNSW index** across mixed dimensions without partial expression indexes per dimension anyway. |

**Decision in ADR-007:** Adopt **Option A (Dimension-Partitioned Tables: `768`, `1024`, `1536`)** with `768` as the default table. Every query requires `workspace_id` and queries the table matching the workspace's active embedding dimension.

---

## 7. Appwrite Version Pin & Local / Production Resource Sizing

- **Pinned Image:** `appwrite/appwrite:2.6.0`
- **Companion Images:**
  - `mariadb:10.11` (Appwrite internal metadata store)
  - `redis:7.2-alpine` (Appwrite internal pub/sub, cache, and shared rate-limit store)
  - `pgvector/pgvector:pg16` (`agba-pgvector` for RAG vector embeddings)
  - `axllent/mailpit:v1.21` (Local SMTP & web UI on port `8025` for testing email verification)
- **Resource Requirements:**
  - **Local Dev Minimum:** 2 CPU cores, 4 GB RAM, 2 GB swap.
  - **Production Target (`docs/DEPLOY_COOLIFY.md`):** 2 OCPU, 12 GB RAM ARM64 (`linux/arm64`) or AMD64 server with 4 GB swap file:
    - `appwrite` + workers + MariaDB + Redis: capped at `5.5 GB` total via compose `mem_limit`
    - `agba-pgvector` (PostgreSQL 16): `2.0 GB` (`shared_buffers = 512MB`)
    - `agba-platform` (Node 22 Express + UI): `1.0 GB`
    - Coolify + OS overhead: `~2.5 GB` (leaving `~1.0 GB` safety headroom)

---

## 8. Distributed Rate-Limit & Quota Store + Public Chat BYOK Strictness

1. **No Platform Key Fallback on Public Chat:**
   - `POST /api/public/chat/:workspaceSlug/:appId` will **only** execute using the target workspace's own encrypted BYOK key from `byok_keys`.
   - If the workspace has not configured a BYOK key for the workflow's provider, the endpoint immediately returns `HTTP 422 { error: "Workspace BYOK key required: The owner of this workspace must configure a model API key before public chat can respond." }` — it will **never** spend the platform owner's `GEMINI_API_KEY`.
2. **Multi-Instance Rate Limiting & Daily Quotas:**
   - Rate-limit counters (per-IP: `30 req/min`, per-app: `120 req/min`) and daily workspace quotas (`usage` table: `dailyQuotaLimit` per plan tier) are persisted in the shared backend store (Redis / Postgres / Appwrite `usage` table) rather than process-local memory so multiple container instances enforce a single global limit.
3. **Current Model Defaults (Step 5.3):**
   - Model IDs are user-configurable per node and per key, with verified defaults:
     - **Anthropic:** `claude-sonnet-4-5` / `claude-3-7-sonnet-latest` (configurable in UI; no hardcoded legacy strings)
     - **OpenAI:** `gpt-4o-mini` (configurable to `gpt-4.1`, `o3-mini`, etc.)
     - **Google Gemini:** `gemini-2.5-flash`
     - **Mistral:** `mistral-small-latest`
     - **Ollama:** `llama3.2`
