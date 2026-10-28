import React, { useState, useEffect } from 'react';
import {
  Code2,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Download,
  Sparkles,
  Trash2,
  Smartphone,
  Monitor,
  Save,
  CheckCircle2,
} from 'lucide-react';
import type { Workspace } from '../types/agba.ts';

interface GeneratedWebAppItem {
  id: string;
  workspace_id: string;
  slug: string;
  title: string;
  description: string;
  templateType: 'fintech' | 'ecommerce' | 'saas' | 'agency' | 'custom';
  primaryColor: string;
  currency: 'NGN' | 'USD';
  htmlCode: string;
  createdAt: string;
  updatedAt: string;
}

interface WebAppBuilderWorkbenchProps {
  activeWorkspace: Workspace;
  reqHeaders: Record<string, string>;
  cardSurface: string;
  inputSurface: string;
}

const BLUEPRINT_PRESETS: {
  label: string;
  title: string;
  templateType: 'fintech' | 'ecommerce' | 'saas' | 'agency';
  color: string;
  description: string;
}[] = [
  {
    label: 'Lagos Fintech Portal',
    title: 'KoboPay SME Settlement & Checkout Portal',
    templateType: 'fintech',
    color: '#1D3557',
    description:
      'Fintech landing page and merchant onboarding portal with interactive NGN pricing estimator and live customer database registration.',
  },
  {
    label: 'E-Commerce Storefront',
    title: 'Eko Craft & Retail Direct Storefront',
    templateType: 'ecommerce',
    color: '#0F766E',
    description:
      'Modern direct-to-consumer storefront with product catalog highlights, bulk order calculator, and instant customer order capture.',
  },
  {
    label: 'AI SaaS Dashboard',
    title: 'NaijaOps Automated Workflow SaaS',
    templateType: 'saas',
    color: '#4F46E5',
    description:
      'B2B SaaS product website with seat-based subscription calculator, feature showcase, and live workspace trial signup form.',
  },
  {
    label: 'Agency Client Portal',
    title: 'Trendtactics Digital Growth Agency Portal',
    templateType: 'agency',
    color: '#9A3412',
    description:
      'Client onboarding and retainer booking portal with interactive project scope estimator and direct lead capture into AGBA tables.',
  },
];

