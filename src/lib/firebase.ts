import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { exchangeCustomTokenForAppwriteSession } from './appwriteClient.ts';

/**
 * ADR-008 Identity-Only Firebase Auth Client:
 * - Firebase is used strictly for Google Sign-In identity (`IDENTITY_PROVIDER=firebase`).
 * - Zero `firebase/firestore` imports or dual-writes exist in application code (enforced by CI `check:no-firestore`).
 * - After Firebase sign-in, `bridgeFirebaseUserToAppwrite()` sends the Firebase ID token to Express
 *   (`POST /api/auth/bridge-session`), which verifies `email_verified === true`, resolves `firebaseUid -> appwriteUserId`
 *   in the server-only `identity_links` table, mints a short-lived Appwrite 2.6.1 Custom Token (`POST /v1/users/{userId}/tokens`),
 *   and exchanges it for a native Appwrite session (`POST /v1/account/sessions/token`).
 */
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export interface BridgedSessionSummary {
  appwriteUserId: string;
  email: string;
  emailVerified: boolean;
  identityProvider: 'firebase' | 'appwrite';
}

export async function bridgeFirebaseUserToAppwrite(
  user: User
): Promise<BridgedSessionSummary | null> {
  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/auth/bridge-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      appwriteUserId: string;
      secret: string;
      email: string;
      emailVerified: boolean;
      identityProvider: 'firebase' | 'appwrite';
      liveAppwriteTokenMinted?: boolean;
    };
    if (data.liveAppwriteTokenMinted && data.appwriteUserId && data.secret) {
      await exchangeCustomTokenForAppwriteSession(data.appwriteUserId, data.secret);
    }
    return {
      appwriteUserId: data.appwriteUserId,
      email: data.email,
      emailVerified: data.emailVerified,
      identityProvider: data.identityProvider,
    };
  } catch {
    return null;
  }
}

export async function signInWithGooglePopup(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  await bridgeFirebaseUserToAppwrite(cred.user);
  return cred.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User };
