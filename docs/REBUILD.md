# docs/REBUILD.md — Full-Stack Disaster Recovery & `< 2 Hour` Rebuild Runbook

> **Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
> **Architecture Reference:** [`docs/adr/ADR-008-single-source-of-truth.md`](./adr/ADR-008-single-source-of-truth.md)  
> **Target Recovery Time Objective (RTO):** `< 2 hours` from a blank Ubuntu 24.04 LTS host (**`UNVERIFIED` until measured during a live production restore drill**).  
> **Target Recovery Point Objective (RPO):** `<= 24 hours` (nightly AES-256 encrypted backups to Cloudflare R2 / Backblaze B2).

---

## 1. When to Use This Runbook

Use this procedure if:
1. An Oracle Cloud Always Free Ampere A1 VM is ever reclaimed, corrupted, or unreachable.
2. You are migrating AGBA + Self-Hosted Appwrite `2.6.1` to a new VPS or cloud provider.
3. You are executing the quarterly Disaster Recovery restore drill.

---

## 2. Prerequisites Before Starting

Ensure you have access to:
1. **Fresh Linux Host:** Ubuntu 24.04 LTS (`aarch64` or `x86_64`), minimum 12 GB RAM recommended (stack ceiling `<= 9 GB RAM`, **`UNVERIFIED` on production host until measured via `docker stats --no-stream`**).
2. **Git Repository:** `https://github.com/edvouralearninghub-code/agba`
3. **Offsite Encrypted Backup Archive:** Latest `agba-backup-YYYYMMDDTHHMMSSZ.tar.gz.gpg` from Cloudflare R2 or Backblaze B2.
4. **Master Decryption Passphrase:** `BACKUP_ENCRYPTION_PASSPHRASE` stored in the owner's password manager (1Password / Bitwarden).

---

## 3. Step-by-Step Rebuild Procedure (`Target: < 2 Hours — UNVERIFIED`)

### Phase A — Provision Host & Docker Engine (Est. 10–15 mins)
```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg git awscli
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

### Phase B — Clone Repository & Pull Latest Encrypted Backup (Est. 10–15 mins)
```bash
git clone https://github.com/edvouralearninghub-code/agba.git
cd agba

# Download latest encrypted bundle from Cloudflare R2 or Backblaze B2
aws s3 cp s3://agba-backups/latest/agba-backup-latest.tar.gz.gpg /tmp/agba-backup-latest.tar.gz.gpg \
  --endpoint-url "$BACKUP_S3_ENDPOINT"
```

### Phase C — Start Unmodified Appwrite `2.6.1` + AGBA Extras (Est. 15–25 mins)
```bash
cp infra/appwrite/.env.example infra/appwrite/.env
chmod +x infra/appwrite/clickhouse-init.sh scripts/backup-agba.sh scripts/restore-agba.sh

docker compose \
  --project-directory infra/appwrite \
  --env-file infra/appwrite/.env \
  -f infra/appwrite/docker-compose.yml \
  -f infra/agba-extras.docker-compose.yml \
  up -d
```

### Phase D — Decrypt & Restore Stateful Databases, Volumes & Keys (Est. 20–35 mins)
```bash
BACKUP_ENCRYPTION_PASSPHRASE="<from-owner-password-manager>" \
  ./scripts/restore-agba.sh /tmp/agba-backup-latest.tar.gz.gpg
```
This script automatically:
1. Decrypts the archive with GPG `AES256` and verifies `SHA256SUMS`.
2. Restores `.env` (`AGBA_MASTER_ENCRYPTION_KEY`) and `infra/appwrite/.env` (`_APP_OPENSSL_KEY_V1`).
3. Restores `appwrite-uploads` (`rag_files` binary documents), `appwrite-config`, and `appwrite-certificates`.
4. Restores `appwrite-postgresql` (all users, teams, memberships, and 10 `agba_core` `TablesDB` tables).
5. Restores `agba-pgvector` (`rag_chunks_768`, `rag_chunks_1024`, `rag_chunks_1536` + RLS policies).
6. Runs `docker compose exec -T appwrite migrate` and checks `http://127.0.0.1/v1/health/version`.

### Phase E — Start AGBA Express Server, Cut Over DNS & Verify (Est. 15–20 mins)
```bash
npm install --legacy-peer-deps
npm run build
npm run verify:phase0
npm run verify:appwrite-live -- --require-live
```
1. Point Cloudflare DNS `A` record to the new host IP.
2. Verify `GET /healthz` (`HTTP 200`) and `GET /readyz` (`HTTP 200`).
3. Re-enable nightly cron timer:
   ```bash
   (crontab -l 2>/dev/null; echo "15 2 * * * cd $(pwd) && ./scripts/backup-agba.sh >> /var/log/agba-backup.log 2>&1") | crontab -
   ```
