# SECURITY.md — Binding Security Policy & Threat Model

> **Status:** Binding across all phases of AGBA development (including Phase 0.5 Dual-Backend Bridge).  
> **Target Standard:** OWASP Application Security Verification Standard (ASVS) v4.0.3 Level 2.

---

## 1. Threat Model

AGBA is a multi-tenant AI platform handling user-supplied API keys (BYOK), uploaded documents (RAG), external HTTP tool invocations, public shareable chat endpoints, and subscription webhooks. The primary threat vectors are:

1. **Cross-Tenant Data Leakage (IDOR / Vector Bleed):** Tenant A attempting to read, modify, or retrieve vector embeddings, `TablesDB` rows, or Firestore documents belonging to Tenant B (`workspace_id`).
2. **BYOK Credential Exposure & Platform Key Drain:** Plaintext storage, client-side bundle exposure, log leakage of user model API keys, or unauthenticated Public Chat visitors draining the platform owner's Gemini API key.
3. **Client-Side Role Escalation & Unverified Account Writes:** Malicious clients forging `x-agba-role: owner` headers or mutating workspace resources without a verified email address.
4. **Server-Side Request Forgery (SSRF):** Malicious workflows using the Agent HTTP Tool to probe internal networks (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254` cloud metadata, `::1`).
5. **Indirect Prompt Injection:** Untrusted text inside uploaded RAG documents or web search results attempting to override system instructions or trigger unauthorized tools.
6. **Payment Webhook Spoofing & Replay:** Forged or replayed Paystack webhook payloads attempting unauthorized plan upgrades or double-crediting.
7. **Malicious File Uploads:** Polyglot files, oversized payloads, or path-traversal filenames uploaded to Appwrite Storage (`rag_files`).

---

## 2. Binding Security Controls

### 2.1 Secrets Management
- Never commit secrets, API keys, or private certificates to version control.
- The browser **never** holds an Appwrite API key (`APPWRITE_API_KEY` is server-only with least-privilege scopes).
- All required environment variables are documented in `.env.example`.

### 2.2 BYOK Model Keys (AES-256-GCM) & Strict Public Chat Policy
- All workspace model provider keys are encrypted at rest in the server-only `byok_keys` table using **AES-256-GCM** with a unique 96-bit (12-byte) IV and 128-bit authentication tag per secret, derived from `AGBA_MASTER_ENCRYPTION_KEY`.
- Keys are decrypted **strictly on the server** immediately prior to an outbound model call and discarded from memory afterward.
- **Public Chat (`POST /api/public/chat/:workspaceSlug/:appId`) Strict BYOK Guard:** Public chat endpoints **only** execute using the target workspace's own real BYOK key. They **never** fall back to `process.env.GEMINI_API_KEY` or demo keys (returning HTTP `422` `MissingWorkspaceByokError` if no real workspace key is configured) and enforce per-IP (`20/min`), per-app, and per-workspace daily quotas (HTTP `429`).

### 2.3 Two-Layer Multi-Tenant Isolation (`workspace_id` + Appwrite Teams + Firestore Rules)
- Every database row (`TablesDB` and Firestore) and vector chunk (`rag_chunks_768`, `rag_chunks_1024`, `rag_chunks_1536`) carries a mandatory `workspace_id` attribute.
- **Server-Derived Roles Only:** The Express server (`server.ts`) derives the caller's role (`owner`, `admin`, `member`, `viewer`) strictly from the server-side Appwrite Team membership registry (`WorkspaceMembershipRegistry`), rejecting any client header or body role-escalation attempt with HTTP `403`.
- **Verified Email Gate:** Write operations require a verified email (`emailVerified === true`); unverified accounts are rejected with HTTP `403` (`UnverifiedEmailError`).

### 2.4 Server Input Validation & Firestore Rule Parity
- Every HTTP endpoint and repository method (`src/server/repositories.ts`) validates payloads using strict `zod` `.strict()` schemas (`WorkspaceRowSchema`, `WorkflowRowSchema`, `FreeStackRowSchema`) and `assertImmutableFieldsUnchanged` (`id`, `workspace_id`, `ownerId`, `createdAt`), preserving 100% parity with the 12 Dirty Dozen Firestore rules.

### 2.5 Agent HTTP Tool & SSRF Protection
- Blocks loopback (`127.0.0.0/8`, `::1`, `localhost`), RFC 1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local and cloud metadata addresses (`169.254.0.0/16`, `metadata.google.internal`, `100.100.100.200`), and IPv6 unique local/link-local (`fc00::/7`, `fe80::/10`).
- Enforces a 5,000ms request timeout and 1MB maximum response body size.

### 2.6 File Uploads (`rag_files` Bucket)
- Allowlisted extensions and MIME types only: `.pdf` (`application/pdf`), `.docx` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), `.txt` (`text/plain`), `.md` (`text/markdown`).
- Maximum upload size: 10 MB per file, stored under server-generated UUID v4 storage keys with `fileSecurity: true`.

### 2.7 Prompt Injection Defense
- Retrieved RAG chunks and external web content are wrapped in `<untrusted_context>...</untrusted_context>` delimiters.
- Agent tools execute **only** if the tool ID is explicitly present in the app's server-side `allowedTools` list.

### 2.8 Paystack Webhooks (`webhook_events` Ledger)
- Verifies `x-paystack-signature` using **HMAC-SHA512** over the raw request body with `crypto.timingSafeEqual`.
- Records processed event IDs in the server-only `webhook_events` table (`idx_webhook_event_id` unique index) and stores all monetary amounts in **kobo** (NGN) or **cents** (USD).

---

## 3. OWASP ASVS Level 2 Compliance Matrix

| ASVS Area | Control Summary | Phase 0.5 Status |
|---|---|---|
| V1: Architecture | Dual-Backend (`Appwrite 2.6.0 TablesDB` + `Firestore` + `pgvector`) threat model | **Met** (Documented in `ADR-007` & tested in `scripts/verify-phase0.ts`) |
| V2 / V3: Auth & Sessions | Appwrite Web SDK + Firebase Auth sessions, verified email gate, server-derived roles | **Met** (`UnverifiedEmailError` & anti-role-escalation enforced and tested) |
| V4: Access Control | Server-side RBAC (`owner`, `admin`, `member`, `viewer`) + Appwrite Team row security | **Met** (Tested with automated cross-tenant negative suite) |
| V5: Validation | Strict `zod` `.strict()` schemas + immutable field guards (Dirty Dozen parity) | **Met** |
| V6: Cryptography | AES-256-GCM with 12-byte IV & 16-byte auth tag for BYOK keys in server-only `byok_keys` | **Met** |
| V8: Data Protection | Key masking, zero client-side key exposure, Public Chat strict BYOK guard (HTTP 422) | **Met** |
| V10 / V12: Files & SSRF | Strict MIME/size allowlist, UUID keys in `rag_files`, SSRF IP range blocker | **Met** |
| V13: API & Webhooks | Constant-time HMAC-SHA512 Paystack verification + `webhook_events` idempotency + quotas | **Met** |
