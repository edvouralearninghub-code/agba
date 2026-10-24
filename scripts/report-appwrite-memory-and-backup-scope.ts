import fs from 'node:fs';
import path from 'node:path';

export interface OptionalServiceSheddingSpec {
  service: string;
  image: string;
  defaultStatusIn261: 'Enabled by default' | 'Opt-in profile (embedding)';
  estimatedRamSavedIfRemoved: string;
  usedByAgbaPhase06: boolean;
  consequencesOfRemoval: string;
  howToDisableIfStackExceeds9Gb: string;
}

export interface BackupDataTargetSpec {
  component: string;
  serviceOrVolume: string;
  composeFile: string;
  criticality: 'CRITICAL (Must Back Up)' | 'HIGH (Recommended)' | 'OPTIONAL (Metrics Only)' | 'EPHEMERAL (Do Not Back Up)';
  whatDataItHolds: string;
  backupMethod: string;
}

/**
 * Detailed report of which optional Appwrite 2.6.1 services can be removed if the stack
 * exceeds the 9 GB RAM budget, along with exact operational consequences.
 */
export const OPTIONAL_SERVICES_SHEDDING_REPORT: OptionalServiceSheddingSpec[] = [
  {
    service: 'appwrite-embedding',
    image: 'appwrite/embedding:0.3.1',
    defaultStatusIn261: 'Opt-in profile (embedding)',
    estimatedRamSavedIfRemoved: '~600 MB - 1.5 GB (UNVERIFIED until measured in Docker)',
    usedByAgbaPhase06: false,
    consequencesOfRemoval:
      'None for AGBA. Appwrite 2.6.1 already places `appwrite-embedding` behind `profiles: [embedding]`, so it does NOT start unless `--profile embedding` is passed. AGBA uses workspace BYOK keys (Gemini/OpenAI/Mistral) and `agba-pgvector` for embeddings.',
    howToDisableIfStackExceeds9Gb:
      'Already disabled by default (do not pass `--profile embedding` to `docker compose up`).',
  },
  {
    service: 'appwrite-browser',
    image: 'appwrite/browser:0.3.6',
    defaultStatusIn261: 'Enabled by default',
    estimatedRamSavedIfRemoved: '~500 MB - 1.2 GB Chromium headless pool (UNVERIFIED until measured in Docker)',
    usedByAgbaPhase06: false,
    consequencesOfRemoval:
      'Disables server-side headless Chromium URL screenshot capture (`/v1/avatars/screenshots` and Console site preview thumbnails). Core Auth, Teams, TablesDB, and Storage `rag_files` are 100% unaffected.',
    howToDisableIfStackExceeds9Gb:
      'Run `docker compose stop appwrite-browser` or set `deploy.replicas: 0` for `appwrite-browser` in a Docker Compose override file.',
  },
  {
    service: 'openruntimes-executor & orchestrator',
    image: 'openruntimes/executor:1.1.2 + ghcr.io/open-runtimes/orchestrator/orchestrator:2.2.4',
    defaultStatusIn261: 'Enabled by default',
    estimatedRamSavedIfRemoved: '~350 MB - 900 MB + runtime child containers (UNVERIFIED until measured in Docker)',
    usedByAgbaPhase06: false,
    consequencesOfRemoval:
      'Disables Appwrite Cloud Functions (`/v1/functions`) and Appwrite Sites build execution. AGBA executes AI workflows, RAG pipelines, and Paystack webhooks in the Express server (`server.ts`), so Auth, Teams, TablesDB, and Storage continue working normally.',
    howToDisableIfStackExceeds9Gb:
      'Set `_APP_FUNCTIONS_RUNTIMES=` and `_APP_SITES_RUNTIMES=` to empty in `infra/appwrite/.env` and stop `openruntimes-executor` and `orchestrator`.',
  },
  {
    service: 'clickhouse',
    image: 'clickhouse/clickhouse-server:26.4.3-alpine',
    defaultStatusIn261: 'Enabled by default',
    estimatedRamSavedIfRemoved: '~1.0 GB - 2.5 GB (UNVERIFIED until measured in Docker)',
    usedByAgbaPhase06: false,
    consequencesOfRemoval:
      'Disables Appwrite Console request/bandwidth/execution analytics graphs (`worker-stats-usage` and `worker-stats-resources`). AGBA tracks its own per-workspace quota and usage in Redis (`agba-redis`) and the `agba_core.usage` TablesDB table. If ClickHouse is stopped, `_APP_USAGE_STATS=disabled` MUST be set in `infra/appwrite/.env` so Appwrite workers do not queue or retry usage flushes.',
    howToDisableIfStackExceeds9Gb:
      'Set `_APP_USAGE_STATS=disabled` in `infra/appwrite/.env`, recreate `appwrite` / `appwrite-worker`, and stop `clickhouse`.',
  },
];

/**
 * Complete inventory of which services and volumes hold stateful data to back up.
 */
