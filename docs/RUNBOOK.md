# docs/RUNBOOK.md — Operations, Deployment, Backup & Incident Runbook

> **Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
> **Coolify Self-Hosting Guide:** [`docs/DEPLOY_COOLIFY.md`](./DEPLOY_COOLIFY.md)

---

## 1. Local & Preview Bootstrapping

```bash
cp .env.example .env
npm install
npm run bootstrap:appwrite   # Validates appwrite.json (and provisions Appwrite 2.6.0 TablesDB when live key is set)
npm run lint:rules           # Lints firestore.rules with @firebase/eslint-plugin-security-rules
npm run verify:phase0        # Must exit 0 before starting or deploying
npm run dev                  # Starts full-stack server on http://0.0.0.0:3000
```

---

## 2. Production Deployment Topology (Coolify on 2 OCPU / 12 GB RAM ARM)

1. **AGBA Full-Stack Container (`agba-platform`, `mem_limit: 768m`):**
   - Multi-arch `Dockerfile` (`linux/amd64` & `linux/arm64`).
   - Build command: `npm run build` | Start command: `npm run start` (`tsx server.ts`).
   - Required secrets in environment vault: `AGBA_MASTER_ENCRYPTION_KEY`, `APPWRITE_API_KEY`, `NEON_POSTGRES_PASSWORD`, `PAYSTACK_SECRET_KEY`.
2. **Self-Hosted Appwrite `2.6.0` (`infra/appwrite/docker-compose.yml`):**
   - Runs `appwrite/appwrite:2.6.0` (`TablesDB` engine), `mariadb:10.11`, `redis:7.2-alpine`, and `axllent/mailpit:v1.21` with strict container `mem_limit` caps totaling ~5.7 GB RAM.
   - Maps each customer workspace to an Appwrite Team (`owner`, `admin`, `member`, `viewer` roles) while keeping Firebase Auth & Cloud Firestore synced in parallel.
3. **PostgreSQL 16 + `pgvector` (`agba-pgvector` or `neon.tech`):**
   - Uses three dimension-specific vector tables (`rag_chunks_768`, `rag_chunks_1024`, `rag_chunks_1536`) with composite `workspace_id` + HNSW cosine indexes.

---

## 3. Master Key Rotation (`AGBA_MASTER_ENCRYPTION_KEY`)

1. Provision `AGBA_MASTER_ENCRYPTION_KEY_NEXT` (32 bytes / 64 hex chars via `openssl rand -hex 32`).
2. Run key re-encryption job inside maintenance window:
   - Decrypt each `byok_keys` row in Appwrite `TablesDB` / local vault using old key.
   - Re-encrypt with new 12-byte IV and `AGBA_MASTER_ENCRYPTION_KEY_NEXT`.
   - Verify 16-byte GCM authentication tag before committing.
3. Promote `AGBA_MASTER_ENCRYPTION_KEY_NEXT` to `AGBA_MASTER_ENCRYPTION_KEY` and record event in `audit_log`.

---

## 4. Backup & Restore Procedures

- **Appwrite MariaDB, Storage Volumes & `pgvector`:** Nightly AES-256 encrypted archives (`mysqldump` + `pg_dump` + `/storage/uploads`) pushed to Cloudflare R2 (see `docs/DEPLOY_COOLIFY.md` Section 5).
- **Incident Response (Suspected Key or Tenant Issue):**
  1. Immediately revoke affected workspace API token or rotate `AGBA_MASTER_ENCRYPTION_KEY`.
  2. Inspect `audit_log` rows in Appwrite `TablesDB` filtered by `workspace_id`.
  3. Run `npm run verify:phase0` to confirm all tenant boundary and Dirty Dozen invariants pass.