export const WebAppBuilderWorkbench: React.FC<WebAppBuilderWorkbenchProps> = ({
  activeWorkspace,
  reqHeaders,
  cardSurface,
  inputSurface,
}) => {
  const [apps, setApps] = useState<GeneratedWebAppItem[]>([]);
  const [selectedApp, setSelectedApp] = useState<GeneratedWebAppItem | null>(null);
  const [title, setTitle] = useState<string>('KoboPay SME Settlement & Checkout Portal');
  const [description, setDescription] = useState<string>(
    'Fintech landing page and merchant onboarding portal with interactive NGN pricing estimator and live customer database registration.'
  );
  const [templateType, setTemplateType] = useState<
    'fintech' | 'ecommerce' | 'saas' | 'agency' | 'custom'
  >('fintech');
  const [primaryColor, setPrimaryColor] = useState<string>('#1D3557');
  const [currency, setCurrency] = useState<'NGN' | 'USD'>(activeWorkspace.currency);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSavingCode, setIsSavingCode] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'preview' | 'code'>('preview');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [editableHtml, setEditableHtml] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const loadWorkspaceApps = async () => {
    try {
      const res = await fetch(
        `/api/studio/web-apps?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        { headers: reqHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        const list: GeneratedWebAppItem[] = data.apps || [];
        setApps(list);
        if (list.length > 0 && !selectedApp) {
          setSelectedApp(list[0]);
          setEditableHtml(list[0].htmlCode);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setSelectedApp(null);
    void loadWorkspaceApps();
  }, [activeWorkspace.id]);

  const handleGenerateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/studio/web-builder/generate', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          title,
          description,
          templateType,
          primaryColor,
          currency,
          useAiModel: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.app) {
        setApps(data.apps || []);
        setSelectedApp(data.app);
        setEditableHtml(data.app.htmlCode);
        setViewTab('preview');
        setStatusMessage(
          `Built & hosted "${data.app.title}" in ${data.durationMs}ms (${data.generatorUsed}).`
        );
      } else {
        setStatusMessage(data.error || 'Could not generate web app.');
      }
    } catch {
      setStatusMessage('Network error while generating web app.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEditedHtml = async () => {
    if (!selectedApp || !editableHtml.trim()) return;
    setIsSavingCode(true);
    try {
      const res = await fetch(`/api/studio/web-apps/${encodeURIComponent(selectedApp.id)}`, {
        method: 'PUT',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          title: selectedApp.title,
          description: selectedApp.description,
          templateType: selectedApp.templateType,
          primaryColor: selectedApp.primaryColor,
          currency: selectedApp.currency,
          htmlCode: editableHtml,
        }),
      });
      const data = await res.json();
      if (res.ok && data.app) {
        setSelectedApp(data.app);
        setApps(data.apps || []);
        setStatusMessage('Saved custom HTML/Tailwind code changes to live hosted URL.');
      }
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleDeleteApp = async (id: string) => {
    try {
      const res = await fetch(
        `/api/studio/web-apps/${encodeURIComponent(id)}?workspace_id=${encodeURIComponent(
          activeWorkspace.id
        )}`,
        {
          method: 'DELETE',
          headers: reqHeaders,
        }
      );
      if (res.ok) {
        const data = await res.json();
        const nextList: GeneratedWebAppItem[] = data.apps || [];
        setApps(nextList);
        if (selectedApp?.id === id) {
          setSelectedApp(nextList[0] || null);
          setEditableHtml(nextList[0]?.htmlCode || '');
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDownloadHtml = () => {
    if (!selectedApp) return;
    const blob = new Blob([editableHtml || selectedApp.htmlCode], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedApp.slug || 'agba-webapp'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hostedPath = selectedApp
    ? `/apps/${encodeURIComponent(activeWorkspace.id)}/${encodeURIComponent(selectedApp.slug)}`
    : '';
  const fullHostedUrl =
    typeof window !== 'undefined' && hostedPath ? `${window.location.origin}${hostedPath}` : hostedPath;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Column: Builder Controls & Saved Apps */}
      <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-5 ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold">
              AI Website &amp; Web App Builder
            </h2>
            <p className="text-[11px] opacity-75">
              Generates live HTML5 + Tailwind + JS websites wired to your workspace database.
            </p>
          </div>
          <span className="rounded bg-[#D9A441]/20 px-2 py-0.5 font-mono text-[10px] font-bold text-[#D9A441]">
            LIVE HOSTING
          </span>
        </div>

        {/* Quick Blueprint Presets */}
        <div>
          <div className="mb-1.5 text-[11px] font-semibold opacity-75">
            1-Click Starter Blueprints:
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {BLUEPRINT_PRESETS.map((bp) => (
              <button
                key={bp.label}
                type="button"
                onClick={() => {
                  setTitle(bp.title);
                  setDescription(bp.description);
                  setTemplateType(bp.templateType);
                  setPrimaryColor(bp.color);
                }}
                className="rounded-lg border border-current/15 px-2.5 py-2 text-left text-[11px] font-medium hover:border-[#D9A441] transition"
              >
                {bp.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleGenerateApp} className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block font-semibold">Website or App Name</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lagos Logistics Customer Portal"
              className={`w-full rounded-lg border px-3 py-2 text-xs ${inputSurface}`}
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold">
              What should this website or app do?
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the sections, pricing calculator, lead capture form, and target audience..."
              className={`w-full rounded-xl border p-2.5 text-xs ${inputSurface}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block font-semibold">App Type</label>
              <select
                value={templateType}
                onChange={(e) =>
                  setTemplateType(
                    e.target.value as 'fintech' | 'ecommerce' | 'saas' | 'agency' | 'custom'
                  )
                }
                className={`w-full rounded-lg border px-2 py-2 text-xs ${inputSurface}`}
              >
                <option value="fintech">Fintech</option>
                <option value="ecommerce">Storefront</option>
                <option value="saas">SaaS App</option>
                <option value="agency">Agency</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'NGN' | 'USD')}
                className={`w-full rounded-lg border px-2 py-2 font-mono text-xs font-bold ${inputSurface}`}
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold">Brand Color</label>
              <div className="flex items-center gap-1.5 pt-1">
                {['#1D3557', '#0F766E', '#9A3412', '#4F46E5', '#15803D'].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setPrimaryColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`h-5 w-5 rounded-full border ${
                      primaryColor === hex ? 'ring-2 ring-[#D9A441] ring-offset-1' : 'opacity-75'
                    }`}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-4 py-2.5 text-xs font-bold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {isGenerating
                ? 'Building & Deploying Website…'
                : 'Generate & Host Live Website / App'}
            </span>
          </button>
        </form>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-[#2E8B57]/40 bg-[#2E8B57]/10 p-2.5 text-xs text-[#2E8B57]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Saved Workspace Websites List */}
        <div className="border-t border-current/10 pt-3">
          <div className="mb-2 text-xs font-bold">
            Hosted Websites &amp; Apps in {activeWorkspace.name} ({apps.length})
          </div>
          <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
            {apps.map((appItem) => (
              <div
                key={appItem.id}
                className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs transition ${
                  selectedApp?.id === appItem.id
                    ? 'border-[#D9A441] bg-[#D9A441]/10'
                    : inputSurface
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedApp(appItem);
                    setEditableHtml(appItem.htmlCode);
                  }}
                  className="flex-1 text-left"
                >
                  <div className="font-semibold">{appItem.title}</div>
                  <div className="font-mono text-[10px] opacity-70">
                    /apps/{activeWorkspace.id}/{appItem.slug}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <a
                    href={`/apps/${encodeURIComponent(activeWorkspace.id)}/${encodeURIComponent(
                      appItem.slug
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1 hover:bg-current/10"
                    title="Open live website in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {apps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteApp(appItem.id)}
                      className="rounded p-1 text-[#C84B31] hover:bg-[#C84B31]/10"
                      title="Delete website"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Live Interactive Preview & Source Code Editor */}
      <div className={`flex flex-col space-y-3 rounded-2xl border p-5 lg:col-span-7 ${cardSurface}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewTab('preview')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                viewTab === 'preview'
                  ? 'bg-[#2B3A8C] text-white'
                  : 'border border-current/15 opacity-80'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Live App Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab('code')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                viewTab === 'code'
                  ? 'bg-[#2B3A8C] text-white'
                  : 'border border-current/15 opacity-80'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Edit Source Code (HTML/Tailwind)</span>
            </button>
          </div>

          {selectedApp && (
            <div className="flex flex-wrap items-center gap-1.5">
              {viewTab === 'preview' && (
                <div className="flex items-center rounded-lg border border-current/15 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewportMode('desktop')}
                    className={`rounded px-2 py-1 text-[11px] ${
                      viewportMode === 'desktop' ? 'bg-current/10 font-bold' : 'opacity-60'
                    }`}
                    title="Desktop View"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('mobile')}
                    className={`rounded px-2 py-1 text-[11px] ${
                      viewportMode === 'mobile' ? 'bg-current/10 font-bold' : 'opacity-60'
                    }`}
                    title="Mobile View"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(fullHostedUrl);
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2000);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-current/5"
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-[#2E8B57]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedUrl ? 'Copied URL' : 'Copy Live URL'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-current/5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .html</span>
              </button>

              <a
                href={hostedPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-[#2E8B57] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-95"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Live Website</span>
              </a>
            </div>
          )}
        </div>

        {selectedApp ? (
          viewTab === 'preview' ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-black/5 rounded-xl p-2 min-h-[520px]">
              <iframe
                title={selectedApp.title}
                srcDoc={editableHtml || selectedApp.htmlCode}
                className={`rounded-xl border border-current/15 bg-white shadow-sm transition-all ${
                  viewportMode === 'mobile' ? 'w-[375px] h-[520px]' : 'w-full h-[520px]'
                }`}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs opacity-75">
                  {selectedApp.slug}.html — Single-File HTML5 + Tailwind CSS + BaaS Form Wiring
                </span>
                <button
                  type="button"
                  disabled={isSavingCode}
                  onClick={() => void handleSaveEditedHtml()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3 py-1.5 text-xs font-bold text-[#0F1226]"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingCode ? 'Saving…' : 'Save Code Changes'}</span>
                </button>
              </div>
              <textarea
                value={editableHtml}
                onChange={(e) => setEditableHtml(e.target.value)}
                rows={22}
                className={`w-full flex-1 rounded-xl border p-3 font-mono text-xs leading-relaxed ${inputSurface}`}
              />
            </div>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-current/15 p-12 text-center text-xs opacity-70">
            Click <strong>Generate &amp; Host Live Website / App</strong> on the left to build your first website.
          </div>
        )}
      </div>
    </div>
  );
};
