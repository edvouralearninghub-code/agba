import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  KeyRound,
  CheckCircle2,
  Lock,
  Server,
  Bell,
  Plus,
  Trash2,
  Play,
  Activity,
} from 'lucide-react';
import { ACADEMY_TEMPLATES } from '../data/academyTemplates.ts';
import type {
  AcademyTemplate,
  MaskedModelKeyRecord,
  ModelProvider,
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
  const [runningTplId, setRunningTplId] = useState<string | null>(null);
  const [quickResults, setQuickResults] = useState<
    Record<string, { answer: string; durationMs: number; modelUsed: string }>
  >({});

  useEffect(() => {
    setSelectedTrack(initialTrack);
  }, [initialTrack]);

  const filtered = ACADEMY_TEMPLATES.filter(
    (t) => selectedTrack === 'All' || t.track === selectedTrack
  );

  const handleQuickRunTemplate = async (tpl: AcademyTemplate) => {
    setRunningTplId(tpl.id);
    try {
      const res = await fetch('/api/studio/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: 'ws_trendtactics_lagos',
          appId: `app_${tpl.id}`,
          appName: tpl.title,
          prompt: tpl.samplePrompt,
          provider: runtimeMode === 'ollama' ? 'ollama' : 'gemini',
          allowedTools: tpl.allowedTools,
          activeTool: tpl.allowedTools[0],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setQuickResults((prev) => ({
          ...prev,
          [tpl.id]: {
            answer: data.answer,
            durationMs: data.durationMs,
            modelUsed: data.modelUsed,
          },
        }));
      }
    } catch {
      // ignore
    } finally {
      setRunningTplId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-current/10 pb-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs opacity-75">
            <span>AGBA Template Library</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {ACADEMY_TEMPLATES.length} executable workflows
            </span>
          </div>
          <h1 className="font-display mt-1.5 text-2xl font-bold">
            Run or Import Pre-Built AI Workflows
          </h1>
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
            Cloud API Keys (Gemini / OpenAI)
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
            className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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
      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((tpl, index) => {
          const result = quickResults[tpl.id];
          const isRunningThis = runningTplId === tpl.id;
          return (
            <article
              key={tpl.id}
              className={`flex flex-col justify-between rounded-xl border p-5 transition-colors ${
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
                  <span className="font-mono">
                    {runtimeMode === 'ollama' ? 'Llama 3.2 (Ollama)' : tpl.recommendedModel}
                  </span>
                </div>

                <h2 className="font-display mt-1.5 text-lg font-bold">{tpl.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed opacity-85">{tpl.summary}</p>

                <div
                  className={`mt-3 rounded-lg border p-2.5 text-xs ${
                    isDark
                      ? 'border-white/10 bg-[#0E1030]/70'
                      : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
                  }`}
                >
                  <span className="font-semibold opacity-75">Sample Input: </span>
                  <span className="italic">“{tpl.samplePrompt}”</span>
                </div>

                {result && (
                  <div
                    className={`mt-3 rounded-lg border border-[#2E8B57]/40 p-3 text-xs ${
                      isDark ? 'bg-[#0E1030]' : 'bg-[#FAF6EC]/80'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between font-mono text-[11px] font-semibold text-[#2E8B57]">
                      <span>Live Output ({result.modelUsed})</span>
                      <span>{result.durationMs}ms</span>
                    </div>
                    <p className="line-clamp-4 whitespace-pre-line text-xs leading-relaxed opacity-90">
                      {result.answer}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-current/10 pt-3.5">
                <button
                  type="button"
                  disabled={isRunningThis}
                  onClick={() => void handleQuickRunTemplate(tpl)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3 py-1.5 text-xs font-semibold hover:bg-current/5 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 text-[#2E8B57]" />
                  <span>{isRunningThis ? 'Running…' : 'Test Run Here'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onImportTemplate(tpl)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3.5 py-1.5 text-xs font-bold text-[#0F1226] transition-colors hover:bg-[#c89332]"
                >
                  <span>Open in Studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

interface BackendOverviewPayload {
  storageEngine: string;
  requiresExternalCloudKeys: boolean;
  activeWorkspaceId: string;
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
  onNavigateModule?: (module: 'studio' | 'academy' | 'freestack') => void;
  isDark: boolean;
}

export const SettingsAndSecurityView: React.FC<SettingsAndSecurityViewProps> = ({
  activeWorkspace,
  modelKeys,
  onAddMaskedKey,
  onWorkspaceCreated,
  onNavigateModule,
  isDark,
}) => {
  const [provider, setProvider] = useState<ModelProvider>('gemini');
  const [label, setLabel] = useState<string>('Production Assistant Key');
  const [rawKeyInput, setRawKeyInput] = useState<string>('');
  const [keyNotice, setKeyNotice] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  const [newWorkspaceName, setNewWorkspaceName] = useState<string>('');
  const [newWorkspaceCurrency, setNewWorkspaceCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);

  const [backendOverview, setBackendOverview] = useState<BackendOverviewPayload | null>(null);

  const loadBackendData = async () => {
    try {
      const overviewRes = await fetch(
        `/api/backend/overview?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        {
          headers: {
            'x-agba-workspace-id': activeWorkspace.id,
            'x-agba-role': activeWorkspace.memberRole,
          },
        }
      );
      if (overviewRes.ok) {
        setBackendOverview(await overviewRes.json());
      }
    } catch {
      // Ignore network fallback errors
    }
  };

  useEffect(() => {
    void loadBackendData();
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
      void loadBackendData();
    } else {
      setWorkspaceNotice(data.error || 'Failed to create workspace');
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyNotice(null);
    setKeyError(null);
    if (rawKeyInput.trim().length < 8) {
      setKeyError('API Key must be at least 8 characters.');
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
        rawApiKey: rawKeyInput.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setKeyError(data.error || 'Unable to save key.');
      return;
    }

    onAddMaskedKey(provider, label, rawKeyInput.trim());
    setRawKeyInput('');
    setKeyNotice(`Encrypted and saved key as "${data.maskedKey}".`);
    void loadBackendData();
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const res = await fetch(
        `/api/backend/keys/${encodeURIComponent(keyId)}?workspace_id=${encodeURIComponent(
          activeWorkspace.id
        )}`,
        {
          method: 'DELETE',
          headers: {
            'x-agba-workspace-id': activeWorkspace.id,
            'x-agba-role': activeWorkspace.memberRole,
          },
        }
      );
      if (res.ok) {
        void loadBackendData();
      }
    } catch {
      // ignore
    }
  };

  const serverKeys = (backendOverview?.maskedKeys || []).filter(
    (k) => k.id !== 'key_seed_gemini' && k.id !== 'key_seed_openai'
  );
  const sessionKeys = modelKeys.filter(
    (k) =>
      k.workspace_id === activeWorkspace.id &&
      !serverKeys.some((sk) => sk.maskedKey === k.maskedKey && sk.label === k.label)
  );
  const displayedKeys = [...serverKeys, ...sessionKeys];

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
            <span>Workspace Settings</span>
            <span aria-hidden="true">·</span>
            <span>{activeWorkspace.name}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">Role: {activeWorkspace.memberRole}</span>
          </div>
          <h1 className="font-display mt-1.5 text-2xl font-bold">
            API Keys (BYOK), Team Workspaces &amp; Execution Logs
          </h1>
        </div>
        {onNavigateModule && (
          <button
            type="button"
            onClick={() => onNavigateModule('studio')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D9A441] px-4 py-2 text-xs font-bold text-[#0F1226] hover:bg-[#c89332]"
          >
            <span>Back to Studio Workbench</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Section 1: BYOK Model Connections */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div
          className={`rounded-2xl border p-5 lg:col-span-5 ${
            isDark ? 'border-white/10 bg-[#141742]/70' : 'border-[#0F1226]/10 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <KeyRound className="h-4 w-4 text-[#D9A441]" />
            <h2>Connect Provider API Key (AES-256-GCM)</h2>
          </div>

          <form onSubmit={handleSaveKey} className="mt-4 space-y-3 text-xs">
            <div>
              <label className="mb-1 block font-semibold">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ModelProvider)}
                className={`w-full rounded-lg border px-3 py-2 font-semibold ${
                  isDark
                    ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                }`}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="mistral">Mistral AI</option>
                <option value="ollama">Local Ollama Endpoint</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold">Connection Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 ${
                  isDark
                    ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                }`}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold">API Key (Encrypted on Save)</label>
              <input
                type="password"
                value={rawKeyInput}
                onChange={(e) => setRawKeyInput(e.target.value)}
                placeholder="AIza... or sk-..."
                className={`w-full rounded-lg border px-3 py-2 font-mono ${
                  isDark
                    ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                }`}
              />
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-4 py-2.5 text-xs font-bold text-[#0F1226] hover:bg-[#c89332]"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Encrypt &amp; Save Key</span>
            </button>
            {keyNotice && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2E8B57]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{keyNotice}</span>
              </div>
            )}
            {keyError && <p className="text-xs font-semibold text-[#C84B31]">{keyError}</p>}
          </form>
        </div>

        <div
          className={`rounded-2xl border p-5 lg:col-span-7 ${
            isDark ? 'border-white/10 bg-[#141742]/70' : 'border-[#0F1226]/10 bg-white'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Connected Workspace Keys ({displayedKeys.length})
            </h3>
            <span className="font-mono text-xs opacity-70">{activeWorkspace.name}</span>
          </div>

          {displayedKeys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-current/15 p-8 text-center text-xs opacity-75">
              No custom API keys saved in <strong>{activeWorkspace.name}</strong> yet. Add a Gemini,
              OpenAI, Claude, Mistral, or Ollama key on the left.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-current/10 opacity-70">
                    <th className="py-2 pr-3">Provider</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Masked Key</th>
                    <th className="py-2 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/10">
                  {displayedKeys.map((rec) => (
                    <tr key={rec.id}>
                      <td className="py-3 pr-3 font-mono font-bold uppercase">{rec.provider}</td>
                      <td className="px-3 py-3">{rec.label}</td>
                      <td className="px-3 py-3 font-mono text-[#2E8B57]">{rec.maskedKey}</td>
                      <td className="py-3 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteKey(rec.id)}
                          className="inline-flex items-center gap-1 rounded border border-current/15 px-2 py-1 text-[11px] hover:border-[#C84B31] hover:text-[#C84B31]"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Revoke</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Create Workspace & Live Execution History */}
      <section className="grid gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleCreateWorkspace}
          className={`space-y-3 rounded-2xl border p-5 text-xs lg:col-span-5 ${
            isDark ? 'border-white/10 bg-[#141742]/70' : 'border-[#0F1226]/10 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-bold">
            <Server className="h-4 w-4 text-[#D9A441]" />
            <h2>Create New Isolated Workspace</h2>
          </div>
          <p className="opacity-75">
            Each workspace isolates its own documents, API keys, and published chat endpoints.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="e.g. Eko Fintech Studio"
              className={`flex-1 rounded-lg border px-3 py-2 ${
                isDark
                  ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                  : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
              }`}
            />
            <select
              value={newWorkspaceCurrency}
              onChange={(e) => setNewWorkspaceCurrency(e.target.value as 'NGN' | 'USD')}
              className={`rounded-lg border px-2.5 py-2 font-mono font-bold ${
                isDark
                  ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                  : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
              }`}
            >
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#D9A441] px-4 py-2 font-bold text-[#0F1226] hover:bg-[#c89332]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create</span>
            </button>
          </div>
          {workspaceNotice && (
            <p className="font-semibold text-[#2E8B57]">{workspaceNotice}</p>
          )}
        </form>

        <div
          className={`space-y-3 rounded-2xl border p-5 text-xs lg:col-span-7 ${
            isDark ? 'border-white/10 bg-[#141742]/70' : 'border-[#0F1226]/10 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold">
              <Activity className="h-4 w-4 text-[#D9A441]" />
              <span>Recent Studio Executions &amp; Alerts</span>
            </span>
            <span className="font-mono text-[11px] opacity-70">
              {(backendOverview?.recentRuns?.length || 0) +
                (backendOverview?.notifications?.length || 0)}{' '}
              event(s)
            </span>
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {(backendOverview?.recentRuns || []).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-current/10 p-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{run.prompt}</div>
                  <div className="text-[11px] opacity-70">
                    {run.appName} · {run.modelUsed}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-[#2E8B57]">
                  {run.durationMs}ms
                </span>
              </div>
            ))}
            {(backendOverview?.notifications || []).map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-current/10 p-2.5 text-[11px]"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Bell className="h-3 w-3 text-[#D9A441]" />
                    <span>{n.title}</span>
                  </span>
                  <span className="font-mono uppercase opacity-65">{n.channel}</span>
                </div>
                <p className="mt-0.5 opacity-80">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
