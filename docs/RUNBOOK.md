# docs/RUNBOOK.md — Operations, Deployment, Backup & Incident Runbook

> Owner: Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria

---

## 1. Local & Preview Bootstrapping

```bash
cp .env.example .env
npm install
npm run verify:phase0   # Must exit 0 before starting or deploying
npm run dev             # Starts full-stack server on http://0.0.0.0:3000
```

---

## 2. Production Deployment Topology

1. **Web & API Gateway (Vercel / Cloud Run):**
   - Build command: `npm run build`
   - Start command: `npm run start` (`node server.ts` or `tsx server.ts`)
   - Required secrets in environment vault: `AGBA_MASTER_ENCRYPTION_KEY`, `GEMINI_API_KEY`, `APPWRITE_API_KEY`, `DATABASE_URL`, `PAYSTACK_SECRET_KEY`, `NOVU_API_KEY`.
2. **Self-Hosted Appwrite (Railway / Ubuntu VPS):**
   - Run Appwrite behind TLS with `APPWRITE_PROJECT_ID=agba-core`.
   - Map each customer workspace to an Appwrite Team (`owner`, `admin`, `member`, `viewer` roles).
3. **Neon Postgres (`pgvector`):**
   - Enforce SSL (`?sslmode=require`).
   - Run `CREATE EXTENSION IF NOT EXISTS vector;` and apply `rag_document_chunks` composite index `(workspace_id)` + HNSW index.

---

## 3. Master Key Rotation (`AGBA_MASTER_ENCRYPTION_KEY`)

1. Provision `AGBA_MASTER_ENCRYPTION_KEY_NEXT` (32 bytes / 64 hex chars).
2. Run key re-encryption job inside maintenance window:
   - Decrypt each `model_connections` record using old key.
   - Re-encrypt with new 12-byte IV and `AGBA_MASTER_ENCRYPTION_KEY_NEXT`.
   - Verify authentication tag before committing.
3. Promote `AGBA_MASTER_ENCRYPTION_KEY_NEXT` to `AGBA_MASTER_ENCRYPTION_KEY` and record event in `audit_logs`.

---

## 4. Backup & Restore Procedures

- **Appwrite MariaDB & Storage Volumes:** Daily automated encrypted snapshots retained for 30 days. Test restore monthly into an isolated staging project.
- **Neon Postgres (`pgvector`):** Point-in-Time Restore (PITR) enabled (7-day window) plus nightly `pg_dump` of `rag_document_chunks`.
- **Incident Response (Suspected Key or Tenant Issue):**
  1. Immediately revoke affected workspace API token or rotate `AGBA_MASTER_ENCRYPTION_KEY`.
  2. Inspect structured `audit_logs` filtered by `workspace_id`.
  3. Run `npm run verify:phase0` to confirm tenant boundary invariants.
