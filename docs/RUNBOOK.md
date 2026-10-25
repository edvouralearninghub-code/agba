# docs/RUNBOOK.md — Operations, Deployment, Backup & Incident Runbook

> **Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
> **Architecture & Single Source of Truth:** [`docs/adr/ADR-008-single-source-of-truth.md`](./adr/ADR-008-single-source-of-truth.md)  
> **Full-Stack Disaster Recovery (`< 2 Hour` Target):** [`docs/REBUILD.md`](./REBUILD.md)  
> **Coolify Self-Hosting Guide:** [`docs/DEPLOY_COOLIFY.md`](./DEPLOY_COOLIFY.md)

---

## 1. Local, Preview & CI Bootstrapping

```bash
cp .env.example .env
npm install --legacy-peer-deps
npm run report:appwrite-scope # Validates unmodified Appwrite 2.6.1 compose, optional service shedding & backup scope
npm run bootstrap:appwrite    # Validates appwrite.json (and provisions Appwrite 2.6.1 TablesDB when live key is set)
npm run check:no-firestore    # Enforces zero firebase/firestore imports in application code
npm run lint:rules            # Lints retained firestore.rules with @firebase/eslint-plugin-security-rules
npm run verify:phase0         # Runs 45+ unit, license, dev-only seed, and Dirty Dozen checks
npm run dev                   # Starts full-stack Express + Vite server on http://0.0.0.0:3000
```

---

## 2. Production Deployment Topology (`ADR-008` Single Source of Truth)

1. **AGBA Full-Stack Server (`server.ts`):**
   - Multi-arch `Dockerfile` (`linux/amd64` & `linux/arm64`).
   - Build command: `npm run build` | Start command: `npm run start` (`tsx server.ts`).
   - Required secrets in environment vault: `AGBA_MASTER_ENCRYPTION_KEY`, `APPWRITE_API_KEY`, `NEON_POSTGRES_PASSWORD`, `PAYSTACK_SECRET_KEY`.
2. **Appwrite `2.6.1` Single System of Record (`infra/appwrite/docker-compose.yml` or Appwrite Cloud Frankfurt `6adc7d7a000b5b27d58d`):**
   - Official unmodified Appwrite `2.6.1` installer compose (`appwrite/appwrite:2.6.1`, `appwrite/postgres:0.1.0`, `redis:7.4.7-alpine`, `clickhouse/clickhouse-server:26.4.3-alpine`), paired with `infra/agba-extras.docker-compose.yml` (`pgvector/pgvector:pg16`, `redis:7.4.7-alpine`, `axllent/mailpit:v1.21`).
   - Stack memory ceiling target: `<= 9 GB RAM` (with optional shedding of `clickhouse`, `appwrite-browser`, `appwrite-embedding`, and `openruntimes-executor` if needed).
   - Maps each customer workspace to an Appwrite Team (`owner`, `admin`, `member`, `viewer` roles). Firebase Auth is used strictly for identity sign-in (`POST /api/auth/bridge-session`), while Appwrite `2.6.1` is the sole system of record for all 10 `TablesDB` tables and the `rag_files` storage bucket.
3. **PostgreSQL 16 + `pgvector` (`agba-pgvector` or `neon.tech`):**
   - Uses three dimension-specific vector tables (`rag_chunks_768`, `rag_chunks_1024`, `rag_chunks_1536`) with PostgreSQL Row-Level Security (`RLS`) enforced via transactional `SET LOCAL app.workspace_id`.

---

## 3. Health Checks, Uptime Monitoring & Dead-Man's Switch Alerting

- **Liveness Probe (`GET /healthz`):** Fast HTTP 200 process health check (`< 5ms`).
- **Deep Readiness Probe (`GET /readyz` & `GET /api/health`):** Verifies Appwrite `2.6.1` reachability (`/v1/health/version`), `pgvector` RLS planner, Redis/Quota store, and AES-256-GCM BYOK encryption vault without leaking any secrets. Returns `HTTP 503` when `?strict=true` is passed and a required live dependency is unreachable.
- **Public Status Page (`/status` & `GET /api/status`):** Real-time component status, latency telemetry, backup schedule, and alerting bindings.
- **Multi-Layer Alerting:**
  1. **UptimeRobot (Free Commercial Tier, 5-min interval)** + **Better Stack Uptime (Free Tier, 3-min interval)** probing `/readyz`.
  2. **Healthchecks.io (Free Tier)** dead-man's switch pinged by `scripts/backup-agba.sh`.
  3. **Telegram Bot API + Email** for instant mobile push notifications to the owner's phone on any probe failure or backup error.
  4. **Sentry (Developer Free Tier)** for unhandled 5xx exception tracking.

---

## 4. Master Key Rotation (`AGBA_MASTER_ENCRYPTION_KEY`)

1. Provision `AGBA_MASTER_ENCRYPTION_KEY_NEXT` (32 bytes / 64 hex chars via `openssl rand -hex 32`).
2. Run key re-encryption job inside maintenance window:
   - Decrypt each `byok_keys` row in Appwrite `2.6.1` `TablesDB` using old key.
   - Re-encrypt with new 12-byte IV and `AGBA_MASTER_ENCRYPTION_KEY_NEXT`.
   - Verify 16-byte GCM authentication tag before committing.
3. Promote `AGBA_MASTER_ENCRYPTION_KEY_NEXT` to `AGBA_MASTER_ENCRYPTION_KEY` and record event in `audit_log`.

---

## 5. Nightly Encrypted Backup & `< 2 Hour` Disaster Recovery

- **Automated Backup (`./scripts/backup-agba.sh`):** Dumps `appwrite-postgresql`, `agba-pgvector`, `appwrite-uploads`, `.env` encryption keys, and TLS certificates, verifies `SHA256SUMS`, encrypts with GPG `AES256`, uploads to Cloudflare R2 / Backblaze B2 (10 GB free), and pings Healthchecks.io.
- **Automated Restore (`./scripts/restore-agba.sh` & [`docs/REBUILD.md`](./REBUILD.md)):** Full-stack restore and verification procedure.
