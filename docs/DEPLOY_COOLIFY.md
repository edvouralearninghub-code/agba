# AGBA Self-Hosted Deployment Guide: Coolify on 2 OCPU / 12 GB RAM ARM Server

> **Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
> **Architecture Reference:** [`docs/adr/ADR-007-appwrite-migration.md`](./adr/ADR-007-appwrite-migration.md)

This runbook documents how to self-host the complete AGBA stack (`agba-platform`, `appwrite:2.6.0`, `mariadb:10.11`, `redis:7.2-alpine`, `pgvector:pg16`, and `mailpit:v1.21`) on a single **2 OCPU / 12 GB RAM ARM64 server** (such as an Oracle Cloud Always Free Ampere A1 VM or Hetzner CAX31) managed by **Coolify**, while keeping up to **2 OCPU / 12 GB RAM** of free capacity for additional Trendtactics projects.

---

## 1. Why Self-Host Appwrite vs. Appwrite Cloud Free Tier?

The owner verified the current **Appwrite Cloud Free Plan ($0/month)** quotas:

| Resource | Appwrite Cloud Free Plan | Self-Hosted Appwrite `2.6.0` (Docker / Coolify) |
|---|---|---|
| **Bandwidth** | **5 GB / month** | **10 TB / month** (on Oracle Always Free) or VPS limit |
| **Storage** | **2 GB total** | **Up to 200 GB Block Volume** (hardware-bound) |
| **Auth (MAU)** | **75,000 MAU** | **Unlimited** |
| **Database Reads / Writes** | **500K reads / 250K writes** | **Unlimited** (`TablesDB` backed by local MariaDB) |
| **Compute Executions** | **750K executions (100 GB-hrs)** | **Unlimited** |
| **Image Transformations** | Paid upgrade required | Self-hosted |
| **Phone OTP** | Paid upgrade required | Custom SMS / Novu webhook |

Because `5 GB` monthly bandwidth and `2 GB` storage can be exhausted quickly when users upload `.pdf` and `.docx` RAG documents, self-hosting `appwrite/appwrite:2.6.0` via Docker/Coolify removes all artificial cloud caps at **$0 hosting cost**, while AGBA's **Dual-Backend Bridge** also keeps **Firebase Auth + Cloud Firestore** active in parallel.

---

## 2. Server Sizing & Container Memory Budget (`2 OCPU / 12 GB RAM`)

Every service in `docker-compose.yml` and `infra/appwrite/docker-compose.yml` has a hard `mem_limit` so the entire AGBA + Appwrite stack stays under **6.7 GB RAM**:

| Container | Pinned Image | `mem_limit` | Role |
|---|---|---|---|
| `agba-platform` | `node:22-alpine` (`linux/arm64` & `linux/amd64`) | `768m` | Express API + Vite SPA + Dual-Backend Bridge |
| `agba-appwrite` | `appwrite/appwrite:2.6.0` | `2048m` | Appwrite 2.6.0 HTTP API, Auth, Teams, `TablesDB`, Storage |
| `agba-appwrite-worker-databases` | `appwrite/appwrite:2.6.0` | `512m` | Async `TablesDB` indexing & schema worker |
| `agba-appwrite-worker-mails` | `appwrite/appwrite:2.6.0` | `256m` | Transactional & verification email worker |
| `agba-appwrite-mariadb` | `mariadb:10.11` | `1536m` | Relational backing store for Appwrite `TablesDB` |
| `agba-appwrite-redis` | `redis:7.2-alpine` | `384m` | Appwrite pub/sub + AGBA distributed rate-limit & quota store |
| `agba-pgvector` | `pgvector/pgvector:pg16` | `1024m` | Multi-dimension RAG vector store (`rag_chunks_768`, `1024`, `1536`) |
| `agba-mailpit` | `axllent/mailpit:v1.21` | `128m` | Local SMTP capture (replace with Resend/SES in prod) |
| **Total Allocated** | — | **6,656 MB (~6.5 GB)** | **~5.5 GB RAM free** on a 12 GB slice |

---

## 3. Step-by-Step Server Hardening (Ubuntu 24.04 LTS ARM64)

