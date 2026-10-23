# SECURITY.md — Binding Security Policy & Threat Model

> **Status:** Binding across all phases of AGBA development.  
> **Target Standard:** OWASP Application Security Verification Standard (ASVS) v4.0.3 Level 2.

---

## 1. Threat Model

AGBA is a multi-tenant AI platform handling user-supplied API keys (BYOK), uploaded documents (RAG), external HTTP tool invocations, and subscription webhooks. The primary threat vectors are:

1. **Cross-Tenant Data Leakage (IDOR / Vector Bleed):** Tenant A attempting to read, modify, or retrieve vector embeddings belonging to Tenant B (`workspace_id`).
2. **BYOK Credential Exposure:** Plaintext storage, client-side bundle exposure, or log leakage of user model API keys (OpenAI, Anthropic, Gemini, Mistral).
3. **Server-Side Request Forgery (SSRF):** Malicious workflows using the Agent HTTP Tool to probe internal networks (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254` cloud metadata, `::1`).
4. **Indirect Prompt Injection:** Untrusted text inside uploaded RAG documents or web search results attempting to override system instructions or trigger unauthorized tools.
5. **Payment Webhook Spoofing & Replay:** Forged or replayed Paystack webhook payloads attempting unauthorized plan upgrades or double-crediting.
6. **Malicious File Uploads:** Polyglot files, oversized payloads, or path-traversal filenames uploaded to storage.

---

## 2. Binding Security Controls

### 2.1 Secrets Management
- Never commit secrets, API keys, or private certificates to version control.
- All required environment variables are documented in `.env.example`.

### 2.2 BYOK Model Keys (AES-256-GCM)
- All workspace model provider keys are encrypted at rest using **AES-256-GCM** with a unique 96-bit (12-byte) IV and 128-bit authentication tag per secret, derived from `AGBA_MASTER_ENCRYPTION_KEY`.
- Keys are decrypted **strictly on the server** immediately prior to an outbound model call and discarded from memory afterward.
- Keys are **never** logged, **never** returned in API responses, and **never** sent to the browser.
- The UI displays only a masked representation showing the prefix and last 4 characters (e.g., `sk-...9f4a`).

### 2.3 Multi-Tenant Isolation (`workspace_id`)
- Every database record and vector embedding chunk carries a mandatory `workspace_id` attribute.
- Server-side data access layers and vector similarity searches require a verified `TenantContext` (`userId`, `workspaceId`, `role`) and enforce `workspace_id` filtering on the server before returning any record.
- Automated tests (`scripts/verify-phase0.ts`) attempt cross-tenant reads, writes, vector queries, and key access and MUST fail with `CrossTenantAccessError (403)`.

### 2.4 Server Input Validation
- Every HTTP endpoint validates request bodies, query parameters, and headers using strict `zod` schemas before executing business logic.

### 2.5 Agent HTTP Tool & SSRF Protection
- The Agent HTTP Tool resolves and validates URLs before connecting:
  - Only `https:` (and explicitly permitted `http:` on public hosts) schemes are allowed.
  - Blocks loopback (`127.0.0.0/8`, `::1`, `localhost`), RFC 1918 private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local and cloud metadata addresses (`169.254.0.0/16`, `metadata.google.internal`, `100.100.100.200`), and IPv6 unique local/link-local (`fc00::/7`, `fe80::/10`).
  - Enforces a strict 5,000ms request timeout and 1MB maximum response body size.

### 2.6 File Uploads
- Allowlisted extensions and MIME types only: `.pdf` (`application/pdf`), `.docx` (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), `.txt` (`text/plain`), `.md` (`text/markdown`).
- Maximum upload size: 10 MB per file.
- Stored under server-generated UUID v4 storage keys; original filenames are sanitized and never executed.

### 2.7 Prompt Injection Defense
- Retrieved RAG chunks and external web content are wrapped in explicit untrusted data delimiters (`<untrusted_context>...</untrusted_context>`) with system-level instructions forbidding instructions inside `<untrusted_context>` from altering system directives or invoking tools.
- Agent tools execute **only** if the tool ID is explicitly present in the app's server-side `allowedTools` list.

### 2.8 Paystack Webhooks
- Verify `x-paystack-signature` using **HMAC-SHA512** over the raw request body with `PAYSTACK_SECRET_KEY` using constant-time comparison (`crypto.timingSafeEqual`).
- Maintain an idempotent `processed_event_ids` ledger so replayed webhook events never double-credit or double-upgrade.
- Store all monetary amounts in the smallest currency unit (**kobo** for NGN, **cents** for USD).

### 2.9 Rate Limiting, Auth & Audit Logging
- Rate limiting applied per user, per workspace, and per published app API key.
- Structured JSON audit logs record key creation/deletion, role changes, and billing events without logging PII or secret values.

---

## 3. OWASP ASVS Level 2 Compliance Matrix & Current Gaps

| ASVS Area | Control Summary | Phase 0 Status |
|---|---|---|
| V1: Architecture | Multi-tenant boundary enforcement & threat model | **Met** (Enforced & tested in `src/server/security.ts`) |
| V2 / V3: Auth & Sessions | Appwrite Teams/Auth session binding, CSRF & cookie security | **Partial** (Simulated local session header in preview; full Appwrite session cookie binding scheduled for Phase 1 deployment) |
| V4: Access Control | Server-side RBAC (`owner`, `admin`, `member`, `viewer`) + `workspace_id` isolation | **Met** (Tested with automated cross-tenant negative suite) |
| V5: Validation | Strict `zod` server schemas on all routes | **Met** |
| V6: Cryptography | AES-256-GCM with 12-byte IV & 16-byte auth tag for BYOK keys | **Met** |
| V8: Data Protection | Key masking, zero client-side key exposure | **Met** |
| V10 / V12: Files & SSRF | Strict MIME/size allowlist, UUID keys, SSRF IP range blocker | **Met** |
| V13: API & Webhooks | Constant-time HMAC-SHA512 Paystack verification + idempotency | **Met** |
