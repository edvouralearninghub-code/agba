import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building2,
  User as UserIcon,
  Sun,
  Moon,
  AlertCircle,
} from 'lucide-react';
import { AgbaLogoMark } from './AgbaLogoMark.tsx';
import { AdirePattern } from './AdirePattern.tsx';
import {
  signInWithGooglePopup,
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  type BridgedSessionSummary,
} from '../lib/firebase.ts';

interface AuthViewProps {
  initialMode?: 'signin' | 'signup';
  isDark: boolean;
  onToggleTheme: () => void;
  onBackToHome: () => void;
  onAuthSuccess: (session: BridgedSessionSummary) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'signin',
  isDark,
  onToggleTheme,
  onBackToHome,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [fullName, setFullName] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsLoading(true);
    try {
      const user = await signInWithGooglePopup();
      onAuthSuccess({
        appwriteUserId: `usr_${user.uid.slice(0, 12)}`,
        email: user.email || '',
        displayName: user.displayName || fullName.trim() || 'AGBA Builder',
        workspaceName: workspaceName.trim() || undefined,
        emailVerified: true,
        identityProvider: 'firebase',
      });
    } catch {
      // Never allow passwordless email sign-in. If the user already entered both email AND a valid password (>= 6 chars), verify with email + password:
      if (email.trim().includes('@') && password.length >= 6) {
        try {
          const session =
            mode === 'signup'
              ? await signUpWithEmail({
                  fullName: fullName.trim() || email.split('@')[0],
                  email: email.trim(),
                  password,
                  workspaceName: workspaceName.trim() || undefined,
                })
              : await signInWithEmail(email.trim(), password);
          onAuthSuccess(session);
          return;
        } catch (authErr) {
          setErrorMessage(
            authErr instanceof Error ? authErr.message : 'Invalid email or password.'
          );
          return;
        }
      }

      setErrorMessage(
        'Google popup is blocked or unauthorized on this domain. For your security, please enter both your email address and password (minimum 6 characters) below.'
      );
      const targetInputId = email.trim() ? 'auth-password' : 'auth-email';
      const el = document.getElementById(targetInputId);
      if (el) el.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (mode === 'reset') {
      setIsLoading(true);
      try {
        await requestPasswordReset(email);
        setStatusMessage(
          `If an account exists for ${email.trim()}, a password reset link has been sent.`
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const session = await signUpWithEmail({
          fullName: fullName.trim() || email.split('@')[0],
          email,
          password,
          workspaceName: workspaceName.trim() || undefined,
        });
        onAuthSuccess(session);
      } else {
        const session = await signInWithEmail(email, password);
        onAuthSuccess(session);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-x-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#0E1030] text-[#FAF6EC]' : 'bg-[#FAF6EC] text-[#0F1226]'
      }`}
    >
      <AdirePattern opacity={isDark ? 0.04 : 0.03} />

      {/* Minimal Top Bar */}
      <header className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-between px-4 py-5 sm:px-6">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight"
        >
          <AgbaLogoMark size={28} />
          <span>AGBA</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-3 py-1.5 text-xs font-medium hover:bg-current/5"
          >
            {isDark ? (
              <Sun className="h-3.5 w-3.5 text-[#D9A441]" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-3 py-1.5 text-xs font-medium hover:bg-current/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="relative z-10 mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-10 px-4 py-8 sm:px-6 md:py-12 lg:grid-cols-12">
        {/* Left Column: Editorial Context & Workspace Benefits */}
        <div className="space-y-6 lg:col-span-5">
          <div>
            <div className="text-xs font-semibold opacity-70">
              AGBA Workspace Identity
            </div>
            <h1 className="font-display mt-2 text-3xl font-bold leading-tight sm:text-4xl">
              {mode === 'signup'
                ? 'Create your workspace and launch your first AI assistant.'
                : 'Sign in to your AGBA Studio workspace.'}
            </h1>
            <p className="mt-3 text-sm leading-relaxed opacity-80">
              Upload your PDFs or docs, connect your Gemini, OpenAI, Claude, Mistral, or local
              Ollama model, and publish a cited chat link or REST API in under 60 seconds.
            </p>
          </div>

          <div className="space-y-4 border-t border-current/10 pt-6 text-xs">
            {[
              {
                num: '01',
                title: '6 Dedicated Service Studios & 12 Starter Templates',
                desc: 'Switch effortlessly between Knowledge Base, AI Model, Finance Calculator, External API, SEO Audit, and Notifications.',
              },
              {
                num: '02',
                title: 'Private Workspace Knowledge Base',
                desc: 'Every uploaded PDF, Word document, and vector passage is isolated strictly to your workspace.',
              },
              {
                num: '03',
                title: 'Zero Markup on Your API Keys',
                desc: 'Bring your own model key encrypted with AES-256-GCM on the server, or run local open-weights models.',
              },
            ].map((item) => (
              <div key={item.num} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2E8B57] dark:text-[#D9A441]" />
                <div>
                  <div className="font-semibold">
                    {item.num}. {item.title}
                  </div>
                  <p className="mt-0.5 leading-relaxed opacity-75">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Clean Sign In / Sign Up Card */}
        <div className="lg:col-span-7">
          <div
            className={`mx-auto max-w-md rounded-2xl border p-6 sm:p-8 ${
              isDark ? 'border-white/15 bg-[#141742]/80' : 'border-[#0F1226]/15 bg-white'
            }`}
          >
            {/* Mode Switcher Tabs */}
            {mode !== 'reset' && (
              <div
                className={`mb-6 grid grid-cols-2 gap-1 rounded-xl p-1 text-xs font-semibold ${
                  isDark ? 'bg-[#0E1030]' : 'bg-[#F3EDE0]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  className={`rounded-lg py-2.5 transition-colors ${
                    mode === 'signin'
                      ? 'bg-[#3B3FA8] text-[#FAF6EC] shadow-sm'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  className={`rounded-lg py-2.5 transition-colors ${
                    mode === 'signup'
                      ? 'bg-[#3B3FA8] text-[#FAF6EC] shadow-sm'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  Create Free Account
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <h2 className="font-display mt-2 text-xl font-bold">Reset your password</h2>
                <p className="mt-1 text-xs opacity-75">
                  Enter your account email and we will send you a password reset link.
                </p>
              </div>
            )}

            {/* 1-Click Google Sign-In */}
            {mode !== 'reset' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className={`flex w-full items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold transition-colors ${
                    isDark
                      ? 'border-white/20 bg-[#0E1030] text-[#FAF6EC] hover:border-[#D9A441]'
                      : 'border-[#0F1226]/20 bg-[#FAF6EC]/70 text-[#0F1226] hover:border-[#3B3FA8]'
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                    />
                  </svg>
                  <span>
                    {mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
                  </span>
                </button>

                <div className="my-5 flex items-center gap-3 text-xs opacity-60">
                  <div className="h-px flex-1 bg-current/20" />
                  <span>or continue with email &amp; password</span>
                  <div className="h-px flex-1 bg-current/20" />
                </div>
              </>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-xl border border-[#C84B31] bg-[#C84B31]/10 p-3 text-xs text-[#C84B31]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {statusMessage && (
              <div
                role="status"
                className="mb-4 flex items-start gap-2 rounded-xl border border-[#2E8B57] bg-[#2E8B57]/10 p-3 text-xs text-[#2E8B57]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4 text-xs">
              {mode === 'signup' && (
                <>
                  <div>
                    <label htmlFor="auth-fullname" className="mb-1.5 block font-semibold">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 opacity-50" />
                      <input
                        id="auth-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Akinola Olujobi"
                        className={`w-full rounded-xl border py-2.5 pr-3.5 pl-10 text-sm ${
                          isDark
                            ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-[#FAF6EC]/50 text-[#0F1226]'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-workspace" className="mb-1.5 block font-semibold">
                      Workspace or Company Name{' '}
                      <span className="font-normal opacity-65">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 opacity-50" />
                      <input
                        id="auth-workspace"
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        placeholder="e.g. Lagos Fintech Cooperative"
                        className={`w-full rounded-xl border py-2.5 pr-3.5 pl-10 text-sm ${
                          isDark
                            ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-[#FAF6EC]/50 text-[#0F1226]'
                        }`}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="mb-1.5 block font-semibold">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 opacity-50" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={`w-full rounded-xl border py-2.5 pr-3.5 pl-10 text-sm ${
                      isDark
                        ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                        : 'border-[#0F1226]/15 bg-[#FAF6EC]/50 text-[#0F1226]'
                    }`}
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="auth-password" className="font-semibold">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setErrorMessage(null);
                          setStatusMessage(null);
                        }}
                        className="font-medium text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 opacity-50" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={`w-full rounded-xl border py-2.5 pr-10 pl-10 text-sm ${
                        isDark
                          ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-[#FAF6EC]/50 text-[#0F1226]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute top-1/2 right-3 -translate-y-1/2 p-1 opacity-60 hover:opacity-100"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-5 py-3 text-sm font-bold text-[#0F1226] transition-colors hover:bg-[#c89332] disabled:opacity-50"
              >
                <span>
                  {isLoading
                    ? 'Please wait…'
                    : mode === 'signup'
                      ? 'Create Account & Open Studio'
                      : mode === 'reset'
                        ? 'Send Password Reset Link'
                        : 'Sign In to Workspace'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {mode !== 'reset' && (
              <div className="mt-5 border-t border-current/10 pt-4 text-center text-xs opacity-80">
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMessage(null);
                      }}
                      className="font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                    >
                      Create a free account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setErrorMessage(null);
                      }}
                      className="font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
