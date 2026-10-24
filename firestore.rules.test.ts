/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adversarial "Dirty Dozen" Payload Verification Suite for AGBA Firestore Rules
 */

import fs from 'node:fs';
import path from 'node:path';

export interface DirtyDozenScenario {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list';
  requiredRuleGate: string;
}

export const DIRTY_DOZEN_SCENARIOS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Workspace Creation',
    collectionPath: '/workspaces/ws_1',
    operation: 'create',
    requiredRuleGate: 'data.ownerId == request.auth.uid',
  },
  {
    id: 2,
    name: 'Unverified Email Write Reject',
    collectionPath: '/workspaces/ws_1',
    operation: 'create',
    requiredRuleGate: 'request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Shadow Field Injection Block',
    collectionPath: '/workspaces/ws_1',
    operation: 'create',
    requiredRuleGate: "data.keys().hasOnly(['id', 'ownerId', 'name', 'slug', 'planTier', 'currency', 'createdAt', 'updatedAt'])",
  },
  {
    id: 4,
    name: 'ID Poisoning (128-char & Regex Guard)',
    collectionPath: '/workspaces/ws_1',
    operation: 'create',
    requiredRuleGate: "id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$')",
  },
  {
    id: 5,
    name: 'Value Poisoning on Update (Wrapped by Blueprint Validator)',
    collectionPath: '/workspaces/ws_1',
    operation: 'update',
    requiredRuleGate: 'isValidWorkspace(incoming(), workspaceId)',
  },
  {
    id: 6,
    name: 'Immortal Field Mutation Block (ownerId & createdAt)',
    collectionPath: '/workspaces/ws_1',
    operation: 'update',
    requiredRuleGate: 'incoming().ownerId == existing().ownerId',
  },
  {
    id: 7,
    name: 'Forged Client Timestamp Block',
    collectionPath: '/workspaces/ws_1',
    operation: 'create',
    requiredRuleGate: 'incoming().createdAt == request.time',
  },
  {
    id: 8,
    name: 'Orphaned Subcollection Write Block (Master Gate)',
    collectionPath: '/workspaces/ws_ghost/workflows/wf_1',
    operation: 'create',
    requiredRuleGate: 'exists(/databases/$(database)/documents/workspaces/$(workspaceId))',
  },
  {
    id: 9,
    name: 'Cross-Tenant Subcollection Write Block',
    collectionPath: '/workspaces/ws_victim/free_stack_entries/fs_1',
    operation: 'create',
    requiredRuleGate: 'get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.ownerId == request.auth.uid',
  },
  {
    id: 10,
    name: 'Terminal State Bypass Block (Archived Workflow)',
    collectionPath: '/workspaces/ws_1/workflows/wf_archived',
    operation: 'update',
    requiredRuleGate: "existing().status != 'archived'",
  },
  {
    id: 11,
    name: 'Unauthorized Admin Self-Promotion Block',
    collectionPath: '/admins/attacker_uid',
    operation: 'create',
    requiredRuleGate: 'allow create, update, delete: if false;',
  },
  {
    id: 12,
    name: 'Cross-Tenant List Scraping Block (Query Enforcer)',
    collectionPath: '/workspaces',
    operation: 'list',
    requiredRuleGate: 'allow list: if isVerifiedUser() && existing().ownerId == request.auth.uid;',
  },
];

export function runFirestoreRulesAudit(rulesFilePath = 'firestore.rules'): void {
  const fullPath = path.resolve(process.cwd(), rulesFilePath);
  const rulesContent = fs.readFileSync(fullPath, 'utf8');

  for (const scenario of DIRTY_DOZEN_SCENARIOS) {
    if (!rulesContent.includes(scenario.requiredRuleGate)) {
      throw new Error(
        `[PERMISSION_DENIED_AUDIT_FAIL] Scenario #${scenario.id} (${scenario.name}) missing gate: ${scenario.requiredRuleGate}`
      );
    }
  }
}
