# AGBA Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: No document in any collection may be read or written unless explicitly permitted by a collection-specific rule.
2. **Verified Identity Invariant**: All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Master Gate & Tenant Isolation (`workspace_id`)**:
   - A `Workspace` document (`/workspaces/{workspaceId}`) can only be created or modified by its owner (`ownerId == request.auth.uid`) or a verified administrator.
   - Subcollection documents (`/workspaces/{workspaceId}/workflows/{workflowId}` and `/workspaces/{workspaceId}/free_stack_entries/{entryId}`) cannot exist unless `/workspaces/{workspaceId}` exists AND its `ownerId == request.auth.uid` (or the caller is an admin).
   - Every subcollection document's `workspace_id` field must strictly match `{workspaceId}` and remain immutable across updates.
4. **Strict Key & Volumetric Boundaries**:
   - Every document creation must enforce `hasAll` and `hasOnly` on allowed keys.
   - Every update must wrap the entire condition with `isValid[Entity](incoming())`, enforce immutable fields (`id`, `workspace_id`, `ownerId`, `createdAt`), verify `updatedAt == request.time`, and restrict modified keys via `affectedKeys().hasOnly(...)`.
5. **Terminal State Locking**:
   - Once a `Workflow` reaches `status == 'archived'`, non-admin users cannot mutate it further.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path | Malicious Payload Summary | Expected Result |
|---|---|---|---|---|
| 1 | **Identity Spoofing** | `/workspaces/ws_1` | `ownerId: "victim_uid"` while authenticated as `"attacker_uid"` | `PERMISSION_DENIED` |
| 2 | **Unverified Email Write** | `/workspaces/ws_1` | Valid workspace payload but `request.auth.token.email_verified == false` | `PERMISSION_DENIED` |
| 3 | **Shadow Field Injection** | `/workspaces/ws_1` | Includes unauthorized ghost field `isSuperAdmin: true` | `PERMISSION_DENIED` |
| 4 | **ID Poisoning (1.5KB ID)** | `/workspaces/ws_1...` | Path ID exceeds 128 chars or contains illegal characters (`../`) | `PERMISSION_DENIED` |
| 5 | **Value Poisoning on Update** | `/workspaces/ws_1` | Updates `name` to a 5,000-character string or boolean `true` | `PERMISSION_DENIED` |
| 6 | **Immortal Field Mutation** | `/workspaces/ws_1` | Attempts to change `ownerId` or `createdAt` during an `update` | `PERMISSION_DENIED` |
| 7 | **Forged Client Timestamp** | `/workspaces/ws_1` | Sets `createdAt` or `updatedAt` to a past/future timestamp instead of `request.time` | `PERMISSION_DENIED` |
| 8 | **Orphaned Subcollection Write** | `/workspaces/ws_ghost/workflows/wf_1` | Writes a workflow under a non-existent workspace `ws_ghost` | `PERMISSION_DENIED` |
| 9 | **Cross-Tenant Subcollection Write** | `/workspaces/ws_victim/free_stack_entries/fs_1` | Attacker writes CMS entry into another user's workspace | `PERMISSION_DENIED` |
| 10 | **Terminal State Bypass** | `/workspaces/ws_1/workflows/wf_archived` | Attempts to update a workflow whose existing `status == 'archived'` | `PERMISSION_DENIED` |
| 11 | **Unauthorized Admin Self-Promotion** | `/admins/attacker_uid` | Non-admin user attempts to create `/admins/attacker_uid` | `PERMISSION_DENIED` |
| 12 | **Cross-Tenant List Scraping** | `/workspaces` | Attacker attempts unconstrained `list` query across all workspaces without `ownerId == request.auth.uid` | `PERMISSION_DENIED` |
