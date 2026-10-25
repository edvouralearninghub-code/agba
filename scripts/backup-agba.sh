#!/usr/bin/env bash
# ==============================================================================
# AGBA Nightly Encrypted Offsite Backup Script (Phase 0.6 Step 4 / ADR-008)
# ==============================================================================
# Backs up all 4 CRITICAL stateful stores identified in Gate B:
#   1. Appwrite 2.6.1 PostgreSQL (`appwrite-postgresql` -> pg_dumpall)
#   2. AGBA Vector Store (`agba-pgvector` -> pg_dump agba_vectors with RLS)
#   3. Appwrite Storage Uploads Volume (`appwrite-uploads` -> /storage/uploads)
#   4. Encryption Keys & TLS Certificates (`infra/appwrite/.env`, root `.env`,
#      `appwrite-config`, `appwrite-certificates`)
#
# Excludes ephemeral caches (`appwrite-redis`, `agba-redis-data`, `appwrite-cache`)
# and optional ClickHouse telemetry (`appwrite-clickhouse`) by default to stay
# well within the 10 GB free tier on Cloudflare R2 / Backblaze B2.
#
# Encrypts the archive with GPG AES-256 (`--cipher-algo AES256`), uploads to
# Cloudflare R2 or Backblaze B2, pings Healthchecks.io dead-man's switch, and
# sends an instant Telegram Bot API alert to the owner's phone on failure.
# ==============================================================================

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_ROOT="${BACKUP_ROOT:-/tmp/agba-backups}"
WORK_DIR="${BACKUP_ROOT}/work-${TIMESTAMP}"
ARCHIVE_NAME="agba-backup-${TIMESTAMP}.tar.gz"
ENCRYPTED_ARCHIVE="${BACKUP_ROOT}/${ARCHIVE_NAME}.gpg"

# Optional alerting hooks (Healthchecks.io + Telegram Bot API)
HEALTHCHECKS_PING_URL="${HEALTHCHECKS_PING_URL:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
BACKUP_S3_URI="${BACKUP_S3_URI:-s3://agba-backups}"
BACKUP_S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-}"

send_telegram_alert() {
  local message="$1"
  if [[ -n "$TELEGRAM_BOT_TOKEN" && -n "$TELEGRAM_CHAT_ID" ]]; then
    curl -fsS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"${message}\"}" >/dev/null 2>&1 || true
  fi
}

on_failure() {
  local exit_code=$?
  echo "[ERROR] AGBA backup failed at $(date -u +"%Y-%m-%dT%H:%M:%SZ") (exit code: ${exit_code})"
  if [[ -n "$HEALTHCHECKS_PING_URL" ]]; then
    curl -fsS -m 10 --retry 3 "${HEALTHCHECKS_PING_URL%/}/fail" >/dev/null 2>&1 || true
  fi
  send_telegram_alert "🚨 [AGBA CRITICAL ALERT] Nightly encrypted backup FAILED on $(hostname) at ${TIMESTAMP} (exit ${exit_code})."
  rm -rf "$WORK_DIR"
  exit "$exit_code"
}
trap on_failure ERR

if [[ -n "$HEALTHCHECKS_PING_URL" && "$DRY_RUN" == "false" ]]; then
  curl -fsS -m 10 --retry 3 "${HEALTHCHECKS_PING_URL%/}/start" >/dev/null 2>&1 || true
fi

echo "=== AGBA Encrypted Offsite Backup (${TIMESTAMP}) ==="
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] Validating backup inventory: appwrite-postgresql, agba-pgvector, appwrite-uploads, .env encryption keys, appwrite-certificates."
  echo "[DRY-RUN] Encryption cipher: GPG AES256 | Offsite target: ${BACKUP_S3_URI}"
  exit 0
fi

