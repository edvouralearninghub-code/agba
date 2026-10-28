import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Plus,
  Upload,
  Share2,
  Database,
  Cpu,
  Calculator,
  Globe,
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  FileUp,
  FileText,
  Trash2,
  Send,
  Terminal,
  X,
  Code2,
  Layers,
  Mail,
} from 'lucide-react';
import {
  ACADEMY_TEMPLATES,
  STUDIO_SERVICE_REPRESENTATIONS,
  type StudioServiceRepresentation,
} from '../data/academyTemplates.ts';
import { WebAppBuilderWorkbench } from './WebAppBuilderWorkbench.tsx';
import {
  SupabaseDatabaseWorkbench,
  EmailAcrossBoardWorkbench,
} from './DatabaseAndEmailWorkbenches.tsx';
import type {
  AcademyTemplate,
  ModelProvider,
  RagDocumentChunk,
  StudioNode,
  StudioWorkflowApp,
  Workspace,
} from '../types/agba.ts';

interface StudioWorkspaceProps {
  activeWorkspace: Workspace;
  workflow: StudioWorkflowApp;
  onUpdateWorkflow: (updated: StudioWorkflowApp) => void;
  onSelectTemplate?: (tpl: AcademyTemplate) => void;
  onOpenPublicChat: () => void;
  initialServiceId?: string;
  isDark: boolean;
}

interface StudioAuditReport {
  status: string;
  auditedAt: string;
  workspace_id: string;
  allPassed: boolean;
  services: {
    id: string;
    serviceName: string;
    toolId: string;
    status: string;
    verifiedDetail: string;
  }[];
}

interface HttpExecutionResult {
  ok: boolean;
  targetUrl?: string;
  method?: string;
  status?: number;
  statusText?: string;
  latencyMs: number;
  ssrfVerified: boolean;
  headers?: Record<string, string>;
  bodyPreview?: string;
  error?: string;
}

interface SeoAuditResult {
  ok: boolean;
  auditedUrl?: string;
  fetchedLive?: boolean;
  latencyMs?: number;
  score?: number;
  extractedMeta?: {
    title: string;
    description: string;
    canonical: string;
    ogTitle: string;
    jsonLdCount: number;
    h1Count: number;
  };
  checks?: {
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }[];
  error?: string;
}

interface NotificationLogItem {
  id: string;
  workflowTrigger: string;
  channel: string;
  title: string;
  body: string;
  createdAt: string;
}

