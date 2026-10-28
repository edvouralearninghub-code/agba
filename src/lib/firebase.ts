import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { exchangeCustomTokenForAppwriteSession } from './appwriteClient.ts';
import type { Workspace } from '../types/agba.ts';

/**
 * ADR-008 Identity-Only Firebase Auth Client:
 * - Firebase is used strictly for user identity (`IDENTITY_PROVIDER=firebase`).
 * - Zero `firebase/firestore` imports or dual-writes exist in application code (enforced by CI `check:no-firestore`).
 * - Supports Google Sign-In Popup and Email/Password Sign-In & Sign-Up with seamless Appwrite session bridging.
 */
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export interface BridgedSessionSummary {
  appwriteUserId: string;
  email: string;
  displayName?: string;
  workspaceName?: string;
  createdWorkspace?: Workspace | null;
  emailVerified: boolean;
  identityProvider: 'firebase' | 'appwrite';
}

export type AuthFeedbackAction =
  | 'reset_password'
  | 'switch_to_signup'
  | 'switch_to_signin'
  | 'retry'
  | 'focus_email'
  | 'focus_password'
  | 'focus_email_form';

export interface AuthFeedbackDetails {
  code: string;
  title: string;
  message: string;
  suggestion: string;
  field?: 'email' | 'password';
  action?: AuthFeedbackAction;
  actionLabel?: string;
}

export class AuthFeedbackError extends Error {
  readonly code: string;
  readonly title: string;
  readonly suggestion: string;
  readonly field?: 'email' | 'password';
  readonly action?: AuthFeedbackAction;
  readonly actionLabel?: string;

  constructor(details: AuthFeedbackDetails) {
    super(details.message);
    this.name = 'AuthFeedbackError';
    this.code = details.code;
    this.title = details.title;
    this.suggestion = details.suggestion;
    this.field = details.field;
    this.action = details.action;
    this.actionLabel = details.actionLabel;
  }
}

