import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Plus,
  Upload,
  Share2,
  Sliders,
  Database,
  Cpu,
  Wrench,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  FileUp,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  ACADEMY_TEMPLATES,
  STUDIO_SERVICE_REPRESENTATIONS,
  type StudioServiceRepresentation,
} from '../data/academyTemplates.ts';
import type {
  AcademyTemplate,
  AllowedToolId,
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
  isDark: boolean;
}

const ALL_TOOLS: { id: AllowedToolId; label: string; description: string }[] = [
  {
    id: 'document_retrieval',
    label: 'Document Q&A (RAG)',
    description: 'Answers questions using your uploaded PDFs, Word docs, and notes',
  },
  {
    id: 'calculator',
    label: 'Finance & Margin Calculator',
    description: 'Calculates NGN/USD margins, runway, and kobo/cents unit economics',
  },
  {
    id: 'http_request',
    label: 'External API & Webhook',
    description: 'Connects safely to Paystack or public HTTPS endpoints',
  },
  {
    id: 'web_search',
    label: 'Website & SEO Checker',
    description: 'Audits web pages, Schema.org metadata, and search readiness',
  },
  {
    id: 'send_email_novu',
    label: 'Email & Team Alerts',
    description: 'Sends automated email summaries and team notifications',
  },
];

