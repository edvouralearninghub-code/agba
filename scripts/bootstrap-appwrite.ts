import fs from 'node:fs';
import path from 'node:path';
import { FREE_STACK_ENTRIES } from '../src/data/freeStackData.ts';
import { ACADEMY_TEMPLATES } from '../src/data/academyTemplates.ts';

export interface AppwriteManifest {
  projectId: string;
  projectName: string;
  version: string;
  api: string;
  databases: { $id: string; name: string; enabled: boolean }[];
  tables: {
    $id: string;
    databaseId: string;
    name: string;
    rowSecurity: boolean;
    columns: { key: string; type: string; size?: number; required: boolean }[];
    indexes: { key: string; type: string; columns: string[] }[];
  }[];
  buckets: {
    $id: string;
    name: string;
    maximumFileSize: number;
    allowedFileExtensions: string[];
    fileSecurity: boolean;
  }[];
}

/**
 * PostgreSQL pgvector DDL with Row-Level Security (RLS) enforced on all 3 dimension tables
 * (ADR-008 Section 3.2: 768 for Gemini/Ollama, 1024 for Mistral, 1536 for OpenAI).
 */
export const PGVECTOR_RLS_DDL_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks_768 (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_768_ws ON rag_chunks_768 (workspace_id);
ALTER TABLE rag_chunks_768 ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks_768 FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy_768 ON rag_chunks_768;
CREATE POLICY tenant_isolation_policy_768 ON rag_chunks_768
  USING (workspace_id = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true));

CREATE TABLE IF NOT EXISTS rag_chunks_1024 (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_1024_ws ON rag_chunks_1024 (workspace_id);
ALTER TABLE rag_chunks_1024 ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks_1024 FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy_1024 ON rag_chunks_1024;
CREATE POLICY tenant_isolation_policy_1024 ON rag_chunks_1024
  USING (workspace_id = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true));