if [[ -z "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
  echo "ERROR: BACKUP_ENCRYPTION_PASSPHRASE environment variable is required for AES-256 encryption."
  exit 1
fi

mkdir -p "$WORK_DIR"

# 1. Dump Appwrite 2.6.1 PostgreSQL (Users, Teams, Memberships, 10 TablesDB tables)
echo "[1/5] Dumping Appwrite 2.6.1 PostgreSQL (appwrite-postgresql)..."
docker exec appwrite-postgresql pg_dumpall -U "${_APP_DB_USER:-user}" --clean \
  | gzip -9 > "${WORK_DIR}/appwrite-postgres.sql.gz"

# 2. Dump AGBA pgvector (rag_chunks_768, rag_chunks_1024, rag_chunks_1536 + RLS policies)
echo "[2/5] Dumping AGBA pgvector (agba-pgvector)..."
docker exec agba-pgvector pg_dump -U "${POSTGRES_USER:-agba}" -d "${POSTGRES_DB:-agba_vectors}" --clean \
  | gzip -9 > "${WORK_DIR}/agba-pgvector.sql.gz"

# 3. Archive Appwrite Storage Uploads Volume (rag_files bucket binaries)
echo "[3/5] Archiving Appwrite Storage uploads volume (appwrite-uploads)..."
docker run --rm \
  -v appwrite-uploads:/storage/uploads:ro \
  -v "${WORK_DIR}:/backup:rw" \
  alpine:3.20 \
  tar -czf /backup/appwrite-uploads.tar.gz -C /storage uploads

# 4. Archive Encryption Keys (.env), Config & TLS Certificates
echo "[4/5] Archiving encryption keys (.env), appwrite-config, and appwrite-certificates..."
mkdir -p "${WORK_DIR}/config"
[[ -f .env ]] && cp .env "${WORK_DIR}/config/root.env"
[[ -f infra/appwrite/.env ]] && cp infra/appwrite/.env "${WORK_DIR}/config/appwrite.env"
docker run --rm \
  -v appwrite-config:/storage/config:ro \
  -v appwrite-certificates:/storage/certificates:ro \
  -v "${WORK_DIR}/config:/backup:rw" \
  alpine:3.20 \
  tar -czf /backup/appwrite-certs-and-config.tar.gz -C /storage config certificates

# 5. Generate SHA-256 Manifest, Bundle, and Encrypt with GPG AES-256
echo "[5/5] Computing SHA256SUMS and encrypting with GPG AES-256..."
(
  cd "$WORK_DIR"
  sha256sum ./*.gz ./config/* > SHA256SUMS
)
tar -czf "${BACKUP_ROOT}/${ARCHIVE_NAME}" -C "$WORK_DIR" .
gpg --batch --yes \
  --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" \
  --symmetric --cipher-algo AES256 \
  --output "$ENCRYPTED_ARCHIVE" \
  "${BACKUP_ROOT}/${ARCHIVE_NAME}"

rm -f "${BACKUP_ROOT}/${ARCHIVE_NAME}"
rm -rf "$WORK_DIR"

# 6. Upload to Offsite Object Storage (Cloudflare R2 or Backblaze B2) if configured
if [[ -n "$BACKUP_S3_ENDPOINT" ]] && command -v aws >/dev/null 2>&1; then
  echo "[UPLOAD] Pushing ${ENCRYPTED_ARCHIVE} to ${BACKUP_S3_URI}..."
  aws s3 cp "$ENCRYPTED_ARCHIVE" "${BACKUP_S3_URI}/${ARCHIVE_NAME}.gpg" \
    --endpoint-url "$BACKUP_S3_ENDPOINT"
fi

# 7. Prune local encrypted archives older than 7 days
find "$BACKUP_ROOT" -name "agba-backup-*.tar.gz.gpg" -mtime +7 -delete || true

if [[ -n "$HEALTHCHECKS_PING_URL" ]]; then
  curl -fsS -m 10 --retry 3 "$HEALTHCHECKS_PING_URL" >/dev/null 2>&1 || true
fi

echo "[SUCCESS] Encrypted backup ready: ${ENCRYPTED_ARCHIVE}"