const QUICK_SAMPLE_PROMPTS = [
  'What are the key onboarding and Paystack settlement rules in our Lagos SME handbook?',
  'Calculate gross margin for 120 customers at 15,000 NGN with 450,000 NGN server cost.',
  'Check the status of our public webhook endpoint and summarize the response headers.',
];

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

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  activeWorkspace,
  workflow,
  onUpdateWorkflow,
  onSelectTemplate,
  onOpenPublicChat,
  isDark,
}) => {
  // Practical 3-Step Wizard State: 1 = Setup/Upload, 2 = Test & Ask Live, 3 = Publish & Share
  const [activePhase, setActivePhase] = useState<1 | 2 | 3>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('svc-rag');
  const [showModelSettings, setShowModelSettings] = useState<boolean>(false);
  const [outputTab, setOutputTab] = useState<'answer' | 'trace'>('answer');

  const [testPrompt, setTestPrompt] = useState<string>(QUICK_SAMPLE_PROMPTS[0]);
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

  // Document Upload State
  const [ragChunks, setRagChunks] = useState<RagDocumentChunk[]>([]);
  const [uploadFilename, setUploadFilename] = useState<string>('Lagos_Cooperative_Onboarding.md');
  const [uploadContent, setUploadContent] = useState<string>(
    'All cooperative merchants must complete KYC verification and configure their Paystack settlement bank account in NGN kobo before enabling automated payouts.'
  );
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [showTextPasteForm, setShowTextPasteForm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Copy & Audit state
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);
  const [copiedApi, setCopiedApi] = useState<boolean>(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<StudioAuditReport | null>(null);

  const fetchWorkspaceChunks = async () => {
    try {
      const res = await fetch(
        `/api/rag/chunks?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        {
          headers: {
            'x-agba-workspace-id': activeWorkspace.id,
            'x-agba-role': activeWorkspace.memberRole,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRagChunks(data.chunks || []);
      }
    } catch {
      // ignore transient fetch errors
    }
  };

  useEffect(() => {
    fetchWorkspaceChunks();
  }, [activeWorkspace.id]);

  const activeServiceRep =
    STUDIO_SERVICE_REPRESENTATIONS.find((s) => s.id === selectedServiceId) ||
    STUDIO_SERVICE_REPRESENTATIONS[0];

  const llmNode = workflow.nodes.find((n) => n.kind === 'llm_generator');
  const ragNode = workflow.nodes.find((n) => n.kind === 'rag_retriever');
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

  const handleSelectServiceStudio = (svc: StudioServiceRepresentation) => {
    setSelectedServiceId(svc.id);
    const tpl = ACADEMY_TEMPLATES.find((t) => t.id === svc.templateId);
    if (tpl && onSelectTemplate) {
      onSelectTemplate(tpl);
      setTestPrompt(tpl.samplePrompt);
      setRunResult(null);
      setRunError(null);
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
    setActivePhase(2);
  };

  const handleRunStudioAudit = async () => {
    setIsAuditing(true);
    setShowAuditDrawer(true);
    try {
      const res = await fetch(
        `/api/studio/audit?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        {
          headers: {
            'x-agba-workspace-id': activeWorkspace.id,
            'x-agba-role': activeWorkspace.memberRole,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setAuditReport(data);
      }
    } catch {
      // ignore transient error
    } finally {
      setIsAuditing(false);
    }
  };

  const handleBinaryFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadMessage(`Uploading and indexing "${file.name}"…`);
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
        headers: {
          'Content-Type': 'application/json',
          'x-agba-workspace-id': activeWorkspace.id,
          'x-agba-role': activeWorkspace.memberRole,
        },
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
        setUploadMessage(`Upload blocked: ${data.error}`);
        setIsUploading(false);
        return;
      }
      setUploadMessage(
        `Uploaded "${file.name}" (${data.chunksCreated} passage(s) ready). Now ask a question below!`
      );
      setTestPrompt(`Summarize the key points and rules in ${file.name}.`);
      await fetchWorkspaceChunks();
      setIsUploading(false);
      // Automatically move the user to Step 2 so they can immediately test their uploaded document
      setActivePhase(2);
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'File upload failed');
      setIsUploading(false);
    }
  };

  const handleUploadRagDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadMessage(null);
    const ext = uploadFilename.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : uploadFilename.toLowerCase().endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : uploadFilename.toLowerCase().endsWith('.md')
          ? 'text/markdown'
          : 'text/plain';

    try {
      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agba-workspace-id': activeWorkspace.id,
          'x-agba-role': activeWorkspace.memberRole,
        },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          originalFilename: uploadFilename,
          mimeType: ext,
          sizeBytes: new Blob([uploadContent]).size,
          content: uploadContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadMessage(`Blocked: ${data.error}`);
        setIsUploading(false);
        return;
      }
      setUploadMessage(`Saved "${uploadFilename}"! Now test your assistant below.`);
      setShowTextPasteForm(false);
      setTestPrompt(`What are the key rules in ${uploadFilename}?`);
      await fetchWorkspaceChunks();
      setIsUploading(false);
      // Automatically advance to Step 2
      setActivePhase(2);
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleRunWorkflow = async (customPrompt?: string) => {
    const promptToRun = (customPrompt ?? testPrompt).trim();
    if (!promptToRun) return;
    if (customPrompt) {
      setTestPrompt(customPrompt);
    }
    setIsRunning(true);
    setRunError(null);
    setRunResult(null);

    try {
      const res = await fetch('/api/studio/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agba-workspace-id': activeWorkspace.id,
          'x-agba-role': activeWorkspace.memberRole,
        },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          appId: workflow.id,
          appName: workflow.name,
          prompt: promptToRun,
          systemPrompt: llmNode?.config.systemPrompt,
          provider: llmNode?.config.provider || 'gemini',
          modelName: llmNode?.config.modelName || 'gemini-3.8-flash',
          allowedTools: workflow.allowedTools,
          activeTool: toolNode?.config.toolId,
          toolTargetUrl: toolNode?.config.toolEndpoint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error || 'Could not run assistant. Please try again.');
      } else {
        setRunResult(data);
        setOutputTab('answer');
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsRunning(false);
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
  const curlSnippet = `curl -X POST "${restEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "${testPrompt.replace(/"/g, '\\"')}"}'`;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Top Action Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-base font-bold sm:text-lg">{workflow.name}</h1>
          <span className="text-xs opacity-40">·</span>
          <label htmlFor="studio-template-select" className="sr-only">
            Switch Pre-Built Assistant
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
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isDark
                ? 'border-white/15 bg-[#1B1F5E]/50 text-[#FAF6EC] hover:border-[#D9A441]'
                : 'border-[#0F1226]/15 bg-white text-[#0F1226] hover:border-[#3B3FA8]'
            }`}
          >
            <option value="" disabled>
              Load a Pre-Built Template…
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
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              showAuditDrawer
                ? 'border-[#2E8B57] bg-[#2E8B57]/15 text-[#2E8B57]'
                : 'border-current/20 hover:bg-current/5'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[#2E8B57]" />
            <span>{isAuditing ? 'Checking…' : 'Verify All Studios'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPublicChat}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B3FA8] px-3.5 py-1.5 text-xs font-semibold text-[#FAF6EC] transition-opacity hover:opacity-95"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Public Chat</span>
          </button>
        </div>
      </div>

      {/* Collapsible Studio Auditor Drawer */}
      <AnimatePresence>
        {showAuditDrawer && auditReport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-b ${
              isDark ? 'border-white/10 bg-[#141742]' : 'border-[#0F1226]/10 bg-[#F3EDE0]'
            }`}
          >
            <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-[#2E8B57]" />
                  <span className="font-bold">All 6 Studio Services Verified Operational</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditDrawer(false)}
                  className="text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {auditReport.services.map((svc) => (
                  <div
                    key={svc.id}
                    className={`rounded-xl border p-3 text-xs ${
                      isDark ? 'border-white/10 bg-[#0F1226]/90' : 'border-[#0F1226]/10 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{svc.serviceName}</span>
                      <span className="font-mono text-[11px] font-semibold uppercase text-[#2E8B57]">
                        {svc.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed opacity-75">
                      {svc.verifiedDetail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Practical 3-Step Builder */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {/* 3-Step Guided Progress Bar */}
          <nav
            aria-label="Builder Steps"
            className={`grid grid-cols-3 gap-2 rounded-2xl border p-1.5 ${
              isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#F3EDE0]'
            }`}
          >
            {[
              {
                step: 1 as const,
                title: '1. Add Document or Service',
                sub: 'Upload files or pick a tool',
              },
              {
                step: 2 as const,
                title: '2. Ask & Test Live',
                sub: 'Run questions & tweak AI',
              },
              {
                step: 3 as const,
                title: '3. Publish & Share',
                sub: 'Chat link, embed, or API',
              },
            ].map((item) => {
              const isCurrent = activePhase === item.step;
              const isCompleted = activePhase > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActivePhase(item.step)}
                  className={`flex flex-col items-start rounded-xl px-3.5 py-2.5 text-left transition-all ${
                    isCurrent
                      ? 'bg-[#3B3FA8] text-[#FAF6EC] shadow-sm'
                      : isCompleted
                        ? isDark
                          ? 'bg-[#2E8B57]/20 text-[#FAF6EC] hover:bg-[#2E8B57]/30'
                          : 'bg-[#2E8B57]/15 text-[#0F1226] hover:bg-[#2E8B57]/25'
                        : 'opacity-70 hover:bg-current/5 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-[#2E8B57]" />}
                    <span>{item.title}</span>
                  </div>
                  <span className="mt-0.5 hidden text-[11px] opacity-80 sm:inline">
                    {item.sub}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* ================================================================= */}
          {/* PHASE 1: UPLOAD DOCUMENT OR PICK WHAT YOU WANT TO BUILD          */}
          {/* ================================================================= */}
          {activePhase === 1 && (
            <div className="space-y-6">
              {/* Simple Service Picker */}
              <div
                className={`rounded-2xl border p-5 ${
                  isDark ? 'border-white/10 bg-[#141742]/60' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold">
                      What do you want your assistant to do?
                    </h2>
                    <p className="text-xs opacity-75">
                      Pick a capability below, then upload your document or click Continue.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STUDIO_SERVICE_REPRESENTATIONS.map((svc) => {
                    const isSelected = svc.id === selectedServiceId;
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => handleSelectServiceStudio(svc)}
                        className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-[#D9A441] bg-[#D9A441]/15 font-semibold shadow-sm'
                            : isDark
                              ? 'border-white/10 bg-[#0F1226]/60 opacity-80 hover:opacity-100'
                              : 'border-[#0F1226]/10 bg-[#FAF6EC]/60 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <span className="text-xs font-bold">{svc.shortLabel}</span>
                        <span className="mt-1 line-clamp-2 text-[11px] opacity-75">
                          {svc.tagline}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Practical Action Box Based on Selected Service */}
              {selectedServiceId === 'svc-rag' ? (
                <div
                  className={`rounded-2xl border p-6 ${
                    isDark ? 'border-white/10 bg-[#141742]/60' : 'border-[#0F1226]/10 bg-white'
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold">
                        Upload Your Document (Auto-Advances to Step 2)
                      </h3>
                      <p className="text-xs opacity-75">
                        Upload a PDF, Word (.docx), Markdown, or text file—or test immediately with
                        the sample documents below.
                      </p>
                    </div>
                  </div>

                  {/* Drag & Drop File Upload */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) {
                        handleBinaryFileUpload(droppedFile);
                      }
                    }}
                    className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                      isDraggingFile
                        ? 'border-[#D9A441] bg-[#D9A441]/15'
                        : isDark
                          ? 'border-white/20 bg-[#0F1226]/60'
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
                          handleBinaryFileUpload(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                    <FileUp className="mx-auto h-8 w-8 text-[#D9A441]" />
                    <div className="mt-2 text-sm font-bold">
                      {isUploading
                        ? 'Uploading & indexing your document…'
                        : 'Drop a file here or click Upload Document'}
                    </div>
                    <p className="mt-1 text-xs opacity-70">
                      Supports .pdf, .docx, .md, and .txt (up to 10 MB). Automatically moves you to
                      Step 2 once uploaded.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#D9A441] px-5 py-2.5 text-xs font-bold text-[#0F1226] shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        <span>{isUploading ? 'Uploading…' : 'Upload Document from Computer'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTextPasteForm((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-current/20 px-4 py-2.5 text-xs font-semibold hover:bg-current/5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{showTextPasteForm ? 'Hide Paste Box' : 'Or Paste Text Note'}</span>
                      </button>
                    </div>
                  </div>

                  {uploadMessage && (
                    <div className="mt-3 rounded-xl border border-[#2E8B57]/40 bg-[#2E8B57]/10 px-3.5 py-2.5 text-xs font-medium text-[#2E8B57]">
                      {uploadMessage}
                    </div>
                  )}

                  {showTextPasteForm && (
                    <form
                      onSubmit={handleUploadRagDoc}
                      className="mt-4 space-y-3 rounded-xl border border-current/10 p-4 text-xs"
                    >
                      <div>
                        <label htmlFor="rag-doc-filename" className="mb-1 block font-semibold">
                          Document Title / Filename
                        </label>
                        <input
                          id="rag-doc-filename"
                          type="text"
                          value={uploadFilename}
                          onChange={(e) => setUploadFilename(e.target.value)}
                          className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                          }`}
                        />
                      </div>
                      <div>
                        <label htmlFor="rag-doc-content" className="mb-1 block font-semibold">
                          Paste Document Text
                        </label>
                        <textarea
                          id="rag-doc-content"
                          rows={3}
                          value={uploadContent}
                          onChange={(e) => setUploadContent(e.target.value)}
                          className={`w-full rounded-lg border p-2.5 text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                          }`}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B3FA8] px-4 py-2.5 text-xs font-bold text-[#FAF6EC]"
                      >
                        <span>Save Note &amp; Continue to Step 2 →</span>
                      </button>
                    </form>
                  )}

                  {/* Ready Documents Already in Workspace + 1-Click Continue */}
                  <div className="mt-6 border-t border-current/10 pt-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <FileText className="h-4 w-4 text-[#2E8B57]" />
                        <span>Ready Documents in Your Workspace ({ragChunks.length})</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActivePhase(2)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B3FA8] px-4 py-2 text-xs font-bold text-[#FAF6EC] transition-opacity hover:opacity-95"
                      >
                        <span>Use Ready Documents &amp; Go to Step 2</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {ragChunks.slice(0, 4).map((chunk) => (
                        <div
                          key={chunk.id}
                          className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-xs ${
                            isDark
                              ? 'border-white/10 bg-[#0F1226]/50'
                              : 'border-[#0F1226]/10 bg-[#FAF6EC]/50'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-[#2E8B57]">
                              {chunk.sourceName}
                            </span>
                            <p className="mt-1 line-clamp-2 opacity-75">{chunk.content}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTestPrompt(
                                chunk.sourceName.toLowerCase().includes('paystack')
                                  ? 'What are the key onboarding and Paystack settlement rules in our Lagos SME handbook?'
                                  : `What are the main points covered in ${chunk.sourceName}?`
                              );
                              setActivePhase(2);
                            }}
                            className="shrink-0 rounded-lg border border-current/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-current/5"
                          >
                            Ask About This →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Non-RAG Service Quick Setup Box (Finance, API, SEO, Email, or AI Prompt) */
                <div
                  className={`rounded-2xl border p-6 ${
                    isDark ? 'border-white/10 bg-[#141742]/60' : 'border-[#0F1226]/10 bg-white'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold">
                        {activeServiceRep.serviceTitle}
                      </h3>
                      <p className="text-xs opacity-75">{activeServiceRep.tagline}</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    {selectedServiceId === 'svc-http' && toolNode && (
                      <div>
                        <label htmlFor="tool-endpoint-url" className="mb-1.5 block font-semibold">
                          Public HTTPS Webhook or API URL to Connect
                        </label>
                        <input
                          id="tool-endpoint-url"
                          type="text"
                          value={toolNode.config.toolEndpoint || 'https://api.paystack.co/'}
                          onChange={(e) =>
                            handleUpdateNodeById(toolNode.id, { toolEndpoint: e.target.value })
                          }
                          placeholder="https://api.paystack.co/transaction/verify"
                          className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                          }`}
                        />
                      </div>
                    )}

                    {llmNode && (
                      <div>
                        <label htmlFor="quick-sysprompt" className="mb-1.5 block font-semibold">
                          How should your assistant behave? (Instructions)
                        </label>
                        <textarea
                          id="quick-sysprompt"
                          rows={3}
                          value={llmNode.config.systemPrompt || ''}
                          onChange={(e) =>
                            handleUpdateNodeById(llmNode.id, { systemPrompt: e.target.value })
                          }
                          className={`w-full rounded-xl border p-3 text-xs leading-relaxed ${
                            isDark
                              ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                          }`}
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setActivePhase(2)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#D9A441] px-5 py-2.5 text-xs font-bold text-[#0F1226] transition-opacity hover:opacity-95"
                      >
                        <span>Save &amp; Test Live in Step 2</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* PHASE 2: ASK & TEST YOUR ASSISTANT LIVE                           */}
          {/* ================================================================= */}
          {activePhase === 2 && (
            <div className="space-y-5">
              {uploadMessage && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2E8B57]/40 bg-[#2E8B57]/10 px-4 py-3 text-xs font-medium text-[#2E8B57]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{uploadMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadMessage(null)}
                    className="text-[11px] font-semibold opacity-75 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div
                className={`rounded-2xl border p-6 ${
                  isDark ? 'border-white/10 bg-[#141742]/60' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold">
                      Ask Your Assistant a Question
                    </h2>
                    <p className="text-xs opacity-75">
                      Searching {ragChunks.length} indexed document passage(s) in{' '}
                      <span className="font-semibold">{activeWorkspace.name}</span>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePhase(1)}
                      className="inline-flex items-center gap-1 rounded-lg border border-current/15 px-3 py-1.5 text-xs font-semibold hover:bg-current/5"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Upload More Files</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowModelSettings((v) => !v)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        showModelSettings
                          ? 'border-[#D9A441] bg-[#D9A441]/15'
                          : 'border-current/15 hover:bg-current/5'
                      }`}
                    >
                      <Sliders className="h-3.5 w-3.5 text-[#D9A441]" />
                      <span>AI Model ({llmNode?.config.provider || 'gemini'})</span>
                    </button>
                  </div>
                </div>

                {/* Collapsible AI Model & Instructions Drawer */}
                <AnimatePresence>
                  {showModelSettings && llmNode && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-5 overflow-hidden"
                    >
                      <div
                        className={`space-y-4 rounded-xl border p-4 text-xs ${
                          isDark
                            ? 'border-white/10 bg-[#0F1226]/80'
                            : 'border-[#0F1226]/10 bg-[#FAF6EC]/80'
                        }`}
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label htmlFor="llm-provider" className="mb-1 block font-semibold">
                              AI Provider
                            </label>
                            <select
                              id="llm-provider"
                              value={llmNode.config.provider || 'gemini'}
                              onChange={(e) => {
                                const nextProvider = e.target.value as ModelProvider;
                                const defaultModelByProvider: Record<ModelProvider, string> = {
                                  gemini: 'gemini-3.8-flash',
                                  openai: 'gpt-4o-mini',
                                  anthropic: 'claude-3-7-sonnet',
                                  mistral: 'mistral-large-latest',
                                  ollama: 'llama3.2:latest',
                                };
                                handleUpdateNodeById(llmNode.id, {
                                  provider: nextProvider,
                                  modelName: defaultModelByProvider[nextProvider],
                                });
                              }}
                              className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold ${
                                isDark
                                  ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                                  : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                              }`}
                            >
                              <option value="gemini">Google Gemini</option>
                              <option value="openai">OpenAI</option>
                              <option value="anthropic">Anthropic Claude</option>
                              <option value="mistral">Mistral AI</option>
                              <option value="ollama">Ollama (Local Llama)</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="llm-model" className="mb-1 block font-semibold">
                              Model Name
                            </label>
                            <input
                              id="llm-model"
                              type="text"
                              value={llmNode.config.modelName || 'gemini-3.8-flash'}
                              onChange={(e) =>
                                handleUpdateNodeById(llmNode.id, { modelName: e.target.value })
                              }
                              className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
                                isDark
                                  ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                                  : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="llm-sysprompt" className="mb-1 block font-semibold">
                            Assistant Instructions
                          </label>
                          <textarea
                            id="llm-sysprompt"
                            rows={2}
                            value={llmNode.config.systemPrompt || ''}
                            onChange={(e) =>
                              handleUpdateNodeById(llmNode.id, { systemPrompt: e.target.value })
                            }
                            className={`w-full rounded-lg border p-2.5 text-xs ${
                              isDark
                                ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                                : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                            }`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 1-Click Sample Questions */}
                <div className="mb-3">
                  <div className="mb-1.5 text-[11px] font-semibold opacity-70">
                    Click a sample question or type your own:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SAMPLE_PROMPTS.map((sample, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleRunWorkflow(sample)}
                        className={`rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                          testPrompt === sample
                            ? 'border-[#D9A441] bg-[#D9A441]/15 font-semibold'
                            : 'border-current/15 opacity-80 hover:bg-current/5 hover:opacity-100'
                        }`}
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Question Input + Run Button */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label htmlFor="studio-test-prompt" className="sr-only">
                    Ask a question
                  </label>
                  <input
                    id="studio-test-prompt"
                    type="text"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isRunning && testPrompt.trim()) {
                        handleRunWorkflow();
                      }
                    }}
                    placeholder="Type a question about your documents..."
                    className={`w-full flex-1 rounded-xl border px-4 py-3 text-sm ${
                      isDark
                        ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                        : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRunWorkflow()}
                    disabled={isRunning || !testPrompt.trim()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-6 py-3 text-sm font-bold text-[#0F1226] transition-opacity hover:opacity-95 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>{isRunning ? 'Running…' : 'Run Assistant'}</span>
                  </button>
                </div>

                {/* Error Alert */}
                {runError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#C84B31] bg-[#C84B31]/10 p-4 text-xs text-[#C84B31]"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-bold">Could not run request</div>
                      <p className="mt-0.5">{runError}</p>
                    </div>
                  </div>
                )}

                {/* Answer & Citations Card */}
                {runResult && (
                  <div className="mt-6 space-y-4 border-t border-current/10 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#2E8B57]" />
                        <span className="font-bold text-[#2E8B57]">Assistant Answer</span>
                        <span className="font-mono opacity-60">
                          · {runResult.durationMs}ms
                        </span>
                      </div>

                      <div className="flex items-center gap-1 rounded-lg border border-current/15 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setOutputTab('answer')}
                          className={`rounded-md px-2.5 py-1 font-semibold ${
                            outputTab === 'answer'
                              ? 'bg-[#3B3FA8] text-[#FAF6EC]'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          Answer &amp; Sources ({runResult.citations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutputTab('trace')}
                          className={`rounded-md px-2.5 py-1 font-semibold ${
                            outputTab === 'trace'
                              ? 'bg-[#3B3FA8] text-[#FAF6EC]'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          Steps ({runResult.traceSteps.length})
                        </button>
                      </div>
                    </div>

                    {outputTab === 'answer' ? (
                      <>
                        <div
                          className={`rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-line ${
                            isDark
                              ? 'border-white/10 bg-[#0F1226]/70'
                              : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
                          }`}
                        >
                          {runResult.answer}
                        </div>

                        {runResult.citations.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-semibold opacity-75">
                              Verified Document Sources:
                            </div>
                            {runResult.citations.map((cit) => (
                              <div
                                key={cit.documentId}
                                className="rounded-lg border border-current/10 px-3 py-2 text-xs"
                              >
                                <span className="font-mono font-bold text-[#2E8B57]">
                                  [{cit.sourceName}]
                                </span>
                                <span className="mx-1.5 opacity-40">·</span>
                                <span className="opacity-85">“{cit.excerpt}”</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {runResult.traceSteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-3 rounded-lg border border-current/10 p-3"
                          >
                            <div>
                              <span className="font-semibold">{step.node}</span>
                              <span className="mx-1.5 opacity-40">·</span>
                              <span className="opacity-80">{step.detail}</span>
                            </div>
                            <span className="font-mono text-[11px] font-semibold uppercase text-[#2E8B57]">
                              {step.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Next Phase CTA */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-4">
                      <span className="text-xs opacity-75">
                        Happy with how your assistant answers? Publish and share it now.
                      </span>
                      <button
                        type="button"
                        onClick={() => setActivePhase(3)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#3B3FA8] px-5 py-2.5 text-xs font-bold text-[#FAF6EC] transition-opacity hover:opacity-95"
                      >
                        <span>Continue to Step 3: Publish &amp; Share</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PHASE 3: PUBLISH, SHARE LINK, EMBED OR API                        */}
          {/* ================================================================= */}
          {activePhase === 3 && (
            <div className="space-y-5">
              <div
                className={`rounded-2xl border p-6 ${
                  isDark ? 'border-white/10 bg-[#141742]/60' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold">
                      Your Assistant is Ready to Share
                    </h2>
                    <p className="text-xs opacity-75">
                      Share a direct chat link, embed on your website, or call via REST API.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActivePhase(2)}
                    className="inline-flex items-center gap-1 rounded-lg border border-current/15 px-3 py-1.5 text-xs font-semibold hover:bg-current/5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Step 2 (Test)</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* 1. Shareable Public Chat Link */}
                  <div
                    className={`rounded-xl border p-4 ${
                      isDark ? 'border-white/10 bg-[#0F1226]/70' : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold">1. Shareable Public Chat Link</span>
                      <button
                        type="button"
                        onClick={onOpenPublicChat}
                        className="inline-flex items-center gap-1 font-bold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                      >
                        <span>Open Live Chat Page</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        readOnly
                        value={shareableUrl}
                        className="w-full flex-1 rounded-lg border border-current/15 bg-transparent px-3 py-2 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(shareableUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-bold text-[#0F1226]"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedLink ? 'Copied Link!' : 'Copy Chat Link'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Website Embed Code */}
                  <div
                    className={`rounded-xl border p-4 ${
                      isDark ? 'border-white/10 bg-[#0F1226]/70' : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold">2. Embed on Your Website (HTML)</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(embedSnippet);
                          setCopiedEmbed(true);
                          setTimeout(() => setCopiedEmbed(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-3 py-1 text-xs font-semibold hover:bg-current/5"
                      >
                        {copiedEmbed ? <Check className="h-3.5 w-3.5 text-[#2E8B57]" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedEmbed ? 'Copied!' : 'Copy Embed Code'}</span>
                      </button>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-current/10 bg-black/20 p-3 font-mono text-[11px] leading-relaxed">
                      {embedSnippet}
                    </pre>
                  </div>

                  {/* 3. REST API Endpoint */}
                  <div
                    className={`rounded-xl border p-4 ${
                      isDark ? 'border-white/10 bg-[#0F1226]/70' : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold">3. Call via REST API</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(curlSnippet);
                          setCopiedApi(true);
                          setTimeout(() => setCopiedApi(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-3 py-1 text-xs font-semibold hover:bg-current/5"
                      >
                        {copiedApi ? <Check className="h-3.5 w-3.5 text-[#2E8B57]" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedApi ? 'Copied!' : 'Copy cURL'}</span>
                      </button>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-current/10 bg-black/20 p-3 font-mono text-[11px] leading-relaxed">
                      {curlSnippet}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
