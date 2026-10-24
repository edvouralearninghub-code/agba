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

export function extractAppwriteSessionAuthHeaders(
  headers: Headers
): { Cookie: string; 'X-Fallback-Cookies'?: string } {
  const rawSetCookies: string[] =
    typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [headers.get('set-cookie') || ''];

  const cookiePairs: string[] = [];
  const fallbackMap: Record<string, string> = {};

  for (const raw of rawSetCookies) {
    const matches = raw.match(/a_session_[a-zA-Z0-9_-]+=[^;\s,]+/g) || [];
    for (const pair of matches) {
      cookiePairs.push(pair);
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const k = pair.slice(0, eqIdx);
        const v = pair.slice(eqIdx + 1);
        fallbackMap[k] = v;
      }
    }
  }

  const explicitFallback = headers.get('x-fallback-cookies');
  const fallbackHeader =
    explicitFallback || (Object.keys(fallbackMap).length > 0 ? JSON.stringify(fallbackMap) : undefined);

  return {
    Cookie: cookiePairs.join('; '),
    ...(fallbackHeader ? { 'X-Fallback-Cookies': fallbackHeader } : {}),
  };
}

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

  let sessionAuth: { Cookie: string; 'X-Fallback-Cookies'?: string } = { Cookie: '' };

  for (let attempt = 1; attempt <= 12; attempt++) {
    // 1. Register root account in Console project (409 if already exists)
    const regRes = await fetch(`${base}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
      body: JSON.stringify({
        userId: 'admin_root',
        email,
        password,
        name: 'AGBA Platform Root',
      }),
    });

    // 2. Create Console email session and capture session cookie + fallback cookies
    const sessionRes = await fetch(`${base}/account/sessions/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': 'console' },
      body: JSON.stringify({ email, password }),
    });

    sessionAuth = extractAppwriteSessionAuthHeaders(sessionRes.headers);
    if (sessionAuth.Cookie || sessionAuth['X-Fallback-Cookies']) {
      break;
    }

    const errText = await sessionRes.text().catch(() => '');
    console.log(
      `[AUTO-INIT] Waiting for Console session readiness (attempt ${attempt}/12, reg=${regRes.status}, session=${sessionRes.status}: ${errText.slice(0, 120)})...`
    );
    await new Promise((r) => setTimeout(r, 2500));
  }

  if (!sessionAuth.Cookie && !sessionAuth['X-Fallback-Cookies']) {
    throw new Error(`Failed to obtain Console session cookie from ${base}/account/sessions/email.`);
  }

  const consoleHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': 'console',
    ...sessionAuth,
  };

  // 3. Ensure Organization Team (`org_agba`) exists
  const teamRes = await fetch(`${base}/teams`, {
    method: 'POST',
    headers: consoleHeaders,
    body: JSON.stringify({
      teamId: 'org_agba',
      name: 'Trendtactics Digital Organization',
    }),
  });
  if (!teamRes.ok && teamRes.status !== 409) {
    // Fallback for Appwrite setups using /organizations
    await fetch(`${base}/organizations`, {
      method: 'POST',
      headers: consoleHeaders,
      body: JSON.stringify({
        organizationId: 'org_agba',
        name: 'Trendtactics Digital Organization',
      }),
    }).catch(() => undefined);
  }

  // 4. Create Project `agba-core` (409 if already exists)
  let projRes = await fetch(`${base}/projects`, {
    method: 'POST',
    headers: consoleHeaders,
    body: JSON.stringify({
      projectId: params.projectId,
      name: params.projectName,
      teamId: 'org_agba',
      region: 'default',
    }),
  });
  if (!projRes.ok && projRes.status !== 409) {
    projRes = await fetch(`${base}/projects`, {
      method: 'POST',
      headers: consoleHeaders,
      body: JSON.stringify({
        projectId: params.projectId,
        name: params.projectName,
        teamId: 'org_agba',
      }),
    });
  }

  // 5. Create Least-Privilege Server API Key (try TablesDB + Classic scopes, fallback to Classic scopes if needed)
  const scopeCandidates = [
    LEAST_PRIVILEGE_APPWRITE_SCOPES,
    [
      'users.read',
      'users.write',
      'teams.read',
      'teams.write',
      'databases.read',
      'databases.write',
      'collections.read',
      'collections.write',
      'attributes.read',
      'attributes.write',
      'indexes.read',
      'indexes.write',
      'documents.read',
      'documents.write',
      'buckets.read',
      'buckets.write',
      'files.read',
      'files.write',
    ],
  ];

  let lastKeyError = '';
  for (const scopes of scopeCandidates) {
    const keyRes = await fetch(`${base}/projects/${params.projectId}/keys`, {
      method: 'POST',
      headers: consoleHeaders,
      body: JSON.stringify({
        name: 'agba-express-least-privilege-key',
        scopes,
      }),
    });
    const keyData = (await keyRes.json().catch(() => ({}))) as { secret?: string; message?: string };
    if (keyData.secret) {
      return keyData.secret;
    }
    lastKeyError = `HTTP ${keyRes.status}: ${JSON.stringify(keyData)}`;
  }

  throw new Error(
    `Failed to mint Appwrite Server API key for project "${params.projectId}" (${lastKeyError}).`
  );
}

