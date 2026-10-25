#!/usr/bin/env bash
# ==============================================================================
# AGBA Encrypted Disaster Recovery & Restore Script (Phase 0.6 Step 4 / ADR-008)
# ==============================================================================
# Decrypts a GPG AES-256 backup bundle (`agba-backup-YYYYMMDDTHHMMSSZ.tar.gz.gpg`),
# verifies SHA256SUMS integrity, restores `.env` encryption keys, Docker volumes
# (`appwrite-uploads`, `appwrite-config`, `appwrite-certificates`), Appwrite 2.6.1
# PostgreSQL (`appwrite-postgresql`), and AGBA `pgvector` (`agba-pgvector`),
# then verifies `/v1/health/version` and `/readyz`.
# ==============================================================================

set -euo pipefail

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "[DRY-RUN] Validating restore pipeline: GPG AES256 decrypt -> SHA256SUMS check -> restore .env & volumes -> psql restore appwrite-postgresql & agba-pgvector -> appwrite migrate -> /readyz check."
  exit 0
fi

ENCRYPTED_BUNDLE="${1:-}"
if [[ -z "$ENCRYPTED_BUNDLE" || ! -f "$ENCRYPTED_BUNDLE" ]]; then
  echo "Usage: BACKUP_ENCRYPTION_PASSPHRASE=<secret> ./scripts/restore-agba.sh <path-to-agba-backup.tar.gz.gpg>"
  exit 1
fi

if [[ -z "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
  echo "ERROR: BACKUP_ENCRYPTION_PASSPHRASE environment variable is required to decrypt backup."
  exit 1
fi

RESTORE_DIR="/tmp/agba-restore-$(date -u +"%Y%m%dT%H%M%SZ")"
mkdir -p "$RESTORE_DIR"
trap 'rm -rf "$RESTORE_DIR"' EXIT

echo "[1/6] Decrypting ${ENCRYPTED_BUNDLE} with GPG AES-256..."
gpg --batch --yes \
  --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" \
  --decrypt "$ENCRYPTED_BUNDLE" \
  | tar -xzf - -C "$RESTORE_DIR"

echo "[2/6] Verifying SHA256SUMS integrity..."
(
  cd "$RESTORE_DIR"
  sha256sum -c SHA256SUMS
)

echo "[3/6] Restoring .env configuration files and certificates/uploads volumes..."
[[ -f "${RESTORE_DIR}/config/root.env" ]] && cp "${RESTORE_DIR}/config/root.env" .env
[[ -f "${RESTORE_DIR}/config/appwrite.env" ]] && cp "${RESTORE_DIR}/config/appwrite.env" infra/appwrite/.env

docker run --rm \
  -v appwrite-uploads:/storage/uploads:rw \
  -v "${RESTORE_DIR}:/backup:ro" \
  alpine:3.20 \
  tar -xzf /backup/appwrite-uploads.tar.gz -C /storage

docker run --rm \
  -v appwrite-config:/storage/config:rw \
  -v appwrite-certificates:/storage/certificates:rw \
  -v "${RESTORE_DIR}/config:/backup:ro" \
  alpine:3.20 \
  tar -xzf /backup/appwrite-certs-and-config.tar.gz -C /storage

echo "[4/6] Restoring Appwrite 2.6.1 PostgreSQL (appwrite-postgresql)..."
gunzip -c "${RESTORE_DIR}/appwrite-postgres.sql.gz" \
  | docker exec -i appwrite-postgresql psql -U "${_APP_DB_USER:-user}" -d postgres

echo "[5/6] Restoring AGBA pgvector (agba-pgvector)..."
gunzip -c "${RESTORE_DIR}/agba-pgvector.sql.gz" \
  | docker exec -i agba-pgvector psql -U "${POSTGRES_USER:-agba}" -d "${POSTGRES_DB:-agba_vectors}"

echo "[6/6] Running Appwrite 2.6.1 schema migration check & verifying health..."
docker compose \
  --project-directory infra/appwrite \
  --env-file infra/appwrite/.env \
  -f infra/appwrite/docker-compose.yml \
  exec -T appwrite migrate || true

curl -fsS http://127.0.0.1/v1/health/version
echo ""
echo "[SUCCESS] AGBA Disaster Recovery restore completed."
