import React, { useState } from 'react';
import { CreditCard, ShieldCheck, BellRing, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Workspace } from '../types/agba.ts';

interface BillingViewProps {
  activeWorkspace: Workspace;
  onChangeCurrency: (currency: 'NGN' | 'USD') => void;
  isDark: boolean;
}

export const BillingView: React.FC<BillingViewProps> = ({
  activeWorkspace,
  onChangeCurrency,
  isDark,
}) => {
  const [webhookEventId, setWebhookEventId] = useState<string>('evt_paystack_lagos_2026_001');
  const [webhookAmount, setWebhookAmount] = useState<number>(1500000); // 15,000.00 in kobo
  const [tamperSig, setTamperSig] = useState<boolean>(false);
  const [webhookResult, setWebhookResult] = useState<{
    verified: boolean;
    idempotentReplay?: boolean;
    message: string;
  } | null>(null);

  const handleTestWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/billing/paystack-webhook-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: webhookEventId,
        amountSmallestUnit: Number(webhookAmount),
        currency: activeWorkspace.currency,
        tamperSignature: tamperSig,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.verified) {
      setWebhookResult({
        verified: false,
        message: data.error || 'Webhook verification failed.',
      });
    } else {
      setWebhookResult({
        verified: true,
        idempotentReplay: data.idempotentReplay,
        message: data.idempotentReplay
          ? `Idempotent Replay Detected for event "${data.eventId}": No double-charge or double-credit applied.`
          : `Verified HMAC-SHA512 signature for event "${data.eventId}" (${data.amountSmallestUnit.toLocaleString()} ${
              data.currency === 'NGN' ? 'kobo' : 'cents'
            }).`,
      });
    }
  };

  const plans = [
    {
      name: 'Free Starter',
      audience: 'For students, solo builders & early prototypes',
      priceDisplay: '[PRICE_TBD] (Free Tier)',
      quotas: [
        '1 Workspace (Appwrite Team)',
        'Up to 3 Studio workflows & 50 MB RAG document storage',
        'Bring Your Own Key (Gemini, OpenAI, Anthropic, Mistral, Ollama)',
        'Full access to AGBA Free Stack & Academy templates',
      ],
    },
    {
      name: 'Builder',
      audience: 'For founders & SMEs shipping customer-facing AI apps',
      priceDisplay: `[PRICE_TBD] / month (${activeWorkspace.currency})`,
      quotas: [
        'Up to 5 team members with Owner/Admin/Member/Viewer roles',
        '25 Studio apps with custom shareable chat pages & REST API keys',
        '2 GB Neon pgvector storage with workspace_id isolation',
        'Novu workflow failure & quota warning email/in-app alerts',
      ],
    },
    {
      name: 'Team & Agency',
      audience: 'For agencies & multi-client delivery teams',
      priceDisplay: `[PRICE_TBD] / month (${activeWorkspace.currency})`,
      quotas: [
        'Unlimited client workspaces with strict cross-tenant isolation',
        'Dedicated rate limits & audit log exports',
        'Priority webhook & custom tool allowlist governance',
        'Novu SMS, email, and in-app notification pipelines',
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-current/10 pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs opacity-75">
            <span>Workspace Billing &amp; Quotas</span>
            <span aria-hidden="true">·</span>
            <span>{activeWorkspace.name}</span>
            <span aria-hidden="true">·</span>
            <span>Current Plan: {activeWorkspace.planTier.toUpperCase()}</span>
          </div>
          <h1 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
            Plans, Usage Quotas &amp; Payment Verification
          </h1>
          <p className="mt-1 text-xs opacity-80">
            Switch between NGN and USD billing. Plan prices display{' '}
            <span className="font-mono">[PRICE_TBD]</span> until finalized by the owner.
          </p>
        </div>

        {/* NGN / USD Currency Switcher */}
        <div
          className={`inline-flex rounded-lg border p-1 ${
            isDark ? 'border-white/15 bg-[#1B1F5E]/40' : 'border-[#0F1226]/15 bg-white'
          }`}
        >
          {(['NGN', 'USD'] as const).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => onChangeCurrency(curr)}
              className={`rounded-md px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeWorkspace.currency === curr
                  ? 'bg-[#D9A441] text-[#0F1226]'
                  : 'opacity-75 hover:opacity-100'
              }`}
            >
              {curr === 'NGN' ? 'NGN (₦)' : 'USD ($)'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan, idx) => (
          <div
            key={plan.name}
            className={`flex flex-col justify-between rounded-xl border p-6 ${
              idx === 1
                ? isDark
                  ? 'border-[#D9A441] bg-[#1B1F5E]/50'
                  : 'border-[#3B3FA8] bg-white'
                : isDark
                  ? 'border-white/10 bg-[#1B1F5E]/25'
                  : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div>
              <div className="text-xs opacity-75">{plan.audience}</div>
              <h2 className="font-display mt-1 text-xl font-bold">{plan.name}</h2>
              <div className="mt-4 border-y border-current/10 py-3 font-mono text-base font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                {plan.priceDisplay}
              </div>
              <ul className="mt-4 space-y-2.5 text-xs leading-relaxed">
                {plan.quotas.map((q) => (
                  <li key={q} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2E8B57] dark:text-[#D9A441]" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4">
              <button
                type="button"
                onClick={() => {
                  setWebhookEventId(`evt_${plan.name.toLowerCase().replace(/\s+/g, '_')}_01`);
                }}
                className={`w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
                  idx === 1
                    ? 'bg-[#D9A441] text-[#0F1226] hover:bg-[#c89332]'
                    : 'border border-current/20 hover:bg-current/5'
                }`}
              >
                Select {plan.name} Plan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Paystack Webhook & Notification Workflows */}
      <div className="grid gap-8 border-t border-current/10 pt-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-[#D9A441]" />
            <h2>Paystack Payment Verification &amp; Duplicate-Charge Protection</h2>
          </div>
          <p className="mt-1 text-xs opacity-80">
            Verifies payment events automatically and prevents duplicate webhook deliveries from
            double-charging or double-crediting your workspace.
          </p>

          <form
            onSubmit={handleTestWebhook}
            className={`mt-4 space-y-3 rounded-xl border p-5 text-xs ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium">Paystack Event ID</label>
                <input
                  type="text"
                  value={webhookEventId}
                  onChange={(e) => setWebhookEventId(e.target.value)}
                  className={`w-full rounded border px-3 py-2 font-mono ${
                    isDark
                      ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                      : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">
                  Amount in Smallest Unit ({activeWorkspace.currency === 'NGN' ? 'kobo' : 'cents'})
                </label>
                <input
                  type="number"
                  value={webhookAmount}
                  onChange={(e) => setWebhookAmount(Number(e.target.value))}
                  className={`w-full rounded border px-3 py-2 font-mono tabular-nums ${
                    isDark
                      ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                      : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                  }`}
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={tamperSig}
                onChange={(e) => setTamperSig(e.target.checked)}
                className="accent-[#C2413B]"
              />
              <span>Simulate forged/tampered x-paystack-signature header (must fail)</span>
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332]"
              >
                Send Signed Webhook Event
              </button>
              <span className="text-[11px] opacity-70">
                Click twice with the same Event ID to verify replay idempotency.
              </span>
            </div>

            {webhookResult && (
              <div
                className={`mt-3 flex items-start gap-2 rounded-lg border p-3 font-mono text-[11px] ${
                  webhookResult.verified
                    ? 'border-[#2E8B57] bg-[#2E8B57]/10 text-[#2E8B57] dark:text-[#D9A441]'
                    : 'border-[#C2413B] bg-[#C2413B]/10 text-[#C2413B]'
                }`}
              >
                {webhookResult.verified ? (
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>{webhookResult.message}</span>
              </div>
            )}
          </form>
        </div>

        {/* Novu Transactional Notification Workflows */}
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BellRing className="h-4 w-4 text-[#D9A441]" />
            <h2>Novu Notification Workflows</h2>
          </div>
          <p className="mt-1 text-xs opacity-80">
            Configured notification triggers for workspace owners and billing admins (MIT core).
          </p>
          <div
            className={`mt-4 divide-y divide-current/10 rounded-xl border text-xs ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            {[
              { id: 'novu-welcome', name: 'Workspace Welcome & Quickstart Guide', channel: 'Email · In-App' },
              { id: 'novu-run-fail', name: 'Workflow-Run Failure Alert', channel: 'In-App · Email' },
              { id: 'novu-quota-warn', name: '80% Monthly Quota Warning', channel: 'In-App · Email' },
              { id: 'novu-payment-ok', name: 'Paystack Receipt & Plan Upgrade', channel: 'Email' },
              { id: 'novu-payment-fail', name: 'Subscription Renewal Failure', channel: 'Email · SMS' },
            ].map((wf) => (
              <div key={wf.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-semibold">{wf.name}</div>
                  <div className="font-mono text-[11px] opacity-65">{wf.id}</div>
                </div>
                <span className="font-mono text-[11px] opacity-80">{wf.channel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