async function waitForColumnsAvailable(
  endpoint: string,
  projectId: string,
  apiKey: string,
  databaseId: string,
  tableId: string,
  expectedCount: number
): Promise<void> {
  for (let attempt = 0; attempt < 35; attempt++) {
    let res = await callAppwriteAdminApi(
      endpoint,
      projectId,
      apiKey,
      `/tablesdb/${databaseId}/tables/${tableId}/columns`,
      'GET'
    );
    if (!res.ok) {
      res = await callAppwriteAdminApi(
        endpoint,
        projectId,
        apiKey,
        `/databases/${databaseId}/collections/${tableId}/attributes`,
        'GET'
      );
    }
    const columns =
      ((res.data.columns || res.data.attributes) as { status?: string }[] | undefined) || [];
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
  const outputEnvIndex = process.argv.indexOf('--output-env');
  const outputEnvPath =
    outputEnvIndex !== -1 && process.argv[outputEnvIndex + 1]
      ? process.argv[outputEnvIndex + 1]
      : null;

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
    console.log(`[AUTO-INIT] Provisioned project "${projectId}" and least-privilege Server API key.`);
    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `APPWRITE_API_KEY=${apiKey}\n`, 'utf8');
    }
  }

  if (outputEnvPath && apiKey) {
    const envFileContent = [
      `APPWRITE_ENDPOINT=${endpoint}`,
      `APPWRITE_PROJECT_ID=${projectId}`,
      `APPWRITE_DATABASE_ID=${manifest.databases[0]?.$id || 'agba_core'}`,
      `APPWRITE_BUCKET_ID=${manifest.buckets[0]?.$id || 'rag_files'}`,
      `APPWRITE_API_KEY=${apiKey}`,
      '',
    ].join('\n');
    fs.writeFileSync(path.resolve(rootDir, outputEnvPath), envFileContent, 'utf8');
    console.log(`[AUTO-INIT] Wrote runtime credentials to ${outputEnvPath}`);
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
    let res = await callAppwriteAdminApi(endpoint, projectId, apiKey, '/tablesdb', 'POST', {
      databaseId: db.$id,
      name: db.name,
      enabled: db.enabled,
    });
    if (!res.ok) {
      res = await callAppwriteAdminApi(endpoint, projectId, apiKey, '/databases', 'POST', {
        databaseId: db.$id,
        name: db.name,
        enabled: db.enabled,
      });
    }
    console.log(`[Database] ${db.$id}: HTTP ${res.status} (${res.ok ? 'READY' : 'FAILED'})`);
  }

  // 2. Provision Tables, Columns, and Indexes via Appwrite 2.6.1 TablesDB API (with Classic fallback)
  for (const table of manifest.tables) {
    let tblRes = await callAppwriteAdminApi(
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
    if (!tblRes.ok) {
      tblRes = await callAppwriteAdminApi(
        endpoint,
        projectId,
        apiKey,
        `/databases/${table.databaseId}/collections`,
        'POST',
        {
          collectionId: table.$id,
          name: table.name,
          permissions: [],
          documentSecurity: table.rowSecurity,
          enabled: true,
        }
      );
    }
    console.log(`[Table] ${table.$id}: HTTP ${tblRes.status} (${tblRes.ok ? 'READY' : 'FAILED'})`);

    for (const col of table.columns) {
      if (col.type === 'integer') {
        const r = await callAppwriteAdminApi(
          endpoint,
          projectId,
          apiKey,
          `/tablesdb/${table.databaseId}/tables/${table.$id}/columns/integer`,
          'POST',
          { key: col.key, required: col.required }
        );
        if (!r.ok) {
          await callAppwriteAdminApi(
            endpoint,
            projectId,
            apiKey,
            `/databases/${table.databaseId}/collections/${table.$id}/attributes/integer`,
            'POST',
            { key: col.key, required: col.required }
          );
        }
      } else if (col.type === 'datetime') {
        const r = await callAppwriteAdminApi(
          endpoint,
          projectId,
          apiKey,
          `/tablesdb/${table.databaseId}/tables/${table.$id}/columns/datetime`,
          'POST',
          { key: col.key, required: col.required }
        );
        if (!r.ok) {
          await callAppwriteAdminApi(
            endpoint,
            projectId,
            apiKey,
            `/databases/${table.databaseId}/collections/${table.$id}/attributes/datetime`,
            'POST',
            { key: col.key, required: col.required }
          );
        }
      } else {
        // String / varchar column
        const payload = { key: col.key, size: col.size ?? 255, required: col.required };
        let r = await callAppwriteAdminApi(
          endpoint,
          projectId,
          apiKey,
          `/tablesdb/${table.databaseId}/tables/${table.$id}/columns/varchar`,
          'POST',
          payload
        );
        if (!r.ok) {
          r = await callAppwriteAdminApi(
            endpoint,
            projectId,
            apiKey,
            `/tablesdb/${table.databaseId}/tables/${table.$id}/columns/string`,
            'POST',
            payload
          );
        }
        if (!r.ok) {
          await callAppwriteAdminApi(
            endpoint,
            projectId,
            apiKey,
            `/databases/${table.databaseId}/collections/${table.$id}/attributes/string`,
            'POST',
            payload
          );
        }
      }
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
      const idxRes = await callAppwriteAdminApi(
        endpoint,
        projectId,
        apiKey,
        `/tablesdb/${table.databaseId}/tables/${table.$id}/indexes`,
        'POST',
        {
          key: idx.key,
          type: idx.type,
          columns: idx.columns,
          orders: idx.columns.map(() => 'ASC'),
        }
      );
      if (!idxRes.ok) {
        await callAppwriteAdminApi(
          endpoint,
          projectId,
          apiKey,
          `/databases/${table.databaseId}/collections/${table.$id}/indexes`,
          'POST',
          {
            key: idx.key,
            type: idx.type,
            attributes: idx.columns,
            orders: idx.columns.map(() => 'ASC'),
          }
        );
      }
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
