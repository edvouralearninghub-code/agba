import type { StudioWorkflowApp, Workspace } from '../types/agba.ts';

/**
 * Appwrite 2.6.1 Browser Session & Identity Bridge Client (`ADR-008`)
 *
 * Strictly handles browser sessions only:
 * - Exchanges short-lived Custom Tokens minted by `/api/auth/bridge-session` for a real
 *   Appwrite session via `POST /v1/account/sessions/token` (`account.createSession(userId, secret)`).
 * - Supports direct Appwrite OAuth2 redirect flow when `VITE_IDENTITY_PROVIDER=appwrite`.
 * - Short-lived JWT minting (`/account/jwts`) passed to Express `server.ts`.
 *
 * The browser NEVER holds an Appwrite API key and NEVER writes directly to Appwrite tables.
 * All TablesDB and Storage mutations flow through the trusted Express server (`server.ts`).
 */

export interface AppwriteSessionUser {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  status: boolean;
}

const APPWRITE_ENDPOINT =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APPWRITE_ENDPOINT) ||
  'http://localhost:8080/v1';

const APPWRITE_PROJECT_ID =
  (typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_APPWRITE_PROJECT_ID) ||
  'agba-core';

export function getAppwriteClientConfig() {
  return {
    endpoint: APPWRITE_ENDPOINT,
    projectId: APPWRITE_PROJECT_ID,
    version: '2.6.1',
  };
}

/**
 * Exchanges the short-lived custom token secret minted by Appwrite Users API
 * (`users.createToken`) for a real browser Appwrite session (`POST /v1/account/sessions/token`).
 */
export async function exchangeCustomTokenForAppwriteSession(
  userId: string,
  secret: string
): Promise<boolean> {
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT.replace(/\/$/, '')}/account/sessions/token`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify({ userId, secret }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getCurrentAppwriteUser(): Promise<AppwriteSessionUser | null> {
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT.replace(/\/$/, '')}/account`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as AppwriteSessionUser;
  } catch {
    return null;
  }
}

export async function mintAppwriteJwt(): Promise<string | null> {
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT.replace(/\/$/, '')}/account/jwts`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { jwt?: string };
    return data.jwt ?? null;
  } catch {
    return null;
  }
}

export function getAppwriteGoogleOAuthUrl(successUrl: string, failureUrl: string): string {
  const params = new URLSearchParams({
    project: APPWRITE_PROJECT_ID,
    success: successUrl,
    failure: failureUrl,
  });
  return `${APPWRITE_ENDPOINT.replace(/\/$/, '')}/account/sessions/oauth2/google?${params.toString()}`;
}

export async function syncWorkspaceViaExpress(workspace: Workspace): Promise<void> {
  try {
    await fetch('/api/backend/workspaces/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agba-workspace-id': workspace.id,
      },
      body: JSON.stringify(workspace),
    });
  } catch {
    // Non-fatal in preview
  }
}

export async function syncWorkflowViaExpress(
  workspaceId: string,
  workflow: StudioWorkflowApp
): Promise<void> {
  try {
    await fetch('/api/studio/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agba-workspace-id': workspaceId,
      },
      body: JSON.stringify({ ...workflow, workspace_id: workspaceId }),
    });
  } catch {
    // Non-fatal in preview
  }
}