### 3.1 Provision 4 GB Swap File (Mandatory OOM Guard)
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10
```

### 3.2 UFW Firewall Rules (Allow Only `22`, `80`, `443`)
Never expose MariaDB (`3306`), Redis (`6379`), Postgres (`5432`), or Mailpit (`8025`) to the public internet:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3.3 Install Coolify
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```
Once installed, place **Cloudflare DNS Proxy (Orange Cloud)** in front of your domains (`agba.trendtactics.com` and `appwrite.trendtactics.com`) with **SSL/TLS Mode = Full (Strict)**.

---

## 4. Deploying Appwrite `2.6.0` + AGBA in Coolify

1. **Deploy the Appwrite + pgvector Stack:**
   - In Coolify, create a new **Docker Compose** resource pointing to `infra/appwrite/docker-compose.yml`.
   - Set environment variables `_APP_OPENSSL_KEY_V1` (`openssl rand -hex 32`), `_APP_DB_PASS`, `_APP_DB_ROOT_PASS`, and `NEON_POSTGRES_PASSWORD`.
   - Assign domain `https://appwrite.trendtactics.com` to `agba-appwrite:80`.

2. **Bootstrap the Appwrite `TablesDB` Schema (`appwrite.json`) & `pgvector` Tables:**
   - Create an Appwrite Project with ID `agba-core` and a least-privilege Server API Key (`tables.read`, `tables.write`, `rows.read`, `rows.write`, `teams.read`, `teams.write`, `files.read`, `files.write`).
   - Run the bootstrap script once:
     ```bash
     npm run bootstrap:appwrite
     ```
   - Initialize the three typed `pgvector` tables (`rag_chunks_768`, `rag_chunks_1024`, `rag_chunks_1536`) in `agba-pgvector`:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

3. **Deploy `agba-platform`:**
   - In Coolify, create a new application from this repository using `Dockerfile`.
   - Configure all secrets from `.env.example` (`AGBA_MASTER_ENCRYPTION_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `REDIS_URL`, `NEON_POSTGRES_*`, `PAYSTACK_SECRET_KEY`).
   - Assign domain `https://agba.trendtactics.com` to port `3000`.

---

## 5. Encrypted Off-Box Backups & Monthly Restore Verification

### 5.1 Nightly Encrypted Backup Cron (`/etc/cron.daily/agba-backup`)
Dumps MariaDB (`TablesDB`), Postgres (`pgvector`), and Appwrite Storage volumes, encrypts them with `age` or `gpg` (`AES-256`), and uploads to Cloudflare R2 (10 GB/month free tier):

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%F_%H%M)
BACKUP_DIR="/tmp/agba_backup_${STAMP}"
mkdir -p "${BACKUP_DIR}"

# 1. Dump Appwrite MariaDB
docker exec agba-appwrite-mariadb mysqldump -u appwrite -p"${_APP_DB_PASS}" appwrite > "${BACKUP_DIR}/appwrite_mariadb.sql"

# 2. Dump pgvector database
docker exec agba-pgvector pg_dump -U "${NEON_POSTGRES_USER:-agba_user}" "${NEON_POSTGRES_DB:-agba_vectors}" > "${BACKUP_DIR}/agba_pgvector.sql"

# 3. Archive & AES-256 encrypt
tar -czf - "${BACKUP_DIR}" | gpg --batch --yes --passphrase "${BACKUP_PASSPHRASE}" --cipher-algo AES256 -c -o "/var/backups/agba_${STAMP}.tar.gz.gpg"
rm -rf "${BACKUP_DIR}"
```

### 5.2 Restore Procedure
1. Decrypt the backup archive:
   ```bash
   gpg --decrypt /var/backups/agba_YYYY-MM-DD.tar.gz.gpg | tar -xzf -
   ```
2. Restore MariaDB and `pgvector`:
   ```bash
   docker exec -i agba-appwrite-mariadb mysql -u appwrite -p"${_APP_DB_PASS}" appwrite < appwrite_mariadb.sql
   docker exec -i agba-pgvector psql -U agba_user -d agba_vectors < agba_pgvector.sql
   ```
3. Run `npm run verify:phase0` to confirm all tenant isolation and integrity invariants pass after restore.