export const STATEFUL_BACKUP_DATA_INVENTORY: BackupDataTargetSpec[] = [
  {
    component: 'Appwrite Core Relational Database',
    serviceOrVolume: 'Service: `postgresql` (`appwrite/postgres:0.1.0`) / Volume: `appwrite-postgresql`',
    composeFile: 'infra/appwrite/docker-compose.yml',
    criticality: 'CRITICAL (Must Back Up)',
    whatDataItHolds:
      'All Appwrite internal tables (`_console`), Users, Sessions, Teams & Memberships (`owner`/`admin`/`member`/`viewer`), Storage file metadata, and all 10 `agba_core` TablesDB tables (`workspaces`, `workflows`, `free_stack_entries`, `byok_keys`, `rag_documents`, `webhook_events`, `usage`, `audit_log`, `identity_links`, `admins`).',
    backupMethod:
      '`docker exec appwrite-postgresql pg_dumpall -U appwrite --clean` -> gzip -> GPG AES-256 encrypt -> upload to R2/B2.',
  },
  {
    component: 'AGBA Vector Embeddings Database',
    serviceOrVolume: 'Service: `agba-pgvector` (`pgvector/pgvector:pg16`) / Volume: `agba-pgvector-data`',
    composeFile: 'infra/agba-extras.docker-compose.yml',
    criticality: 'CRITICAL (Must Back Up)',
    whatDataItHolds:
      'Multi-dimension RAG document chunks and embeddings (`rag_chunks_768`, `rag_chunks_1024`, `rag_chunks_1536`) and PostgreSQL Row-Level Security (`RLS`) tenant isolation policies.',
    backupMethod:
      '`docker exec agba-pgvector pg_dump -U agba -d agba_vectors --clean` -> gzip -> GPG AES-256 encrypt -> upload to R2/B2.',
  },
  {
    component: 'Appwrite Uploaded Files Volume',
    serviceOrVolume: 'Volume: `appwrite-uploads` (mounted at `/storage/uploads`)',
    composeFile: 'infra/appwrite/docker-compose.yml',
    criticality: 'CRITICAL (Must Back Up)',
    whatDataItHolds:
      'Raw binary files (`.pdf`, `.docx`, `.txt`, `.md`) uploaded by tenants to the `rag_files` Appwrite Storage bucket.',
    backupMethod:
      'Tar archive of `/storage/uploads` (`docker run --rm -v appwrite-uploads:/uploads:ro alpine tar -czf - /uploads`) -> GPG AES-256 encrypt -> upload to R2/B2.',
  },
  {
    component: 'Encryption Keys & Environment Config',
    serviceOrVolume: 'Files: `infra/appwrite/.env`, root `.env`, Volume: `appwrite-config` (`/storage/config`)',
    composeFile: 'infra/appwrite/docker-compose.yml',
    criticality: 'CRITICAL (Must Back Up)',
    whatDataItHolds:
      '`_APP_OPENSSL_KEY_V1` (encrypts Appwrite Storage files and internal secrets) and `AGBA_MASTER_ENCRYPTION_KEY` (encrypts BYOK API keys in `byok_keys`). Without these keys, database and file backups cannot be decrypted.',
    backupMethod:
      'Include `.env` files in the GPG AES-256 encrypted backup bundle AND store master keys in owner password manager (1Password / Bitwarden).',
  },
  {
    component: 'TLS Certificates Volume',
    serviceOrVolume: 'Volume: `appwrite-certificates` (mounted at `/storage/certificates`)',
    composeFile: 'infra/appwrite/docker-compose.yml',
    criticality: 'HIGH (Recommended)',
    whatDataItHolds:
      'Let\'s Encrypt ACME TLS certificates managed by Traefik and `appwrite-worker`. Can be re-issued on rebuild, but backing up prevents Let\'s Encrypt rate-limit lockouts during disaster recovery.',
    backupMethod: 'Include `/storage/certificates` in nightly encrypted volume archive.',
  },
  {
    component: 'Appwrite ClickHouse Usage & Telemetry DB',
    serviceOrVolume: 'Service: `clickhouse` (`clickhouse/clickhouse-server:26.4.3-alpine`) / Volume: `appwrite-clickhouse`',
    composeFile: 'infra/appwrite/docker-compose.yml',
    criticality: 'OPTIONAL (Metrics Only)',
    whatDataItHolds:
      'Time-series HTTP request counters, bandwidth metrics, and Console analytics charts (`/var/lib/clickhouse`). Holds ZERO tenant documents, credentials, or billing records (authoritative billing & quotas live in `postgresql` `agba_core.webhook_events` and `agba_core.usage`).',
    backupMethod:
      'Optional weekly snapshot or excluded from critical R2/B2 quota to stay well within the 10 GB free storage tier.',
  },
  {
    component: 'Redis Caches, Build Scratch & Import Temp Volumes',
    serviceOrVolume: 'Volumes: `appwrite-redis`, `agba-redis-data`, `appwrite-cache`, `appwrite-imports`, `appwrite-builds`',
    composeFile: 'infra/appwrite/docker-compose.yml + infra/agba-extras.docker-compose.yml',
    criticality: 'EPHEMERAL (Do Not Back Up)',
    whatDataItHolds:
      'Pub/sub queues, short-lived per-minute rate-limit counters (flushed daily to `agba_core.usage`), and temporary build/cache artifacts.',
    backupMethod: 'None required; rebuilt automatically at container startup.',
  },
];