export function classifyAuthError(
  err: unknown,
  mode: 'signin' | 'signup' | 'reset' | 'google' = 'signin'
): AuthFeedbackError {
  if (err instanceof AuthFeedbackError) {
    return err;
  }

  const errObj = (typeof err === 'object' && err !== null ? err : {}) as {
    code?: string;
    name?: string;
    message?: string;
    field?: 'email' | 'password';
  };
  const rawCode = String(errObj.code || errObj.name || '').toLowerCase();
  const rawMessage = String(
    errObj.message || (typeof err === 'string' ? err : 'Authentication failed')
  );
  const combined = `${rawCode} ${rawMessage}`.toLowerCase();

  if (
    rawCode === 'Timeouterror'.toLowerCase() ||
    rawCode === 'aborterror' ||
    combined.includes('auth/network-request-failed') ||
    combined.includes('took too long') ||
    combined.includes('timed out') ||
    combined.includes('failed to fetch') ||
    combined.includes('networkerror')
  ) {
    return new AuthFeedbackError({
      code: 'AUTH_NETWORK_TIMEOUT',
      title: 'Sign-In Request Timed Out',
      message:
        'The authentication service took too long to respond or your network connection was interrupted.',
      suggestion:
        'Verify your internet connection and click Retry Sign-In Now to submit your credentials again.',
      action: 'retry',
      actionLabel: 'Retry Sign-In Now',
    });
  }

  if (combined.includes('auth/unauthorized-domain') || combined.includes('unauthorized domain')) {
    return new AuthFeedbackError({
      code: 'AUTH_DOMAIN_UNAUTHORIZED',
      title: 'Google Popup Not Authorized on This Domain',
      message:
        'This domain is not yet listed under Authorized Domains in your Firebase Authentication settings.',
      suggestion:
        'For your security, please enter both your email address and password (minimum 6 characters) below to sign in or create your account.',
      field: 'email',
      action: 'focus_email_form',
      actionLabel: 'Use Email & Password Below',
    });
  }

  if (
    combined.includes('auth/popup-blocked') ||
    combined.includes('auth/popup-closed-by-user') ||
    combined.includes('auth/cancelled-popup-request') ||
    combined.includes('popup')
  ) {
    return new AuthFeedbackError({
      code: 'AUTH_POPUP_INTERRUPTED',
      title: 'Google Sign-In Popup Interrupted',
      message:
        'The Google sign-in window was closed or blocked by your browser popup settings.',
      suggestion:
        'Allow popups for this site to use Google Sign-In, or sign in directly below using your email and password (minimum 6 characters).',
      field: 'email',
      action: 'focus_email_form',
      actionLabel: 'Use Email & Password Below',
    });
  }

  if (
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/invalid-credential') ||
    combined.includes('incorrect password') ||
    combined.includes('invalid email or password')
  ) {
    return new AuthFeedbackError({
      code: 'AUTH_INVALID_CREDENTIALS',
      title: 'Incorrect Email or Password',
      message:
        'The password you entered does not match this account, or the email address was mistyped.',
      suggestion:
        'Verify that Caps Lock is off and your password is at least 6 characters, or reset your password if you forgot it.',
      field: 'password',
      action: 'reset_password',
      actionLabel: 'Reset Forgotten Password',
    });
  }

  if (combined.includes('auth/user-not-found') || combined.includes('no account found')) {
    return new AuthFeedbackError({
      code: 'AUTH_ACCOUNT_NOT_FOUND',
      title: 'No Account Found for This Email',
      message: 'We could not find an existing AGBA workspace account for this email address.',
      suggestion:
        'Check the spelling of your email address, or switch to Create Free Account to register now.',
      field: 'email',
      action: 'switch_to_signup',
      actionLabel: 'Switch to Create Free Account',
    });
  }

  if (
    combined.includes('auth/email-already-in-use') ||
    combined.includes('already exists') ||
    combined.includes('already registered')
  ) {
    return new AuthFeedbackError({
      code: 'AUTH_EMAIL_IN_USE',
      title: 'Email Already Registered',
      message: 'An AGBA workspace account with this email address already exists.',
      suggestion:
        'Switch to Sign In to enter your existing password, or reset your password if needed.',
      field: 'email',
      action: 'switch_to_signin',
      actionLabel: 'Switch to Sign In',
    });
  }

  if (
    combined.includes('auth/weak-password') ||
    combined.includes('at least 6 characters') ||
    combined.includes('password must be')
  ) {
    return new AuthFeedbackError({
      code: 'AUTH_WEAK_PASSWORD',
      title: 'Password Must Be at Least 6 Characters',
      message: 'For workspace security, passwordless or short-password sign-in is not permitted.',
      suggestion: 'Enter a password of 6 or more characters in the Password field below.',
      field: 'password',
      action: 'focus_password',
      actionLabel: 'Enter Valid Password',
    });
  }

  if (
    combined.includes('auth/invalid-email') ||
    combined.includes('valid email address') ||
    combined.includes('enter your email')
  ) {
    return new AuthFeedbackError({
      code: 'AUTH_INVALID_EMAIL',
      title: 'Invalid Email Address Format',
      message: 'Please provide a complete email address in the format you@company.com.',
      suggestion: 'Check your email address for typos or missing domain parts.',
      field: 'email',
      action: 'focus_email',
      actionLabel: 'Fix Email Address',
    });
  }

  if (
    combined.includes('auth/too-many-requests') ||
    combined.includes('auth/user-disabled') ||
    combined.includes('too many')
  ) {
    return new AuthFeedbackError({
      code: 'AUTH_RATE_LIMITED',
      title: 'Too Many Failed Sign-In Attempts',
      message:
        'Sign-in for this account has been temporarily paused after repeated unsuccessful attempts.',
      suggestion:
        'Reset your password immediately to restore access, or wait a moment before retrying.',
      action: 'reset_password',
      actionLabel: 'Reset Forgotten Password',
    });
  }

  return new AuthFeedbackError({
    code: mode === 'signup' ? 'AUTH_SIGNUP_FAILED' : 'AUTH_SIGNIN_FAILED',
    title: mode === 'signup' ? 'Could Not Create Account' : 'Sign-In Could Not Be Completed',
    message: rawMessage || 'We could not verify your credentials at this moment.',
    suggestion:
      'Double-check your email address and password (minimum 6 characters) and try again.',
    field: errObj.field,
    action: 'retry',
    actionLabel: 'Try Again',
  });
}

const LOCAL_SESSION_STORAGE_KEY = 'agba_authenticated_session_v1';

export function getStoredAgbaSession(): BridgedSessionSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BridgedSessionSummary;
  } catch {
    return null;
  }
}

export function setStoredAgbaSession(session: BridgedSessionSummary | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore storage errors
  }
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
      signal: AbortSignal.timeout(8000),
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
    const summary: BridgedSessionSummary = {
      appwriteUserId: data.appwriteUserId,
      email: data.email || user.email || '',
      displayName: user.displayName || undefined,
      emailVerified: data.emailVerified,
      identityProvider: data.identityProvider,
    };
    setStoredAgbaSession(summary);
    return summary;
  } catch {
    return null;
  }
}