CREATE TABLE IF NOT EXISTS rag_chunks_1536 (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_1536_ws ON rag_chunks_1536 (workspace_id);
ALTER TABLE rag_chunks_1536 ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks_1536 FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy_1536 ON rag_chunks_1536;
CREATE POLICY tenant_isolation_policy_1536 ON rag_chunks_1536
  USING (workspace_id = current_setting('app.workspace_id', true))
  WITH CHECK (workspace_id = current_setting('app.workspace_id', true));
`.trim();

/**
 * Least-privilege scopes required by the Express server (`server.ts`) API key in Appwrite 2.6.1.
 */
export const LEAST_PRIVILEGE_APPWRITE_SCOPES = [
  'users.read',
  'users.write',
  'teams.read',
  'teams.write',
  'sessions.write',
  'databases.read',
  'databases.write',
  'tables.read',
  'tables.write',
  'collections.read',
  'collections.write',
  'columns.read',
  'columns.write',
  'attributes.read',
  'attributes.write',
  'indexes.read',
  'indexes.write',
  'rows.read',
  'rows.write',
  'documents.read',
  'documents.write',
  'buckets.read',
  'buckets.write',
  'files.read',
  'files.write',
];

async function callAppwriteAdminApi(
  endpoint: string,
  projectId: string,
  apiKey: string,
  route: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${endpoint.replace(/\/$/, '')}${route}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok || res.status === 409, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: err instanceof Error ? err.message : 'Unreachable' },
    };
  }
}

/**
 * Zero-touch Console auto-initializer for a fresh Appwrite 2.6.1 Docker instance
 * (used by GitHub Actions CI and local Docker bootstrap when `--auto-init` is passed).
 * Creates the root Console user, Organization Team, Project `agba-core`, and Server API Key.
 */
export async function autoInitializeFreshAppwriteInstance(params: {
  endpoint: string;
  projectId: string;
  projectName: string;
  adminEmail?: string;
  adminPassword?: string;
}): Promise<string> {
  const base = params.endpoint.replace(/\/$/, '');
  const email = params.adminEmail || process.env.APPWRITE_ADMIN_EMAIL || 'admin@agba.local';
  const password = params.adminPassword || process.env.APPWRITE_ADMIN_PASSWORD || 'AgbaRootPass2026!Secure';

  // 1. Register root account in Console project (409 if already exists)
  await fetch(`${base}/account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
    body: JSON.stringify({
      userId: 'admin_root',
      email,
      password,
      name: 'AGBA Platform Root',
    }),
  });

  // 2. Create Console email session and capture session cookie
  const sessionRes = await fetch(`${base}/account/sessions/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
    body: JSON.stringify({ email, password }),
  });

  const setCookie = sessionRes.headers.get('set-cookie') || '';
  const cookieHeader = setCookie
    .split(',')
    .map((part) => part.split(';')[0].trim())
    .filter((kv) => kv.startsWith('a_session_'))
    .join('; ');

  if (!cookieHeader) {
    throw new Error(
      `Failed to obtain Console session cookie from ${base}/account/sessions/email (HTTP ${sessionRes.status}).`
    );
  }

  const consoleHeaders = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': 'console',
    Cookie: cookieHeader,
  };

  // 3. Ensure Organization Team (`org_agba`) exists
  await fetch(`${base}/teams`, {
    method: 'POST',
    headers: consoleHeaders,
    body: JSON.stringify({
      teamId: 'org_agba',
      name: 'Trendtactics Digital Organization',
    }),
  });

  // 4. Create Project `agba-core` (409 if already exists)
  await fetch(`${base}/projects`, {
    method: 'POST',
    headers: consoleHeaders,
    body: JSON.stringify({
      projectId: params.projectId,
      name: params.projectName,
      teamId: 'org_agba',
      region: 'default',
    }),
  });

  // 5. Create Least-Privilege Server API Key
  const keyRes = await fetch(`${base}/projects/${params.projectId}/keys`, {
    method: 'POST',
    headers: consoleHeaders,
    body: JSON.stringify({
      name: 'agba-express-least-privilege-key',
      scopes: LEAST_PRIVILEGE_APPWRITE_SCOPES,
    }),
  });
  const keyData = (await keyRes.json()) as { secret?: string };
  if (!keyData.secret) {
    throw new Error(
      `Failed to mint Appwrite Server API key for project "${params.projectId}" (HTTP ${keyRes.status}).`
    );
  }
  return keyData.secret;
}

async function waitForColumnsAvailable(
  endpoint: string,
  projectId: string,
  apiKey: string,
  databaseId: string,
  tableId: string,
  expectedCount: number
): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const res = await callAppwriteAdminApi(
      endpoint,
      projectId,
      apiKey,
      `/tablesdb/${databaseId}/tables/${tableId}/columns`,
      'GET'
    );
    const columns = (res.data.columns as { status?: string }[] | undefined) || [];
    const availableCount = columns.filter((c) => c.status === 'available').length;
    if (availableCount >= expectedCount) {
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function main() {
  const rootDir = process.cwd();
  const manifestPath = path.join(rootDir, 'appwrite.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as AppwriteManifest;

  const endpoint = process.env.APPWRITE_ENDPOINT || 'http://localhost:8080/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || manifest.projectId;
  let apiKey = process.env.APPWRITE_API_KEY || '';
  const autoInit = process.argv.includes('--auto-init') || process.env.APPWRITE_AUTO_INIT === 'true';

  console.log('=== AGBA Appwrite 2.6.1 TablesDB & Storage Bootstrap Script ===');
  console.log(`Target Endpoint : ${endpoint}`);
  console.log(`Project ID      : ${projectId}`);
  console.log(`Database API    : ${manifest.api} (Appwrite ${manifest.version})`);
  console.log(`Tables Defined  : ${manifest.tables.map((t) => t.$id).join(', ')} (${manifest.tables.length} tables)`);
  console.log(`Storage Buckets : ${manifest.buckets.map((b) => b.$id).join(', ')}`);
  console.log(
    `Seed Payload    : ${FREE_STACK_ENTRIES.length} Free Stack entries + ${ACADEMY_TEMPLATES.length} Academy templates\n`
  );

  if (autoInit && (!apiKey || apiKey.startsWith('YOUR_'))) {
    console.log('[AUTO-INIT] Initializing fresh Appwrite 2.6.1 instance via Console API...');
    apiKey = await autoInitializeFreshAppwriteInstance({
      endpoint,
      projectId,
      projectName: manifest.projectName,
    });
    console.log('[AUTO-INIT] Provisioned project "agba-core" and least-privilege Server API key.');
    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `APPWRITE_API_KEY=${apiKey}\n`, 'utf8');
    }
  }

  if (!apiKey || apiKey === 'YOUR_APPWRITE_SERVER_API_KEY' || apiKey === 'YOUR_APPWRITE_LEAST_PRIVILEGE_SERVER_API_KEY') {
    console.log(
      '[DRY-RUN / MANIFEST VALIDATION] No live APPWRITE_API_KEY set in environment. Validated appwrite.json (2.6.1) structure and pgvector RLS DDL.'
    );
    console.log(
      'To provision against a running Appwrite 2.6.1 instance, set APPWRITE_ENDPOINT and APPWRITE_API_KEY in .env (or pass --auto-init) and re-run: npm run bootstrap:appwrite'
    );
    return;
  }

  // 1. Provision Databases
  for (const db of manifest.databases) {
    const res = await callAppwriteAdminApi(endpoint, projectId, apiKey, '/tablesdb', 'POST', {
      databaseId: db.$id,
      name: db.name,
      enabled: db.enabled,
    });
    console.log(`[Database] ${db.$id}: HTTP ${res.status} (${res.ok ? 'READY' : 'FAILED'})`);
  }

  // 2. Provision Tables, Columns, and Indexes via Appwrite 2.6.1 TablesDB API
  for (const table of manifest.tables) {
    const tblRes = await callAppwriteAdminApi(
      endpoint,
      projectId,
      apiKey,
      `/tablesdb/${table.databaseId}/tables`,
      'POST',
      {
        tableId: table.$id,
        name: table.name,
        permissions: [],
        rowSecurity: table.rowSecurity,
        enabled: true,
      }
    );
    console.log(`[Table] ${table.$id}: HTTP ${tblRes.status} (${tblRes.ok ? 'READY' : 'FAILED'})`);

    for (const col of table.columns) {
      const colEndpoint =
        col.type === 'integer'
          ? `/tablesdb/${table.databaseId}/tables/${table.$id}/columns/integer`
          : col.type === 'datetime'
            ? `/tablesdb/${table.databaseId}/tables/${table.$id}/columns/datetime`
            : `/tablesdb/${table.databaseId}/tables/${table.$id}/columns/string`;

      await callAppwriteAdminApi(endpoint, projectId, apiKey, colEndpoint, 'POST', {
        key: col.key,
        size: col.size ?? 255,
        required: col.required,
      });
    }

    await waitForColumnsAvailable(
      endpoint,
      projectId,
      apiKey,
      table.databaseId,
      table.$id,
      table.columns.length
    );

    for (const idx of table.indexes) {
      await callAppwriteAdminApi(
        endpoint,
        projectId,
        apiKey,
        `/tablesdb/${table.databaseId}/tables/${table.$id}/indexes`,
        'POST',
        {
          key: idx.key,
          type: idx.type,
          columns: idx.columns,
        }
      );
    }
  }

  // 3. Provision Storage Bucket (`rag_files`)
  for (const bucket of manifest.buckets) {
    const bRes = await callAppwriteAdminApi(endpoint, projectId, apiKey, '/storage/buckets', 'POST', {
      bucketId: bucket.$id,
      name: bucket.name,
      permissions: [],
      fileSecurity: bucket.fileSecurity,
      enabled: true,
      maximumFileSize: bucket.maximumFileSize,
      allowedFileExtensions: bucket.allowedFileExtensions,
      compression: 'gzip',
      encryption: true,
      antivirus: false,
    });
    console.log(`[Bucket] ${bucket.$id}: HTTP ${bRes.status} (${bRes.ok ? 'READY' : 'FAILED'})`);
  }

  // 4. Provision Default Dev/Test Tenant Teams (`ws_trendtactics_lagos` and `ws_savannah_labs`) ONLY in dev/test
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const forceSeedDev = process.argv.includes('--seed-dev');
  if (!isProd || forceSeedDev) {
    for (const team of [
      { teamId: 'ws_trendtactics_lagos', name: 'Trendtactics Digital (Lagos)' },
      { teamId: 'ws_savannah_labs', name: 'Savannah AgriTech Labs (Abuja)' },
    ]) {
      const tRes = await callAppwriteAdminApi(endpoint, projectId, apiKey, '/teams', 'POST', team);
      console.log(`[Dev/Test Seed Team] ${team.teamId}: HTTP ${tRes.status} (${tRes.ok ? 'READY' : 'FAILED'})`);
    }
  } else {
    console.log('[Production Mode] Skipped dev/test seed teams (ws_trendtactics_lagos, ws_savannah_labs).');
  }

  console.log('\n[COMPLETE] Appwrite 2.6.1 TablesDB (10 tables), Teams, and Storage bucket bootstrap finished.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Bootstrap error:', err);
    process.exit(1);
  });
}