export function verifyComposeAgainstOfficial261Structure(composePath: string): {
  passed: boolean;
  serviceCount: number;
  services: string[];
  details: string[];
} {
  const content = fs.readFileSync(composePath, 'utf8');
  const details: string[] = [];

  const hasAppwriteImageVar = content.includes('image: ${_APP_IMAGE:-appwrite/appwrite}:${_APP_VERSION:-latest}');
  const hasPostgresService = /^  postgresql:\n/m.test(content) && content.includes('image: appwrite/postgres:0.1.0');
  const hasNoMariaOrMongo = !/^  mariadb:\n/m.test(content) && !/^  mongodb:\n/m.test(content);
  const hasNoSeparateProfileServices = !content.includes('- separate');
  const hasHealthyPostgresDep =
    content.includes('postgresql:\n        condition: service_healthy');

  const serviceMatches = Array.from(content.matchAll(/^  ([a-z0-9-]+):$/gm)).map((m) => m[1]);
  const expectedServices = [
    'traefik',
    'appwrite',
    'appwrite-console',
    'appwrite-realtime',
    'appwrite-mqtt',
    'appwrite-worker',
    'appwrite-task-scheduler',
    'appwrite-task-maintenance',
    'appwrite-task-interval',
    'appwrite-browser',
    'appwrite-autogravity',
    'appwrite-exiftool',
    'clickhouse',
    'appwrite-geo',
    'openruntimes-executor',
    'orchestrator',
    'postgresql',
    'appwrite-embedding',
    'redis',
  ];

  const servicesMatch = expectedServices.every((s) => serviceMatches.includes(s));

  details.push(`Uses official image interpolation (\${_APP_IMAGE}: \${_APP_VERSION}): ${hasAppwriteImageVar}`);
  details.push(`Retains official default postgresql (appwrite/postgres:0.1.0): ${hasPostgresService}`);
  details.push(`Strips mariadb & mongodb services/volumes: ${hasNoMariaOrMongo}`);
  details.push(`Strips separate-topology profile services: ${hasNoSeparateProfileServices}`);
  details.push(`Rewrites depends_on with postgresql service_healthy: ${hasHealthyPostgresDep}`);
  details.push(`Contains all 19 official combined-topology services: ${servicesMatch}`);

  const passed =
    hasAppwriteImageVar &&
    hasPostgresService &&
    hasNoMariaOrMongo &&
    hasNoSeparateProfileServices &&
    hasHealthyPostgresDep &&
    servicesMatch;

  return {
    passed,
    serviceCount: expectedServices.length,
    services: expectedServices,
    details,
  };
}

function main() {
  const composePath = path.join(process.cwd(), 'infra/appwrite/docker-compose.yml');
  console.log('=== AGBA Appwrite 2.6.1 Compose Structural Check, Optional Services & Backup Report ===\n');

  const check = verifyComposeAgainstOfficial261Structure(composePath);
  for (const d of check.details) {
    console.log(`  [CHECK] ${d}`);
  }
  if (!check.passed) {
    console.error('\nFAIL: infra/appwrite/docker-compose.yml does not match official Appwrite 2.6.1 Generator structure.');
    process.exit(1);
  }
  console.log(`\n[PASS] infra/appwrite/docker-compose.yml matches official Appwrite 2.6.1 Generator (${check.serviceCount} services).\n`);

  console.log('--- 1. OPTIONAL SERVICES SHEDDING REPORT (IF STACK EXCEEDS 9 GB RAM CEILING) ---');
  for (const item of OPTIONAL_SERVICES_SHEDDING_REPORT) {
    console.log(`* ${item.service} (${item.image}) [${item.defaultStatusIn261}]`);
    console.log(`  - Estimated RAM Saved : ${item.estimatedRamSavedIfRemoved}`);
    console.log(`  - Consequences        : ${item.consequencesOfRemoval}`);
    console.log(`  - How to Disable      : ${item.howToDisableIfStackExceeds9Gb}`);
  }

  console.log('\n--- 2. STATEFUL SERVICES & VOLUMES BACKUP INVENTORY ---');
  for (const b of STATEFUL_BACKUP_DATA_INVENTORY) {
    console.log(`* [${b.criticality}] ${b.component} (${b.serviceOrVolume})`);
    console.log(`  - Data Held     : ${b.whatDataItHolds}`);
    console.log(`  - Backup Method : ${b.backupMethod}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