export async function signInWithGooglePopup(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await bridgeFirebaseUserToAppwrite(cred.user);
    return cred.user;
  } catch (err) {
    throw classifyAuthError(err, 'google');
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<BridgedSessionSummary> {
  if (!email.trim() || !email.includes('@')) {
    throw classifyAuthError({ code: 'auth/invalid-email', message: 'Please enter a valid email address.' }, 'signin');
  }
  if (!password || password.length < 6) {
    throw classifyAuthError({ code: 'auth/weak-password', message: 'Password must be at least 6 characters.' }, 'signin');
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const bridged = await bridgeFirebaseUserToAppwrite(cred.user);
    if (bridged) return bridged;
    const fallback: BridgedSessionSummary = {
      appwriteUserId: `usr_${cred.user.uid.slice(0, 12)}`,
      email: cred.user.email || email.trim(),
      displayName: cred.user.displayName || email.split('@')[0],
      emailVerified: true,
      identityProvider: 'firebase',
    };
    setStoredAgbaSession(fallback);
    return fallback;
  } catch (fbErr) {
    const fbCode = String((fbErr as { code?: string })?.code || '').toLowerCase();
    // Do not fall back if Firebase explicitly rejected the user's password or rate-limited the account
    if (
      fbCode === 'auth/wrong-password' ||
      fbCode === 'auth/too-many-requests' ||
      fbCode === 'auth/user-disabled'
    ) {
      throw classifyAuthError(fbErr, 'signin');
    }

    try {
      // Express session bridge with strict server-side scrypt password verification & 8s timeout
      const res = await fetch('/api/auth/email-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'signin', email: email.trim(), password }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (!res.ok) {
        throw classifyAuthError(
          { code: data.code || 'auth/invalid-credential', message: data.error, field: data.field },
          'signin'
        );
      }
      setStoredAgbaSession(data);
      return data as BridgedSessionSummary;
    } catch (bridgeErr) {
      throw classifyAuthError(bridgeErr, 'signin');
    }
  }
}

export async function signUpWithEmail(params: {
  fullName: string;
  email: string;
  password: string;
  workspaceName?: string;
}): Promise<BridgedSessionSummary> {
  const { fullName, email, password, workspaceName } = params;
  if (!email.trim() || !email.includes('@')) {
    throw classifyAuthError({ code: 'auth/invalid-email', message: 'Please enter a valid email address.' }, 'signup');
  }
  if (!password || password.length < 6) {
    throw classifyAuthError({ code: 'auth/weak-password', message: 'Password must be at least 6 characters.' }, 'signup');
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (fullName.trim()) {
      await updateProfile(cred.user, { displayName: fullName.trim() });
    }
    const bridged = await bridgeFirebaseUserToAppwrite(cred.user);
    const summary: BridgedSessionSummary = bridged || {
      appwriteUserId: `usr_${cred.user.uid.slice(0, 12)}`,
      email: cred.user.email || email.trim(),
      displayName: fullName.trim() || email.split('@')[0],
      workspaceName: workspaceName?.trim(),
      emailVerified: true,
      identityProvider: 'firebase',
    };
    summary.displayName = fullName.trim() || summary.displayName;
    summary.workspaceName = workspaceName?.trim();
    setStoredAgbaSession(summary);
    return summary;
  } catch (fbErr) {
    const fbCode = String((fbErr as { code?: string })?.code || '').toLowerCase();
    if (fbCode === 'auth/email-already-in-use' || fbCode === 'auth/weak-password') {
      throw classifyAuthError(fbErr, 'signup');
    }

    try {
      const res = await fetch('/api/auth/email-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'signup',
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          workspaceName: workspaceName?.trim(),
        }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (!res.ok) {
        throw classifyAuthError(
          { code: data.code || 'auth/signup-failed', message: data.error, field: data.field },
          'signup'
        );
      }
      setStoredAgbaSession(data);
      return data as BridgedSessionSummary;
    } catch (bridgeErr) {
      throw classifyAuthError(bridgeErr, 'signup');
    }
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!email.trim() || !email.includes('@')) {
    throw classifyAuthError(
      { code: 'auth/invalid-email', message: 'Please enter a valid email address to reset your password.' },
      'reset'
    );
  }
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err) {
    const code = String((err as { code?: string })?.code || '').toLowerCase();
    if (code === 'auth/invalid-email' || code === 'auth/network-request-failed') {
      throw classifyAuthError(err, 'reset');
    }
    // Succeed gracefully on user-not-found to prevent email enumeration
  }
}

export async function signOutFirebaseUser(): Promise<void> {
  setStoredAgbaSession(null);
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
}

export { onAuthStateChanged, type User };
