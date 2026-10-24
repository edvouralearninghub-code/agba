import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  AppwriteTablesBridge,
  FreeStackRowSchema,
  WorkflowRowSchema,
  WorkspaceRowSchema,
} from '../src/server/repositories.ts';

/**
 * One-Time Firestore-to-Appwrite 2.6.1 Migration Script (`ADR-008` Section 2.2)
 *
 * NOTE: This is the ONLY file in the repository permitted to reference Firestore export snapshots
 * or migration paths (`scripts/check-no-firestore-imports.ts` enforces that no application code
 * in `src/` or `server.ts` imports `firebase/firestore`).
 *
 * Usage:
 *   npx tsx scripts/migrate-firestore-to-appwrite.ts --dry-run    (default)
 *   npx tsx scripts/migrate-firestore-to-appwrite.ts --execute
 */

interface MigrationSnapshot {
  workspaces?: Record<string, unknown>[];
  workflows?: Record<string, unknown>[];
  free_stack_entries?: Record<string, unknown>[];
}

function loadLocalOrExportedSnapshot(): MigrationSnapshot {
  const snapshotPath = path.join(process.cwd(), 'data', 'agba-db.json');
  if (!fs.existsSync(snapshotPath)) {
    return { workspaces: [], workflows: [], free_stack_entries: [] };
  }
  const raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as {
    workspaces?: Record<string, unknown>[];
    studioApps?: Record<string, unknown>[];
    customFreeStackEntries?: Record<string, unknown>[];
  };
  return {
    workspaces: raw.workspaces || [],
    workflows: raw.studioApps || [],
    free_stack_entries: raw.customFreeStackEntries || [],
  };
}

async function main() {
  const isExecute = process.argv.includes('--execute');
  const mode = isExecute ? 'EXECUTE (Idempotent Upsert to Appwrite 2.6.1)' : 'DRY-RUN (Read & Validate Only)';
  const bridge = new AppwriteTablesBridge();

  console.log('=== AGBA One-Time Firestore -> Appwrite 2.6.1 TablesDB Migration ===');
  console.log(`Mode              : ${mode}`);
  console.log(`Target Endpoint   : ${bridge.getStatusSummary().endpoint}`);
  console.log(`Appwrite Live Key : ${bridge.isConfigured() ? 'Configured' : 'Not set (dry-run only)'}\n`);

  const snapshot = loadLocalOrExportedSnapshot();
  let validatedWorkspaces = 0;
  let validatedWorkflows = 0;
  let validatedFreeStack = 0;
  let upsertedCount = 0;

  for (const ws of snapshot.workspaces || []) {
    const candidate = WorkspaceRowSchema.parse({
      id: String(ws.id),
      teamId: String(ws.id),
      name: String(ws.name),
      slug: String(ws.slug),
      planTier: ws.planTier || 'free',
      currency: ws.currency || 'NGN',
      ownerId: String(ws.ownerId || 'usr_akinola_01'),
      createdAt: String(ws.createdAt || new Date().toISOString()),
    });
    validatedWorkspaces++;
    if (isExecute && bridge.isConfigured()) {
      const ok = await bridge.upsertRow(
        'workspaces',
        candidate.id,
        candidate,
        AppwriteTablesBridge.teamReadOnlyPermissions(candidate.id)
      );
      if (ok) upsertedCount++;
    }
  }

  for (const wf of snapshot.workflows || []) {
    const candidate = WorkflowRowSchema.parse({
      id: String(wf.id),
      workspace_id: String(wf.workspace_id || 'ws_trendtactics_lagos'),
      ownerId: String(wf.ownerId || 'usr_akinola_01'),
      name: String(wf.name),
      description: String(wf.description || ''),
      category: wf.category || 'RAG',
      status: wf.status || 'published',
      allowedTools: Array.isArray(wf.allowedTools) ? wf.allowedTools : [],
      nodes: Array.isArray(wf.nodes) ? wf.nodes : [],
      edges: Array.isArray(wf.edges) ? wf.edges : [],
      publishedSlug: wf.publishedSlug ? String(wf.publishedSlug) : undefined,
      updatedAt: String(wf.updatedAt || new Date().toISOString()),
    });
    validatedWorkflows++;
    if (isExecute && bridge.isConfigured()) {
      const ok = await bridge.upsertRow(
        'workflows',
        candidate.id,
        {
          id: candidate.id,
          workspace_id: candidate.workspace_id,
          ownerId: candidate.ownerId,
          name: candidate.name,
          description: candidate.description,
          category: candidate.category,
          status: candidate.status,
          allowedToolsJson: JSON.stringify(candidate.allowedTools),
          nodesJson: JSON.stringify(candidate.nodes),
          edgesJson: JSON.stringify(candidate.edges),
          publishedSlug: candidate.publishedSlug || '',
          updatedAt: candidate.updatedAt,
        },
        AppwriteTablesBridge.teamReadOnlyPermissions(candidate.workspace_id)
      );
      if (ok) upsertedCount++;
    }
  }

  for (const fsEntry of snapshot.free_stack_entries || []) {
    const candidate = FreeStackRowSchema.parse({
      id: String(fsEntry.id),
      workspace_id: String(fsEntry.workspace_id || 'ws_trendtactics_lagos'),
      serviceName: String(fsEntry.serviceName),
      description: fsEntry.description ? String(fsEntry.description) : undefined,
      category: fsEntry.category,
      freeTierSummary: String(fsEntry.freeTierSummary),
      officialPricingUrl: String(fsEntry.officialPricingUrl),
      verifiedOn: String(fsEntry.verifiedOn),
    });
    validatedFreeStack++;
    if (isExecute && bridge.isConfigured()) {
      const ok = await bridge.upsertRow(
        'free_stack_entries',
        candidate.id,
        candidate,
        AppwriteTablesBridge.teamReadOnlyPermissions(candidate.workspace_id)
      );
      if (ok) upsertedCount++;
    }
  }

  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify({ validatedWorkspaces, validatedWorkflows, validatedFreeStack }))
    .digest('hex');

  console.log(`[SUMMARY] Validated Workspaces         : ${validatedWorkspaces}`);
  console.log(`[SUMMARY] Validated Workflows          : ${validatedWorkflows}`);
  console.log(`[SUMMARY] Validated Custom Free Stack  : ${validatedFreeStack}`);
  console.log(`[SUMMARY] Upserted to Appwrite 2.6.1   : ${upsertedCount}`);
  console.log(`[SUMMARY] Verification Digest (SHA256) : ${digest}`);
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