const STUDIO_TABS: {
  id: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: 'svc-rag', label: 'Document Q&A (RAG)', icon: <Database className="h-3.5 w-3.5" /> },
  { id: 'svc-webbuilder', label: 'Website & App Builder', icon: <Code2 className="h-3.5 w-3.5" /> },
  { id: 'svc-database', label: 'Supabase Database & API', icon: <Layers className="h-3.5 w-3.5" /> },
  { id: 'svc-notify', label: 'Outbound & Inbound Email', icon: <Mail className="h-3.5 w-3.5" /> },
  { id: 'svc-llm', label: 'AI Prompt Playground', icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: 'svc-calc', label: 'Finance Calculator', icon: <Calculator className="h-3.5 w-3.5" /> },
  { id: 'svc-http', label: 'API & Webhook Tester', icon: <Globe className="h-3.5 w-3.5" /> },
  { id: 'svc-search', label: 'Website & SEO Auditor', icon: <Search className="h-3.5 w-3.5" /> },
];

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  activeWorkspace,
  workflow,
  onUpdateWorkflow,
  onSelectTemplate,
  onOpenPublicChat,
  initialServiceId,
  isDark,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || 'svc-rag'
  );

  useEffect(() => {
    if (initialServiceId) {
      setSelectedServiceId(initialServiceId);
    }
  }, [initialServiceId]);
  const [showPublishDrawer, setShowPublishDrawer] = useState<boolean>(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<StudioAuditReport | null>(null);

  // Shared AI Execution State (Used by RAG, Prompt Playground, and AI CFO Analysis)
  const [testPrompt, setTestPrompt] = useState<string>(
    'What are the key onboarding and Paystack settlement rules in our Lagos SME handbook?'
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<{
    workspace_id: string;
    answer: string;
    modelUsed: string;
    durationMs: number;
    citations: {
      sourceName: string;
      documentId: string;
      similarityScore?: number;
      excerpt: string;
    }[];
    traceSteps: { node: string; status: 'ok' | 'blocked'; detail: string }[];
  } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);

  // 1. Document Q&A (RAG) State
  const [ragChunks, setRagChunks] = useState<RagDocumentChunk[]>([]);
  const [uploadFilename, setUploadFilename] = useState<string>('Company_Policy_Notes.md');
  const [uploadContent, setUploadContent] = useState<string>('');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 2. AI Prompt Playground State
  const [temperature, setTemperature] = useState<number>(0.2);

  // 3. Finance & Unit Economics Calculator State
  const [calcCurrency, setCalcCurrency] = useState<'NGN' | 'USD'>(activeWorkspace.currency);
  const [calcCustomers, setCalcCustomers] = useState<number>(120);
  const [calcPricePerCustomer, setCalcPricePerCustomer] = useState<number>(15000);
  const [calcServerCost, setCalcServerCost] = useState<number>(450000);
  const [calcTeamOpsCost, setCalcTeamOpsCost] = useState<number>(600000);
  const [calcCashReserve, setCalcCashReserve] = useState<number>(6000000);
  const [calcIncludePaystackFee, setCalcIncludePaystackFee] = useState<boolean>(true);

  // 4. API & Webhook Tester State
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST'>('GET');
  const [httpUrl, setHttpUrl] = useState<string>('https://api.paystack.co/');
  const [httpPayload, setHttpPayload] = useState<string>(
    '{\n  "event": "charge.success",\n  "data": { "amount": 1500000, "currency": "NGN" }\n}'
  );
  const [httpLoading, setHttpLoading] = useState<boolean>(false);
  const [httpResult, setHttpResult] = useState<HttpExecutionResult | null>(null);

  // 5. Website & SEO Auditor State
  const [seoUrl, setSeoUrl] = useState<string>('https://agba-pi.vercel.app');
  const [seoKeyword, setSeoKeyword] = useState<string>('AI workflow studio');
  const [seoLoading, setSeoLoading] = useState<boolean>(false);
  const [seoResult, setSeoResult] = useState<SeoAuditResult | null>(null);

  // 6. Email & Team Notification Dispatcher State
  const [notifyChannel, setNotifyChannel] = useState<'email' | 'in-app' | 'sms'>('email');
  const [notifyTrigger, setNotifyTrigger] = useState<
    'welcome' | 'payment-receipt' | 'quota-warning' | 'document-indexed' | 'workflow-run-failure'
  >('payment-receipt');
  const [notifyRecipient, setNotifyRecipient] = useState<string>('ops@trendtactics.ng');
  const [notifyTitle, setNotifyTitle] = useState<string>('Weekly Settlement & AI Usage Digest');
  const [notifyBody, setNotifyBody] = useState<string>(
    'All Paystack settlement webhooks verified and 0 cross-tenant anomalies detected across workspace.'
  );
  const [notifyLoading, setNotifyLoading] = useState<boolean>(false);
  const [notifyReceipt, setNotifyReceipt] = useState<NotificationLogItem | null>(null);
  const [notificationLog, setNotificationLog] = useState<NotificationLogItem[]>([]);

  // Share & Publish Copy State
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);
  const [copiedApi, setCopiedApi] = useState<boolean>(false);

  const reqHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'x-agba-workspace-id': activeWorkspace.id,
      'x-agba-role': activeWorkspace.memberRole,
    }),
    [activeWorkspace.id, activeWorkspace.memberRole]
  );

  const fetchWorkspaceChunks = async () => {
    try {
      const res = await fetch(
        `/api/rag/chunks?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        { headers: reqHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        setRagChunks(data.chunks || []);
      }
    } catch {
      // ignore transient error
    }
  };

  const fetchWorkspaceNotifications = async () => {
    try {
      const res = await fetch(
        `/api/backend/overview?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        { headers: reqHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        setNotificationLog(data.notifications || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setCalcCurrency(activeWorkspace.currency);
    void fetchWorkspaceChunks();
    void fetchWorkspaceNotifications();
  }, [activeWorkspace.id, activeWorkspace.currency]);

  const llmNode = workflow.nodes.find((n) => n.kind === 'llm_generator');
  const toolNode = workflow.nodes.find((n) => n.kind === 'agent_tool');

  const handleUpdateNodeById = (nodeId: string, patch: Partial<StudioNode['config']>) => {
    const updatedNodes = workflow.nodes.map((node) =>
      node.id === nodeId ? { ...node, config: { ...node.config, ...patch } } : node
    );
    onUpdateWorkflow({
      ...workflow,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectStudioTab = (tabId: string) => {
    setSelectedServiceId(tabId);
    setRunError(null);
    const svc = STUDIO_SERVICE_REPRESENTATIONS.find((s) => s.id === tabId);
    if (svc) {
      const tpl = ACADEMY_TEMPLATES.find((t) => t.id === svc.templateId);
      if (tpl) {
        setTestPrompt(tpl.samplePrompt);
      }
    }
  };

  const handleSelectFullTemplate = (tpl: AcademyTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(tpl);
    }
    setTestPrompt(tpl.samplePrompt);
    setRunResult(null);
    setRunError(null);
    const matchingService = STUDIO_SERVICE_REPRESENTATIONS.find((s) => s.templateId === tpl.id);
    if (matchingService) {
      setSelectedServiceId(matchingService.id);
    }
  };

  const handleRunStudioAudit = async () => {
    setIsAuditing(true);
    setShowAuditDrawer(true);
    try {
      const res = await fetch(
        `/api/studio/audit?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        { headers: reqHeaders }
      );
      if (res.ok) {
        setAuditReport(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setIsAuditing(false);
    }
  };

  // Document Upload & Delete Handlers
  const handleBinaryFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadMessage(`Indexing "${file.name}"…`);
    const lower = file.name.toLowerCase();
    const inferredMime = lower.endsWith('.pdf')
      ? 'application/pdf'
      : lower.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : lower.endsWith('.md')
          ? 'text/markdown'
          : file.type || 'text/plain';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binaryStr = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binaryStr += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binaryStr);

      const res = await fetch('/api/rag/upload-binary', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          originalFilename: file.name,
          mimeType: inferredMime,
          sizeBytes: file.size,
          base64Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadMessage(null);
        setUploadError(data.error || 'Could not index file.');
        setIsUploading(false);
        return;
      }
      setUploadMessage(`Indexed "${file.name}" (${data.chunksCreated} passage(s)).`);
      const nextQuestion = `Summarize the key rules and facts in ${file.name}.`;
      setTestPrompt(nextQuestion);
      await fetchWorkspaceChunks();
      setIsUploading(false);
      await handleRunWorkflow(nextQuestion);
    } catch (err) {
      setUploadMessage(null);
      setUploadError(err instanceof Error ? err.message : 'File upload failed');
      setIsUploading(false);
    }
  };

  const handleUploadTextDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadContent.trim().length < 10) {
      setUploadError('Please enter at least 10 characters of document text.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadMessage(null);

    try {
      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          originalFilename: uploadFilename.trim() || 'Workspace_Note.md',
          mimeType: 'text/markdown',
          sizeBytes: new Blob([uploadContent]).size,
          content: uploadContent.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload rejected');
        setIsUploading(false);
        return;
      }
      setUploadMessage(`Indexed "${uploadFilename}" (${data.chunksCreated} passage(s)).`);
      setUploadContent('');
      setShowPasteBox(false);
      const nextQuestion = `What are the key points in ${uploadFilename}?`;
      setTestPrompt(nextQuestion);
      await fetchWorkspaceChunks();
      setIsUploading(false);
      await handleRunWorkflow(nextQuestion);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleDeleteChunk = async (chunkId: string) => {
    try {
      const res = await fetch(
        `/api/rag/chunks/${encodeURIComponent(chunkId)}?workspace_id=${encodeURIComponent(
          activeWorkspace.id
        )}`,
        {
          method: 'DELETE',
          headers: reqHeaders,
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRagChunks(data.chunks || []);
      }
    } catch {
      // ignore
    }
  };

  // Core AI Execution Handler
  const handleRunWorkflow = async (customPrompt?: string) => {
    const promptToRun = (customPrompt ?? testPrompt).trim();
    if (!promptToRun) return;
    if (customPrompt) {
      setTestPrompt(customPrompt);
    }
    setIsRunning(true);
    setRunError(null);

    try {
      const res = await fetch('/api/studio/run', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          appId: workflow.id,
          appName: workflow.name,
          prompt: promptToRun,
          systemPrompt: llmNode?.config.systemPrompt,
          provider: llmNode?.config.provider || 'gemini',
          modelName: llmNode?.config.modelName || 'gemini-3.8-flash',
          allowedTools: workflow.allowedTools,
          activeTool:
            selectedServiceId === 'svc-calc'
              ? 'calculator'
              : selectedServiceId === 'svc-rag'
                ? 'document_retrieval'
                : toolNode?.config.toolId,
          toolTargetUrl: toolNode?.config.toolEndpoint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error || 'Execution failed.');
      } else {
        setRunResult(data);
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsRunning(false);
    }
  };

  // 3. Deterministic Finance & Unit Economics Computation
  const financeMetrics = useMemo(() => {
    const customers = Math.max(0, Number(calcCustomers) || 0);
    const price = Math.max(0, Number(calcPricePerCustomer) || 0);
    const serverCost = Math.max(0, Number(calcServerCost) || 0);
    const teamCost = Math.max(0, Number(calcTeamOpsCost) || 0);
    const cashReserve = Math.max(0, Number(calcCashReserve) || 0);

    const grossRevenue = customers * price;
    // Paystack fee: NGN = 1.5% + NGN 100 (waived under NGN 2,500, capped at NGN 2,000 per tx); USD = 3.9%
    const feePerTx = !calcIncludePaystackFee
      ? 0
      : calcCurrency === 'NGN'
        ? Math.min(2000, price * 0.015 + (price >= 2500 ? 100 : 0))
        : price * 0.039;
    const totalGatewayFees = Math.round(customers * feePerTx);
    const netRevenue = Math.max(0, grossRevenue - totalGatewayFees);
    const grossProfit = netRevenue - serverCost;
    const grossMarginPct =
      grossRevenue > 0 ? Number(((grossProfit / grossRevenue) * 100).toFixed(2)) : 0;
    const totalMonthlyCosts = serverCost + teamCost + totalGatewayFees;
    const netMonthlyProfitOrBurn = grossRevenue - totalMonthlyCosts;
    const netUnitContribution = Math.max(0, price - feePerTx);
    const breakEvenCustomers =
      netUnitContribution > 0 ? Math.ceil((serverCost + teamCost) / netUnitContribution) : 0;
    const runwayMonths =
      netMonthlyProfitOrBurn >= 0
        ? null // Profitable (infinite runway)
        : Math.max(0, Number((cashReserve / Math.abs(netMonthlyProfitOrBurn)).toFixed(1)));

    return {
      symbol: calcCurrency === 'NGN' ? '₦' : '$',
      grossRevenue,
      totalGatewayFees,
      netRevenue,
      grossProfit,
      grossMarginPct,
      totalMonthlyCosts,
      netMonthlyProfitOrBurn,
      breakEvenCustomers,
      runwayMonths,
    };
  }, [
    calcCurrency,
    calcCustomers,
    calcPricePerCustomer,
    calcServerCost,
    calcTeamOpsCost,
    calcCashReserve,
    calcIncludePaystackFee,
  ]);

  // 4. Live HTTP / Webhook Execution Handler
  const handleExecuteHttp = async (e: React.FormEvent) => {
    e.preventDefault();
    setHttpLoading(true);
    setHttpResult(null);
    try {
      const res = await fetch('/api/studio/http-execute', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          url: httpUrl.trim(),
          method: httpMethod,
          payload: httpMethod === 'POST' ? httpPayload : undefined,
        }),
      });
      const data = (await res.json()) as HttpExecutionResult;
      setHttpResult(data);
    } catch (err) {
      setHttpResult({
        ok: false,
        ssrfVerified: false,
        latencyMs: 0,
        error: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setHttpLoading(false);
    }
  };

  // 5. Live Website & SEO Audit Handler
  const handleExecuteSeoAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeoLoading(true);
    setSeoResult(null);
    try {
      const res = await fetch('/api/studio/seo-audit', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          url: seoUrl.trim(),
          targetKeyword: seoKeyword.trim(),
        }),
      });
      const data = (await res.json()) as SeoAuditResult;
      setSeoResult(data);
    } catch (err) {
      setSeoResult({
        ok: false,
        error: err instanceof Error ? err.message : 'SEO audit failed',
      });
    } finally {
      setSeoLoading(false);
    }
  };

  // 6. Live Notification Dispatch Handler
  const handleDispatchNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifyLoading(true);
    setNotifyReceipt(null);
    try {
      const res = await fetch('/api/studio/notify-dispatch', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          channel: notifyChannel,
          workflowTrigger: notifyTrigger,
          recipient: notifyRecipient.trim(),
          title: notifyTitle.trim(),
          body: notifyBody.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.receipt) {
        setNotifyReceipt(data.receipt);
        setNotificationLog(data.notifications || []);
      }
    } catch {
      // ignore
    } finally {
      setNotifyLoading(false);
    }
  };

  const cleanPublicOrigin =
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('.run.app') &&
    !window.location.hostname.includes('ais-')
      ? window.location.origin
      : 'https://agba-pi.vercel.app';

  const shareableUrl = `${cleanPublicOrigin}/chat/${activeWorkspace.slug}/${workflow.id}`;
  const restEndpointUrl = `${cleanPublicOrigin}/api/v1/workspaces/${activeWorkspace.id}/apps/${workflow.id}/run`;
  const embedSnippet = `<iframe src="${shareableUrl}" width="100%" height="580" style="border:0;border-radius:12px;"></iframe>`;
  const curlSnippet = `curl -X POST "${restEndpointUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt": "${testPrompt.replace(/"/g, '\\"')}"}'`;

  const cardSurface = isDark
    ? 'border-white/10 bg-[#141742]/70'
    : 'border-[#0F1226]/10 bg-white';
  const inputSurface = isDark
    ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
    : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]';

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Top Studio Header Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 sm:px-6 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-sm font-bold sm:text-base">{workflow.name}</h1>
          <span className="text-xs opacity-40">·</span>
          <label htmlFor="studio-template-select" className="sr-only">
            Load Starter Template
          </label>
          <select
            id="studio-template-select"
            defaultValue=""
            onChange={(e) => {
              const found = ACADEMY_TEMPLATES.find((t) => t.id === e.target.value);
              if (found) {
                handleSelectFullTemplate(found);
                e.target.value = '';
              }
            }}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
              isDark
                ? 'border-white/15 bg-[#1B1F5E]/50 text-[#FAF6EC]'
                : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
            }`}
          >
            <option value="" disabled>
              Switch Template (12)…
            </option>
            {ACADEMY_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunStudioAudit}
            disabled={isAuditing}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              showAuditDrawer
                ? 'border-[#2E8B57] bg-[#2E8B57]/15 text-[#2E8B57]'
                : 'border-current/15 hover:bg-current/5'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#2E8B57]" />
            <span>{isAuditing ? 'Auditing…' : 'System Check'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPublishDrawer((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              showPublishDrawer
                ? 'border-[#D9A441] bg-[#D9A441]/15'
                : 'border-current/15 hover:bg-current/5'
            }`}
          >
            <Share2 className="h-3.5 w-3.5 text-[#D9A441]" />
            <span>Publish &amp; API</span>
          </button>

          <button
            type="button"
            onClick={onOpenPublicChat}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B3FA8] px-3 py-1.5 text-xs font-semibold text-[#FAF6EC] hover:opacity-95"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Live Chat</span>
          </button>
        </div>
      </div>

      {/* 6 Functional Studio Workbenches Bar */}
      <div
        className={`flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2 sm:px-6 ${
          isDark ? 'border-white/10 bg-[#141742]/50' : 'border-[#0F1226]/10 bg-[#F3EDE0]/80'
        }`}
      >
        {STUDIO_TABS.map((tab) => {
          const isActive = selectedServiceId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectStudioTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-[#D9A441] text-[#0F1226] shadow-xs'
                  : 'opacity-75 hover:bg-current/5 hover:opacity-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Collapsible Publish & API Drawer */}
      {showPublishDrawer && (
        <div
          className={`border-b px-4 py-4 sm:px-6 ${
            isDark ? 'border-white/10 bg-[#141742]' : 'border-[#0F1226]/10 bg-white'
          }`}
        >
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold">
                Shareable Chat Link, Website Embed &amp; Production REST Endpoint
              </span>
              <button
                type="button"
                onClick={() => setShowPublishDrawer(false)}
                className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
                <span>Close</span>
              </button>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-current/15 p-3 text-xs">
                <div className="mb-1.5 flex items-center justify-between font-semibold">
                  <span>1. Public Chat URL</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(shareableUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[#3B3FA8] dark:text-[#D9A441]"
                  >
                    {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className={`w-full rounded border px-2.5 py-1.5 font-mono text-[11px] ${inputSurface}`}
                />
              </div>

              <div className="rounded-xl border border-current/15 p-3 text-xs">
                <div className="mb-1.5 flex items-center justify-between font-semibold">
                  <span>2. Website HTML Embed</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(embedSnippet);
                      setCopiedEmbed(true);
                      setTimeout(() => setCopiedEmbed(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[#3B3FA8] dark:text-[#D9A441]"
                  >
                    {copiedEmbed ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedEmbed ? 'Copied' : 'Copy HTML'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={embedSnippet}
                  className={`w-full rounded border px-2.5 py-1.5 font-mono text-[11px] ${inputSurface}`}
                />
              </div>

              <div className="rounded-xl border border-current/15 p-3 text-xs">
                <div className="mb-1.5 flex items-center justify-between font-semibold">
                  <span>3. REST API cURL</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(curlSnippet);
                      setCopiedApi(true);
                      setTimeout(() => setCopiedApi(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[#3B3FA8] dark:text-[#D9A441]"
                  >
                    {copiedApi ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedApi ? 'Copied' : 'Copy cURL'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={restEndpointUrl}
                  className={`w-full rounded border px-2.5 py-1.5 font-mono text-[11px] ${inputSurface}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible System Audit Drawer */}
      {showAuditDrawer && auditReport && (
        <div
          className={`border-b px-4 py-3 sm:px-6 ${
            isDark ? 'border-white/10 bg-[#141742]' : 'border-[#0F1226]/10 bg-[#F3EDE0]'
          }`}
        >
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-[#2E8B57]">
                <CheckCircle2 className="h-4 w-4" />
                <span>All 6 Studio Workbenches Operational ({auditReport.workspace_id})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditDrawer(false)}
                className="text-xs font-semibold opacity-70 hover:opacity-100"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {auditReport.services.map((svc) => (
                <div key={svc.id} className={`rounded-lg border p-2.5 text-xs ${cardSurface}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{svc.serviceName}</span>
                    <span className="font-mono text-[10px] font-bold uppercase text-[#2E8B57]">
                      {svc.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] opacity-75">{svc.verifiedDetail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ACTIVE WORKBENCH BODY (Direct Inputs on Left, Live Results on Right) */}
      {/* ===================================================================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-[1200px]">
          {/* ----------------------------------------------------------------- */}
          {/* WORKBENCH 1: DOCUMENT Q&A (RAG) STUDIO                            */}
          {/* ----------------------------------------------------------------- */}
          {selectedServiceId === 'svc-rag' && (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: Upload & Manage Workspace Documents */}
              <div className="space-y-4 lg:col-span-5">
                <div className={`rounded-2xl border p-5 ${cardSurface}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-sm font-bold">
                      1. Workspace Knowledge Files ({ragChunks.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowPasteBox((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-2.5 py-1 text-xs font-semibold hover:bg-current/5"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{showPasteBox ? 'Close Note Box' : 'Paste Text'}</span>
                    </button>
                  </div>

                  {/* Direct File Upload Dropzone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files?.[0];
                      if (f) void handleBinaryFileUpload(f);
                    }}
                    className={`rounded-xl border-2 border-dashed p-4 text-center ${
                      isDark
                        ? 'border-white/20 bg-[#0E1030]/60'
                        : 'border-[#0F1226]/20 bg-[#FAF6EC]/60'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleBinaryFileUpload(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                    <FileUp className="mx-auto h-6 w-6 text-[#D9A441]" />
                    <p className="mt-1.5 text-xs font-semibold">
                      Drop .pdf, .docx, .md, or .txt here (max 10 MB)
                    </p>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-bold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploading ? 'Indexing…' : 'Upload File from Computer'}</span>
                    </button>
                  </div>

                  {uploadMessage && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#2E8B57]/40 bg-[#2E8B57]/10 px-3 py-2 text-xs text-[#2E8B57]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{uploadMessage}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#C84B31] bg-[#C84B31]/10 px-3 py-2 text-xs text-[#C84B31]">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {showPasteBox && (
                    <form
                      onSubmit={handleUploadTextDoc}
                      className="mt-3 space-y-2.5 rounded-xl border border-current/15 p-3 text-xs"
                    >
                      <div>
                        <label className="mb-1 block font-semibold">Document Name</label>
                        <input
                          type="text"
                          value={uploadFilename}
                          onChange={(e) => setUploadFilename(e.target.value)}
                          className={`w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs ${inputSurface}`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block font-semibold">Document Content</label>
                        <textarea
                          rows={3}
                          value={uploadContent}
                          onChange={(e) => setUploadContent(e.target.value)}
                          placeholder="Paste policy rules, SOPs, or FAQ text here..."
                          className={`w-full rounded-lg border p-2 text-xs ${inputSurface}`}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="w-full rounded-lg bg-[#3B3FA8] py-2 text-xs font-bold text-[#FAF6EC]"
                      >
                        Index Text &amp; Run Query
                      </button>
                    </form>
                  )}

                  {/* Active Indexed Documents List */}
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-semibold opacity-70">
                      Indexed Passages in {activeWorkspace.name}:
                    </div>
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                      {ragChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className={`rounded-xl border p-3 text-xs ${
                            isDark
                              ? 'border-white/10 bg-[#0E1030]/70'
                              : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono font-bold text-[#2E8B57]">
                              {chunk.sourceName}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const q = `What are the key points and rules in ${chunk.sourceName}?`;
                                  void handleRunWorkflow(q);
                                }}
                                className="rounded border border-current/20 px-2 py-0.5 text-[11px] font-semibold hover:bg-current/5"
                              >
                                Query
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteChunk(chunk.id)}
                                title="Remove passage"
                                className="rounded p-1 opacity-60 hover:bg-[#C84B31]/15 hover:text-[#C84B31] hover:opacity-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] opacity-75">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Document Q&A Execution & Cited Answer */}
              <div className="space-y-4 lg:col-span-7">
                <div className={`rounded-2xl border p-5 ${cardSurface}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-sm font-bold">
                      2. Ask Questions Against Your Documents
                    </h2>
                    <span className="font-mono text-[11px] opacity-70">
                      Model: {llmNode?.config.provider || 'gemini'} · {ragChunks.length} passage(s)
                    </span>
                  </div>

                  {/* Quick Sample Prompts */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {[
                      'What are the key onboarding and Paystack settlement rules in our Lagos SME handbook?',
                      'Which open-source foundations power AGBA and how is tenant isolation enforced?',
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void handleRunWorkflow(q)}
                        className="rounded-lg border border-current/15 px-2.5 py-1 text-left text-[11px] opacity-80 hover:bg-current/5 hover:opacity-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isRunning && testPrompt.trim()) {
                          void handleRunWorkflow();
                        }
                      }}
                      placeholder="Ask any question about your uploaded files..."
                      className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm ${inputSurface}`}
                    />
                    <button
                      type="button"
                      onClick={() => void handleRunWorkflow()}
                      disabled={isRunning || !testPrompt.trim()}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-5 py-2.5 text-xs font-bold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{isRunning ? 'Searching & Generating…' : 'Get Cited Answer'}</span>
                    </button>
                  </div>

                  {runError && (
                    <div
                      role="alert"
                      className="mt-4 flex items-start gap-2 rounded-xl border border-[#C84B31] bg-[#C84B31]/10 p-3.5 text-xs text-[#C84B31]"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{runError}</span>
                    </div>
                  )}

                  {runResult ? (
                    <div className="mt-5 space-y-4 border-t border-current/10 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#2E8B57]" />
                          <span className="font-bold text-[#2E8B57]">Grounded Response</span>
                          <span>·</span>
                          <span className="font-mono text-[11px] opacity-75">
                            {runResult.modelUsed} ({runResult.durationMs}ms)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(runResult.answer);
                            setCopiedAnswer(true);
                            setTimeout(() => setCopiedAnswer(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 rounded border border-current/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-current/5"
                        >
                          {copiedAnswer ? (
                            <Check className="h-3 w-3 text-[#2E8B57]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedAnswer ? 'Copied' : 'Copy Answer'}</span>
                        </button>
                      </div>

                      <div
                        className={`rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-line ${inputSurface}`}
                      >
                        {runResult.answer}
                      </div>

                      {runResult.citations.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold opacity-80">
                            Matched Document Citations ({runResult.citations.length}):
                          </div>
                          {runResult.citations.map((cit, i) => (
                            <div
                              key={`${cit.documentId}-${i}`}
                              className="rounded-lg border border-current/10 px-3 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between font-mono">
                                <span className="font-bold text-[#2E8B57]">
                                  [{cit.sourceName}]
                                </span>
                                {cit.similarityScore !== undefined && (
                                  <span className="text-[11px] opacity-70">
                                    Match: {Math.round(cit.similarityScore * 100)}%
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] opacity-85">“{cit.excerpt}”</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-current/15 p-6 text-center text-xs opacity-70">
                      Click <strong>Get Cited Answer</strong> above or upload a document on the left
                      to see grounded answers and exact source citations here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* WORKBENCH 2: AI PROMPT & MODEL PLAYGROUND (`svc-llm`)             */}
          {/* ----------------------------------------------------------------- */}
          {selectedServiceId === 'svc-llm' && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-5 ${cardSurface}`}>
                <h2 className="font-display text-sm font-bold">
                  AI Model &amp; System Instructions
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <label className="mb-1 block font-semibold">AI Provider</label>
                    <select
                      value={llmNode?.config.provider || 'gemini'}
                      onChange={(e) => {
                        if (!llmNode) return;
                        const nextProvider = e.target.value as ModelProvider;
                        const defaultModels: Record<ModelProvider, string> = {
                          gemini: 'gemini-3.8-flash',
                          openai: 'gpt-4o-mini',
                          anthropic: 'claude-sonnet-4-5',
                          mistral: 'mistral-large-latest',
                          ollama: 'llama3.2:latest',
                        };
                        handleUpdateNodeById(llmNode.id, {
                          provider: nextProvider,
                          modelName: defaultModels[nextProvider],
                        });
                      }}
                      className={`w-full rounded-lg border px-3 py-2 font-semibold ${inputSurface}`}
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="mistral">Mistral AI</option>
                      <option value="ollama">Local Ollama (Llama)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold">Model Name</label>
                    <input
                      type="text"
                      value={llmNode?.config.modelName || 'gemini-3.8-flash'}
                      onChange={(e) =>
                        llmNode && handleUpdateNodeById(llmNode.id, { modelName: e.target.value })
                      }
                      className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${inputSurface}`}
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <div className="mb-1 flex items-center justify-between font-semibold">
                    <label>Temperature</label>
                    <span className="font-mono">{temperature.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-[#D9A441]"
                  />
                </div>

                <div className="text-xs">
                  <label className="mb-1 block font-semibold">System Role / Instructions</label>
                  <textarea
                    rows={4}
                    value={
                      llmNode?.config.systemPrompt ||
                      'You are AGBA, a precise AI assistant for African and global teams.'
                    }
                    onChange={(e) =>
                      llmNode && handleUpdateNodeById(llmNode.id, { systemPrompt: e.target.value })
                    }
                    className={`w-full rounded-xl border p-3 text-xs leading-relaxed ${inputSurface}`}
                  />
                </div>
              </div>

              <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-7 ${cardSurface}`}>
                <h2 className="font-display text-sm font-bold">Prompt Input &amp; Live Output</h2>
                <textarea
                  rows={4}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Write your prompt, customer email draft, or extraction task here..."
                  className={`w-full rounded-xl border p-3.5 text-sm leading-relaxed ${inputSurface}`}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleRunWorkflow()}
                    disabled={isRunning || !testPrompt.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#D9A441] px-5 py-2.5 text-xs font-bold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{isRunning ? 'Running Model…' : 'Run Prompt'}</span>
                  </button>
                </div>

                {runResult && (
                  <div className="space-y-3 border-t border-current/10 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-[#2E8B57]">
                        {runResult.modelUsed} · {runResult.durationMs}ms
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(runResult.answer);
                          setCopiedAnswer(true);
                          setTimeout(() => setCopiedAnswer(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-current/15 px-2.5 py-1 text-[11px] font-semibold"
                      >
                        {copiedAnswer ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedAnswer ? 'Copied' : 'Copy Output'}</span>
                      </button>
                    </div>
                    <div
                      className={`rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-line ${inputSurface}`}
                    >
                      {runResult.answer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* WORKBENCH 3: FINANCE & UNIT ECONOMICS CALCULATOR (`svc-calc`)     */}
          {/* ----------------------------------------------------------------- */}
          {selectedServiceId === 'svc-calc' && (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: Financial Inputs */}
              <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-5 ${cardSurface}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold">
                    SaaS &amp; SME Unit Economics Inputs
                  </h2>
                  <div className="inline-flex rounded-lg border border-current/15 p-0.5 text-xs">
                    {(['NGN', 'USD'] as const).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setCalcCurrency(curr)}
                        className={`rounded-md px-2.5 py-1 font-mono font-semibold ${
                          calcCurrency === curr ? 'bg-[#D9A441] text-[#0F1226]' : 'opacity-70'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <label className="mb-1 block font-semibold">Active Paying Customers</label>
                    <input
                      type="number"
                      min="0"
                      value={calcCustomers}
                      onChange={(e) => setCalcCustomers(Number(e.target.value))}
                      className={`w-full rounded-lg border px-3 py-2 font-mono ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">
                      Monthly Price / Customer ({financeMetrics.symbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={calcPricePerCustomer}
                      onChange={(e) => setCalcPricePerCustomer(Number(e.target.value))}
                      className={`w-full rounded-lg border px-3 py-2 font-mono ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">
                      Monthly Server / AI Infra Cost ({financeMetrics.symbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={calcServerCost}
                      onChange={(e) => setCalcServerCost(Number(e.target.value))}
                      className={`w-full rounded-lg border px-3 py-2 font-mono ${inputSurface}`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">
                      Monthly Payroll &amp; Ops ({financeMetrics.symbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={calcTeamOpsCost}
                      onChange={(e) => setCalcTeamOpsCost(Number(e.target.value))}
                      className={`w-full rounded-lg border px-3 py-2 font-mono ${inputSurface}`}
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="mb-1 block font-semibold">
                    Cash Reserve in Bank ({financeMetrics.symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={calcCashReserve}
                    onChange={(e) => setCalcCashReserve(Number(e.target.value))}
                    className={`w-full rounded-lg border px-3 py-2 font-mono ${inputSurface}`}
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={calcIncludePaystackFee}
                    onChange={(e) => setCalcIncludePaystackFee(e.target.checked)}
                    className="accent-[#D9A441]"
                  />
                  <span>
                    Deduct standard payment gateway fees (
                    {calcCurrency === 'NGN'
                      ? 'Paystack 1.5% + ₦100, capped at ₦2,000'
                      : '3.9% USD card fee'}
                    )
                  </span>
                </label>

                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => {
                    const summaryPrompt = `Calculate gross margin for ${calcCustomers} customers at ${calcPricePerCustomer} ${calcCurrency} with ${calcServerCost} ${calcCurrency} server cost and provide brief financial recommendations.`;
                    void handleRunWorkflow(summaryPrompt);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-4 py-2.5 text-xs font-bold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
                >
                  <Calculator className="h-4 w-4" />
                  <span>{isRunning ? 'Analyzing…' : 'Generate AI CFO Recommendations'}</span>
                </button>
              </div>

              {/* Right Column: Live Computed Unit Economics & Runway Results */}
              <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-7 ${cardSurface}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold">
                    Live Computed Unit Economics ({calcCurrency})
                  </h2>
                  <span className="font-mono text-xs font-semibold text-[#2E8B57]">
                    Deterministic Kobo/Cents Engine
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className={`rounded-xl border p-3.5 ${inputSurface}`}>
                    <div className="text-[11px] opacity-70">Monthly Gross Revenue</div>
                    <div className="mt-1 font-mono text-lg font-bold">
                      {financeMetrics.symbol}
                      {financeMetrics.grossRevenue.toLocaleString()}
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3.5 ${inputSurface}`}>
                    <div className="text-[11px] opacity-70">Payment Gateway Fees</div>
                    <div className="mt-1 font-mono text-lg font-bold text-[#C84B31]">
                      -{financeMetrics.symbol}
                      {financeMetrics.totalGatewayFees.toLocaleString()}
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3.5 ${inputSurface}`}>
                    <div className="text-[11px] opacity-70">Gross Margin</div>
                    <div
                      className={`mt-1 font-mono text-lg font-bold ${
                        financeMetrics.grossMarginPct >= 60 ? 'text-[#2E8B57]' : 'text-[#D9A441]'
                      }`}
                    >
                      {financeMetrics.grossMarginPct}%
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3.5 ${inputSurface}`}>
                    <div className="text-[11px] opacity-70">Net Monthly Profit / Burn</div>
                    <div
                      className={`mt-1 font-mono text-lg font-bold ${
                        financeMetrics.netMonthlyProfitOrBurn >= 0
                          ? 'text-[#2E8B57]'
                          : 'text-[#C84B31]'
                      }`}
                    >
                      {financeMetrics.netMonthlyProfitOrBurn >= 0 ? '+' : ''}
                      {financeMetrics.symbol}
                      {financeMetrics.netMonthlyProfitOrBurn.toLocaleString()}
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3.5 ${inputSurface}`}>
                    <div className="text-[11px] opacity-70">Break-Even Customers</div>
                    <div className="mt-1 font-mono text-lg font-bold">
                      {financeMetrics.breakEvenCustomers.toLocaleString()} units
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3.5 ${inputSurface}`}>
                    <div className="text-[11px] opacity-70">Cash Runway</div>
                    <div className="mt-1 font-mono text-lg font-bold text-[#2E8B57]">
                      {financeMetrics.runwayMonths === null
                        ? 'Profitable (∞)'
                        : `${financeMetrics.runwayMonths} mos`}
                    </div>
                  </div>
                </div>

                {runResult && (
                  <div className="space-y-2 border-t border-current/10 pt-4 text-xs">
                    <div className="font-bold text-[#2E8B57]">AI CFO Analysis:</div>
                    <div
                      className={`rounded-xl border p-3.5 text-xs leading-relaxed whitespace-pre-line ${inputSurface}`}
                    >
                      {runResult.answer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* WORKBENCH 4: EXTERNAL API & WEBHOOK TESTER (`svc-http`)           */}
          {/* ----------------------------------------------------------------- */}
          {selectedServiceId === 'svc-http' && (
            <div className="grid gap-6 lg:grid-cols-12">
              <form
                onSubmit={handleExecuteHttp}
                className={`space-y-4 rounded-2xl border p-5 lg:col-span-5 ${cardSurface}`}
              >
                <h2 className="font-display text-sm font-bold">
                  Outbound HTTP &amp; Webhook Request
                </h2>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {[
                    { label: 'Paystack API', url: 'https://api.paystack.co/' },
                    { label: 'GitHub Zen API', url: 'https://api.github.com/zen' },
                    { label: 'Test SSRF Block (169.254.169.254)', url: 'http://169.254.169.254/latest/meta-data/' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setHttpUrl(preset.url)}
                      className="rounded border border-current/20 px-2 py-1 font-medium hover:bg-current/5"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 text-xs">
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as 'GET' | 'POST')}
                    className={`rounded-lg border px-3 py-2 font-mono font-bold ${inputSurface}`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                  <input
                    type="text"
                    value={httpUrl}
                    onChange={(e) => setHttpUrl(e.target.value)}
                    placeholder="https://api.paystack.co/"
                    className={`flex-1 rounded-lg border px-3 py-2 font-mono text-xs ${inputSurface}`}
                  />
                </div>

                {httpMethod === 'POST' && (
                  <div className="text-xs">
                    <label className="mb-1 block font-semibold">JSON Request Payload</label>
                    <textarea
                      rows={4}
                      value={httpPayload}
                      onChange={(e) => setHttpPayload(e.target.value)}
                      className={`w-full rounded-xl border p-3 font-mono text-xs ${inputSurface}`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={httpLoading || !httpUrl.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-4 py-2.5 text-xs font-bold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
                >
                  <Terminal className="h-4 w-4" />
                  <span>{httpLoading ? 'Sending Request…' : 'Send Request & Inspect Response'}</span>
                </button>
              </form>

              <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-7 ${cardSurface}`}>
                <h2 className="font-display text-sm font-bold">Live HTTP Response Inspector</h2>
                {httpResult ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-current/15 p-3">
                      <div className="flex items-center gap-2">
                        {httpResult.ok ? (
                          <CheckCircle2 className="h-4 w-4 text-[#2E8B57]" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-[#C84B31]" />
                        )}
                        <span className="font-mono font-bold">
                          {httpResult.status
                            ? `HTTP ${httpResult.status} ${httpResult.statusText}`
                            : 'BLOCKED BY SSRF GUARD'}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] opacity-75">
                        Latency: {httpResult.latencyMs}ms · SSRF Guard:{' '}
                        {httpResult.ssrfVerified ? 'PASSED' : 'BLOCKED'}
                      </span>
                    </div>

                    {httpResult.error ? (
                      <div className="rounded-xl border border-[#C84B31] bg-[#C84B31]/10 p-3.5 font-mono text-xs text-[#C84B31]">
                        {httpResult.error}
                      </div>
                    ) : (
                      <>
                        {httpResult.headers && Object.keys(httpResult.headers).length > 0 && (
                          <div>
                            <div className="mb-1 font-semibold opacity-75">Response Headers:</div>
                            <pre
                              className={`overflow-x-auto rounded-xl border p-3 font-mono text-[11px] ${inputSurface}`}
                            >
                              {JSON.stringify(httpResult.headers, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div>
                          <div className="mb-1 font-semibold opacity-75">Response Body Preview:</div>
                          <pre
                            className={`max-h-[280px] overflow-auto rounded-xl border p-3 font-mono text-[11px] leading-relaxed ${inputSurface}`}
                          >
                            {httpResult.bodyPreview}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-current/15 p-8 text-center text-xs opacity-70">
                    Select a preset or enter a public HTTPS endpoint on the left and click{' '}
                    <strong>Send Request &amp; Inspect Response</strong> to view live HTTP status,
                    headers, and payload.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* WORKBENCH 5: WEBSITE & SEO AUDITOR (`svc-search`)                 */}
          {/* ----------------------------------------------------------------- */}
          {selectedServiceId === 'svc-search' && (
            <div className="grid gap-6 lg:grid-cols-12">
              <form
                onSubmit={handleExecuteSeoAudit}
                className={`space-y-4 rounded-2xl border p-5 lg:col-span-5 ${cardSurface}`}
              >
                <h2 className="font-display text-sm font-bold">
                  Website SEO, Schema.org &amp; GEO Auditor
                </h2>
                <div className="text-xs">
                  <label className="mb-1 block font-semibold">Website URL to Audit</label>
                  <input
                    type="text"
                    value={seoUrl}
                    onChange={(e) => setSeoUrl(e.target.value)}
                    placeholder="https://agba-pi.vercel.app"
                    className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${inputSurface}`}
                  />
                </div>
                <div className="text-xs">
                  <label className="mb-1 block font-semibold">
                    Target Keyword or Topic (Optional)
                  </label>
                  <input
                    type="text"
                    value={seoKeyword}
                    onChange={(e) => setSeoKeyword(e.target.value)}
                    placeholder="e.g. AI workflow studio"
                    className={`w-full rounded-lg border px-3 py-2 text-xs ${inputSurface}`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={seoLoading || !seoUrl.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-4 py-2.5 text-xs font-bold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  <span>{seoLoading ? 'Auditing Page…' : 'Run Live SEO & Schema Audit'}</span>
                </button>
              </form>

              <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-7 ${cardSurface}`}>
                <h2 className="font-display text-sm font-bold">SEO &amp; Answer Engine Report</h2>
                {seoResult ? (
                  seoResult.error ? (
                    <div className="rounded-xl border border-[#C84B31] bg-[#C84B31]/10 p-3.5 text-xs text-[#C84B31]">
                      {seoResult.error}
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-current/15 p-3.5">
                        <div>
                          <div className="font-semibold">{seoResult.auditedUrl}</div>
                          <div className="text-[11px] opacity-70">
                            Completed in {seoResult.latencyMs}ms · JSON-LD Blocks:{' '}
                            {seoResult.extractedMeta?.jsonLdCount ?? 0}
                          </div>
                        </div>
                        <div className="font-mono text-xl font-bold text-[#2E8B57]">
                          Score: {seoResult.score}/100
                        </div>
                      </div>

                      <div className="space-y-2">
                        {seoResult.checks?.map((chk) => (
                          <div
                            key={chk.id}
                            className="flex items-start gap-2.5 rounded-lg border border-current/10 p-2.5"
                          >
                            {chk.passed ? (
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2E8B57]" />
                            ) : (
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D9A441]" />
                            )}
                            <div>
                              <div className="font-semibold">{chk.label}</div>
                              <div className="mt-0.5 text-[11px] opacity-80">{chk.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-dashed border-current/15 p-8 text-center text-xs opacity-70">
                    Enter any public URL on the left and click{' '}
                    <strong>Run Live SEO &amp; Schema Audit</strong> to inspect title tags, meta
                    descriptions, OpenGraph cards, and Schema.org JSON-LD readiness.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* WORKBENCH 6: AI WEBSITE & WEB APP BUILDER (`svc-webbuilder`)      */}
          {/* ----------------------------------------------------------------- */}
          {selectedServiceId === 'svc-webbuilder' && (
            <WebAppBuilderWorkbench
              activeWorkspace={activeWorkspace}
              reqHeaders={reqHeaders}
              cardSurface={cardSurface}
              inputSurface={inputSurface}
            />
          )}

          {/* ----------------------------------------------------------------- */}
          {/* WORKBENCH 7: SUPABASE DATABASE & REST API STUDIO (`svc-database`) */}
          {/* ----------------------------------------------------------------- */}
          {selectedServiceId === 'svc-database' && (
            <SupabaseDatabaseWorkbench
              activeWorkspace={activeWorkspace}
              reqHeaders={reqHeaders}
              cardSurface={cardSurface}
              inputSurface={inputSurface}
            />
          )}

          {/* ----------------------------------------------------------------- */}
          {/* WORKBENCH 8: OUTBOUND & INBOUND EMAIL ENGINE (`svc-notify`)       */}
          {/* ----------------------------------------------------------------- */}
          {selectedServiceId === 'svc-notify' && (
            <EmailAcrossBoardWorkbench
              activeWorkspace={activeWorkspace}
              reqHeaders={reqHeaders}
              cardSurface={cardSurface}
              inputSurface={inputSurface}
            />
          )}
        </div>
      </div>
    </div>
  );
};
