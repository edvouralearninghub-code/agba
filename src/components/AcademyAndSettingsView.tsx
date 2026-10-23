import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
  Server,
  ExternalLink,
  Bell,
  Plus,
} from 'lucide-react';
import { ACADEMY_TEMPLATES } from '../data/academyTemplates.ts';
import type {
  AcademyTemplate,
  MaskedModelKeyRecord,
  ModelProvider,
  SecurityTestSuiteReport,
  Workspace,
} from '../types/agba.ts';

interface AcademyViewProps {
  onImportTemplate: (template: AcademyTemplate) => void;
  initialTrack?: 'All' | 'Starter' | 'RAG Tutorial' | 'Advanced Multi-Agent';
  isDark: boolean;
}

export const AcademyView: React.FC<AcademyViewProps> = ({
  onImportTemplate,
  initialTrack = 'All',
  isDark,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<
    'All' | 'Starter' | 'RAG Tutorial' | 'Advanced Multi-Agent'
  >(initialTrack);
  const [runtimeMode, setRuntimeMode] = useState<'hosted' | 'ollama'>('hosted');

  useEffect(() => {
    setSelectedTrack(initialTrack);
  }, [initialTrack]);

  const filtered = ACADEMY_TEMPLATES.filter(
    (t) => selectedTrack === 'All' || t.track === selectedTrack
  );

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-current/10 pb-6 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs opacity-75">
            <span>AGBA Academy</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {ACADEMY_TEMPLATES.length} ready-to-run templates
            </span>
            <span aria-hidden="true">·</span>
            <span>Hosted Model Keys &amp; Local Llama compatible</span>
          </div>
          <h1 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
            Learn by Inspecting &amp; Running Real Agents
          </h1>
          <p className="mt-2 max-w-2xl text-sm opacity-85">
            Every tutorial below is a working multi-step workflow. Click &ldquo;Open in Studio&rdquo;
            to import its steps, instructions, and tools directly into your workspace.
          </p>
        </div>

        {/* Hosted vs Local Llama Runtime Toggle */}
        <div
          className={`inline-flex rounded-lg border p-1 ${
            isDark ? 'border-white/15 bg-[#1B1F5E]/40' : 'border-[#0F1226]/15 bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => setRuntimeMode('hosted')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              runtimeMode === 'hosted'
                ? 'bg-[#D9A441] font-semibold text-[#0F1226]'
                : 'opacity-75 hover:opacity-100'
            }`}
          >
            Hosted API Keys (Gemini / OpenAI)
          </button>
          <button
            type="button"
            onClick={() => setRuntimeMode('ollama')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              runtimeMode === 'ollama'
                ? 'bg-[#D9A441] font-semibold text-[#0F1226]'
                : 'opacity-75 hover:opacity-100'
            }`}
          >
            Local Llama (Ollama)
          </button>
        </div>
      </div>

      {/* Track Filter Buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(['All', 'Starter', 'RAG Tutorial', 'Advanced Multi-Agent'] as const).map((track) => (
          <button
            key={track}
            type="button"
            onClick={() => setSelectedTrack(track)}
            className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedTrack === track
                ? isDark
                  ? 'border-[#D9A441] bg-[#1B1F5E] text-[#D9A441]'
                  : 'border-[#3B3FA8] bg-[#3B3FA8] text-[#FAF6EC]'
                : 'border-current/15 opacity-80 hover:opacity-100'
            }`}
          >
            {track}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((tpl, index) => (
          <article
            key={tpl.id}
            className={`flex flex-col justify-between rounded-xl border p-6 transition-colors ${
              isDark
                ? 'border-white/10 bg-[#1B1F5E]/30 hover:border-white/25'
                : 'border-[#0F1226]/10 bg-white hover:border-[#0F1226]/25'
            }`}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs opacity-70">
                <span className="font-mono">0{index + 1}</span>
                <span aria-hidden="true">·</span>
                <span>{tpl.track}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{tpl.estimatedMinutes} min build</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{tpl.nodes.length} steps</span>
              </div>

              <h2 className="font-display mt-2 text-xl font-semibold">{tpl.title}</h2>
              <p className="mt-2 text-sm leading-relaxed opacity-85">{tpl.summary}</p>

              <div className="mt-4 space-y-1.5 border-t border-current/10 pt-3 text-xs opacity-80">
                <div>
                  <span className="font-semibold">Recommended Model: </span>
                  <span className="font-mono">
                    {runtimeMode === 'ollama' ? 'Llama 3.2 (Local Ollama)' : tpl.recommendedModel}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Enabled Tools: </span>
                  <span className="font-mono">{tpl.allowedTools.join(' · ')}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-current/10 pt-4">
              <span className="text-xs opacity-70">Imports directly into Studio canvas</span>
              <button
                type="button"
                onClick={() => onImportTemplate(tpl)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] transition-colors hover:bg-[#c89332] whitespace-nowrap shrink-0"
              >
                <span>Open in Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

interface BackendOverviewPayload {
  storageEngine: string;
  requiresExternalCloudKeys: boolean;
  activeWorkspaceId: string;
  openSourceModules: {
    name: string;
    repo: string;
    license: string;
    status: string;
    recordsCount: number;
  }[];
  workspaces: Workspace[];
  maskedKeys: MaskedModelKeyRecord[];
  recentRuns: {
    id: string;
    appName: string;
    prompt: string;
    modelUsed: string;
    durationMs: number;
    createdAt: string;
  }[];
  notifications: {
    id: string;
    workflowTrigger: string;
    channel: string;
    title: string;
    body: string;
    createdAt: string;
  }[];
}

interface SettingsAndSecurityViewProps {
  activeWorkspace: Workspace;
  modelKeys: MaskedModelKeyRecord[];
  onAddMaskedKey: (provider: ModelProvider, label: string, rawKey: string) => void;
  onWorkspaceCreated?: (ws: Workspace) => void;
  isDark: boolean;
}

export const SettingsAndSecurityView: React.FC<SettingsAndSecurityViewProps> = ({
  activeWorkspace,
  modelKeys,
  onAddMaskedKey,
  onWorkspaceCreated,
  isDark,
}) => {
  const [provider, setProvider] = useState<ModelProvider>('openai');
  const [label, setLabel] = useState<string>('Production Assistant Key');
  const [rawKeyInput, setRawKeyInput] = useState<string>('');
  const [keyNotice, setKeyNotice] = useState<string | null>(null);

  const [newWorkspaceName, setNewWorkspaceName] = useState<string>('');
  const [newWorkspaceCurrency, setNewWorkspaceCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);

  const [backendOverview, setBackendOverview] = useState<BackendOverviewPayload | null>(null);
  const [auditReport, setAuditReport] = useState<SecurityTestSuiteReport | null>(null);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  const [ssrfUrl, setSsrfUrl] = useState<string>('https://api.paystack.co/bank');
  const [ssrfResult, setSsrfResult] = useState<{ allowed: boolean; message: string } | null>(null);
  const [crossTenantResult, setCrossTenantResult] = useState<string | null>(null);

  const loadBackendData = async () => {
    setLoadingAudit(true);
    try {
      const [overviewRes, auditRes] = await Promise.all([
        fetch(`/api/backend/overview?workspace_id=${encodeURIComponent(activeWorkspace.id)}`, {
          headers: {
            'x-agba-workspace-id': activeWorkspace.id,
            'x-agba-role': activeWorkspace.memberRole,
          },
        }),
        fetch('/api/security/audit'),
      ]);
      if (overviewRes.ok) {
        setBackendOverview(await overviewRes.json());
      }
      if (auditRes.ok) {
        setAuditReport(await auditRes.json());
      }
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, [activeWorkspace.id, activeWorkspace.memberRole]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkspaceNotice(null);
    if (newWorkspaceName.trim().length < 2) return;
    const res = await fetch('/api/backend/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newWorkspaceName.trim(),
        currency: newWorkspaceCurrency,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewWorkspaceName('');
      setWorkspaceNotice(`Created workspace "${data.name}" and switched to it.`);
      if (onWorkspaceCreated) onWorkspaceCreated(data);
      loadBackendData();
    } else {
      setWorkspaceNotice(data.error || 'Failed to create workspace');
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyNotice(null);
    if (rawKeyInput.trim().length < 8) {
      setKeyNotice('Key must be at least 8 characters.');
      return;
    }

    const res = await fetch('/api/backend/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agba-workspace-id': activeWorkspace.id,
        'x-agba-role': activeWorkspace.memberRole,
      },
      body: JSON.stringify({
        workspace_id: activeWorkspace.id,
        provider,
        label,
        rawApiKey: rawKeyInput,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setKeyNotice(`Unable to save key: ${data.error}`);
      return;
    }

    onAddMaskedKey(provider, label, rawKeyInput);
    setRawKeyInput('');
    setKeyNotice(`Encrypted and saved key as "${data.maskedKey}".`);
    loadBackendData();
  };

  const handleTestSsrf = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/security/ssrf-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: ssrfUrl }),
    });
    const data = await res.json();
    setSsrfResult({
      allowed: Boolean(data.allowed),
      message: data.allowed ? data.message : data.error,
    });
  };

  const handleSimulateCrossTenantAttempt = async () => {
    const otherWorkspace =
      activeWorkspace.id === 'ws_trendtactics_lagos'
        ? 'ws_savannah_labs'
        : 'ws_trendtactics_lagos';

    const res = await fetch(
      `/api/rag/chunks?workspace_id=${encodeURIComponent(
        activeWorkspace.id
      )}&target_workspace_id=${encodeURIComponent(otherWorkspace)}`,
      {
        headers: {
          'x-agba-workspace-id': activeWorkspace.id,
          'x-agba-role': activeWorkspace.memberRole,
        },
      }
    );
    const data = await res.json();
    setCrossTenantResult(
      res.status === 403
        ? 'Verified: Cross-workspace document access was blocked automatically.'
        : data.error
    );
  };

  const displayedKeys =
    backendOverview?.maskedKeys && backendOverview.maskedKeys.length > 0
      ? backendOverview.maskedKeys
      : modelKeys.filter((k) => k.workspace_id === activeWorkspace.id);

  return (
    <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-current/10 pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
          <span>Workspace Settings &amp; Model Connections</span>
          <span aria-hidden="true">·</span>
          <span>{activeWorkspace.name}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">Role: {activeWorkspace.memberRole}</span>
        </div>
        <h1 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
          Model Keys, Team Workspaces &amp; Platform Services
        </h1>
        <p className="mt-1 max-w-3xl text-xs opacity-80">
          Manage your Bring-Your-Own-Key (BYOK) model connections, create isolated team workspaces,
          and monitor your active open-source services.
        </p>
      </div>

      {/* Section 1: BYOK Model Connections */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-[#D9A441]" />
            <h2>Bring-Your-Own-Key (BYOK) Connections</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed opacity-80">
            Connect your own OpenAI, Anthropic, Google Gemini, Mistral, or local Ollama endpoints.
            Keys are encrypted on the server and displayed in masked form showing only the last 4
            characters.
          </p>

          <form onSubmit={handleSaveKey} className="mt-4 space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-medium">Model Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ModelProvider)}
                className={`w-full rounded-lg border px-3 py-2 ${
                  isDark
                    ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                }`}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="mistral">Mistral AI</option>
                <option value="ollama">Ollama / Local Llama Endpoint</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium">Connection Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 ${
                  isDark
                    ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                }`}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">
                API Key or Local Endpoint Token (Masked on Save)
              </label>
              <input
                type="password"
                value={rawKeyInput}
                onChange={(e) => setRawKeyInput(e.target.value)}
                placeholder="Enter provider key..."
                className={`w-full rounded-lg border px-3 py-2 font-mono ${
                  isDark
                    ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                }`}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332]"
            >
              <Lock className="h-3.5 w-3.5" />
              Encrypt &amp; Save Connection
            </button>
            {keyNotice && (
              <p className="text-[11px] font-medium text-[#2E8B57] dark:text-[#D9A441]">
                {keyNotice}
              </p>
            )}
          </form>
        </div>

        <div className="lg:col-span-7">
          <div
            className={`rounded-xl border p-5 ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/25' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold">
                Connected Model Keys ({displayedKeys.length})
              </h3>
              <span className="text-[11px] opacity-65">{activeWorkspace.name}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-current/10 opacity-70">
                    <th className="py-2 pr-3">Provider</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Masked Key</th>
                    <th className="py-2 pl-3 text-right">Protection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/10">
                  {displayedKeys.map((rec) => (
                    <tr key={rec.id}>
                      <td className="py-3 pr-3 font-semibold uppercase">{rec.provider}</td>
                      <td className="px-3 py-3">{rec.label}</td>
                      <td className="px-3 py-3 font-mono">{rec.maskedKey}</td>
                      <td className="py-3 pl-3 text-right text-[11px] font-medium text-[#2E8B57] dark:text-[#D9A441]">
                        Encrypted
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Interactive Privacy & Safe Web Tool Verification */}
            <div className="mt-6 grid gap-4 border-t border-current/10 pt-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold">Workspace Data Privacy Check</div>
                <p className="mt-1 text-[11px] opacity-75">
                  Verify that documents uploaded to another workspace cannot be accessed from{' '}
                  <span className="font-medium">{activeWorkspace.name}</span>.
                </p>
                <button
                  type="button"
                  onClick={handleSimulateCrossTenantAttempt}
                  className="mt-2 rounded-lg border border-current/20 px-3 py-1.5 text-xs font-medium hover:bg-current/5"
                >
                  Test Workspace Isolation
                </button>
                {crossTenantResult && (
                  <p className="mt-2 text-[11px] font-medium text-[#2E8B57] dark:text-[#D9A441]">
                    {crossTenantResult}
                  </p>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold">Outbound Web Request Safety Check</div>
                <form onSubmit={handleTestSsrf} className="mt-1.5 space-y-2">
                  <input
                    type="text"
                    value={ssrfUrl}
                    onChange={(e) => setSsrfUrl(e.target.value)}
                    aria-label="URL to test"
                    className={`w-full rounded border px-2.5 py-1 font-mono text-[11px] ${
                      isDark
                        ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                        : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                    }`}
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-current/20 px-3 py-1 text-xs font-medium hover:bg-current/5"
                  >
                    Verify Endpoint Safety
                  </button>
                </form>
                {ssrfResult && (
                  <p
                    className={`mt-1.5 text-[11px] ${
                      ssrfResult.allowed ? 'text-[#2E8B57]' : 'text-[#C2413B]'
                    }`}
                  >
                    {ssrfResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Team Workspaces & Active Open-Source Services */}
      {backendOverview && (
        <section className="space-y-4 border-t border-current/10 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Server className="h-4 w-4 text-[#D9A441]" />
              <h2>Team Workspaces &amp; Integrated Open-Source Services</h2>
            </div>
            <span className="text-xs font-medium text-[#2E8B57] dark:text-[#D9A441]">
              Self-Hosted Ready · Zero External Cloud Fees Required
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleCreateWorkspace}
              className={`rounded-xl border p-4 text-xs lg:col-span-5 ${
                isDark ? 'border-white/10 bg-[#1B1F5E]/25' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div className="font-semibold">Create New Team Workspace</div>
              <p className="mt-1 opacity-75">
                Provision a dedicated workspace for a new project, department, or agency client.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Eko Fintech Studio"
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    isDark
                      ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                      : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                  }`}
                />
                <select
                  value={newWorkspaceCurrency}
                  onChange={(e) => setNewWorkspaceCurrency(e.target.value as 'NGN' | 'USD')}
                  className={`rounded-lg border px-2.5 py-2 font-mono ${
                    isDark
                      ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                      : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                  }`}
                >
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#D9A441] px-3.5 py-2 font-semibold text-[#0F1226] hover:bg-[#c89332] whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create
                </button>
              </div>
              {workspaceNotice && (
                <p className="mt-2 text-[11px] font-medium text-[#2E8B57] dark:text-[#D9A441]">
                  {workspaceNotice}
                </p>
              )}
            </form>

            <div
              className={`rounded-xl border p-4 text-xs lg:col-span-7 ${
                isDark ? 'border-white/10 bg-[#1B1F5E]/25' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Bell className="h-3.5 w-3.5 text-[#D9A441]" />
                  Recent Workspace Notifications &amp; Activity
                </span>
                <span className="font-mono text-[11px] opacity-70">
                  {backendOverview.notifications.length} event(s)
                </span>
              </div>
              <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                {backendOverview.notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded border border-current/10 p-2 text-[11px]"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{n.title}</span>
                      <span className="opacity-65 capitalize">{n.channel}</span>
                    </div>
                    <p className="mt-0.5 opacity-80">{n.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`overflow-x-auto rounded-xl border ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/25' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-current/10 opacity-75">
                  <th className="py-3 pr-3 pl-4">Platform Service</th>
                  <th className="px-3 py-3">Open-Source Foundation</th>
                  <th className="px-3 py-3">License</th>
                  <th className="py-3 pr-4 pl-3 text-right">Active Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/10">
                {backendOverview.openSourceModules.map((mod) => (
                  <tr key={mod.name}>
                    <td className="py-3 pr-3 pl-4 font-semibold">{mod.name}</td>
                    <td className="px-3 py-3 font-mono">
                      <a
                        href={mod.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                      >
                        <span>{mod.repo.replace('https://github.com/', '')}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-3 py-3 font-mono">{mod.license}</td>
                    <td className="py-3 pr-4 pl-3 text-right font-mono tabular-nums font-semibold">
                      {mod.recordsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section 3: Automated Platform Protection & Readability Checks */}
      <section className="border-t border-current/10 pt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-[#2E8B57] dark:text-[#D9A441]" />
              <h2>Platform Protection &amp; Accessibility Status</h2>
            </div>
            <p className="mt-1 text-xs opacity-75">
              Automated checks verifying workspace isolation, key encryption, and reading contrast.
            </p>
          </div>
          <button
            type="button"
            onClick={loadBackendData}
            disabled={loadingAudit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3.5 py-1.5 text-xs font-medium hover:bg-current/5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        {auditReport && (
          <div
            className={`overflow-x-auto rounded-xl border ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-current/10 opacity-75">
                  <th className="py-3 pr-3 pl-4">Protection Area</th>
                  <th className="px-3 py-3">Verification Summary</th>
                  <th className="py-3 pr-4 pl-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/10">
                {auditReport.results.map((item, i) => (
                  <tr key={i}>
                    <td className="py-3 pr-3 pl-4 align-top font-semibold whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-semibold">{item.name}</div>
                      <div className="mt-0.5 opacity-75">{item.detail}</div>
                    </td>
                    <td className="py-3 pr-4 pl-3 text-right align-top font-mono whitespace-nowrap">
                      {item.passed ? (
                        <span className="inline-flex items-center gap-1 text-[#2E8B57] dark:text-[#D9A441]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#C2413B]">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Needs Review
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
