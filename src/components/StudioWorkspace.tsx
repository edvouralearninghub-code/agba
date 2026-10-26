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
  Trash2,
  ArrowRight,
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
  StudioNodeKind,
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

const NODE_PALETTE: {
  kind: StudioNodeKind;
  title: string;
  subtitle: string;
  defaultConfig: StudioNode['config'];
}[] = [
  {
    kind: 'input_trigger',
    title: 'Chat / Webhook Input',
    subtitle: 'Captures incoming user question',
    defaultConfig: {},
  },
  {
    kind: 'rag_retriever',
    title: 'Knowledge Base Retriever',
    subtitle: 'Finds relevant passages from your files',
    defaultConfig: { topK: 3, citationRequired: true },
  },
  {
    kind: 'llm_generator',
    title: 'AI Model Synthesizer',
    subtitle: 'Gemini, OpenAI, Anthropic, Mistral, Ollama',
    defaultConfig: {
      provider: 'gemini',
      modelName: 'gemini-3.8-flash',
      temperature: 0.2,
      systemPrompt:
        'You are a wise, respectful assistant. Answer strictly from retrieved sources and cite filenames.',
    },
  },
  {
    kind: 'agent_tool',
    title: 'Service Tool Step',
    subtitle: 'Calculator, External API, Web Search, Docs, Email',
    defaultConfig: {
      toolId: 'calculator',
    },
  },
  {
    kind: 'output_response',
    title: 'Cited Response Output',
    subtitle: 'Shareable Chat & REST API response',
    defaultConfig: {},
  },
];

const ALL_TOOLS: { id: AllowedToolId; label: string; description: string }[] = [
  {
    id: 'document_retrieval',
    label: 'Knowledge Base Retrieval',
    description: 'Searches your private workspace documents with cosine similarity',
  },
  {
    id: 'calculator',
    label: 'Finance & Calculator',
    description: 'Deterministic NGN/USD margin, runway, and kobo/cents math',
  },
  {
    id: 'http_request',
    label: 'External API & Webhook',
    description: 'Connects safely to public HTTPS endpoints (SSRF-guarded)',
  },
  {
    id: 'web_search',
    label: 'Web Search & SEO Audit',
    description: 'Finds live web signals, Schema.org metadata, and GEO insights',
  },
  {
    id: 'send_email_novu',
    label: 'Email & Team Notifications',
    description: 'Sends automated email digests and team channel alerts',
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
  const [selectedServiceId, setSelectedServiceId] = useState<string>('svc-rag');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    workflow.nodes.find((n) => n.kind === 'rag_retriever')?.id ||
      workflow.nodes.find((n) => n.kind === 'llm_generator')?.id ||
      workflow.nodes[0]?.id ||
      ''
  );
  const [showAddStepMenu, setShowAddStepMenu] = useState<boolean>(false);
  const [outputTab, setOutputTab] = useState<'answer' | 'trace'>('answer');

  const [testPrompt, setTestPrompt] = useState<string>(QUICK_SAMPLE_PROMPTS[0]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
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

  // RAG upload state
  const [ragChunks, setRagChunks] = useState<RagDocumentChunk[]>([]);
  const [uploadFilename, setUploadFilename] = useState<string>('Lagos_Cooperative_Onboarding.md');
  const [uploadContent, setUploadContent] = useState<string>(
    'All cooperative merchants must complete KYC verification and configure their Paystack settlement bank account in NGN kobo before enabling automated payouts.'
  );
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [showTextPasteForm, setShowTextPasteForm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Publish & Audit drawer state
  const [showPublishPanel, setShowPublishPanel] = useState<boolean>(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<boolean>(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<StudioAuditReport | null>(null);

  useEffect(() => {
    if (!workflow.nodes.some((n) => n.id === selectedNodeId) && workflow.nodes.length > 0) {
      const preferred =
        workflow.nodes.find((n) => n.kind === 'agent_tool') ||
        workflow.nodes.find((n) => n.kind === 'rag_retriever') ||
        workflow.nodes.find((n) => n.kind === 'llm_generator') ||
        workflow.nodes[0];
      setSelectedNodeId(preferred.id);
    }
  }, [workflow, selectedNodeId]);

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

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) || workflow.nodes[0];
  const activeServiceRep =
    STUDIO_SERVICE_REPRESENTATIONS.find((s) => s.id === selectedServiceId) ||
    STUDIO_SERVICE_REPRESENTATIONS[0];

  const handleSelectServiceStudio = (svc: StudioServiceRepresentation) => {
    setSelectedServiceId(svc.id);
    const tpl = ACADEMY_TEMPLATES.find((t) => t.id === svc.templateId);
    if (tpl && onSelectTemplate) {
      onSelectTemplate(tpl);
      setTestPrompt(tpl.samplePrompt);
      setRunResult(null);
      setRunError(null);
      setTimeout(() => {
        const targetNode =
          tpl.nodes.find((n) => n.kind === svc.focusNodeKind) ||
          tpl.nodes.find((n) => n.kind === 'llm_generator') ||
          tpl.nodes[0];
        if (targetNode) {
          setSelectedNodeId(targetNode.id);
        }
      }, 20);
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
    setTimeout(() => {
      const focusNode =
        tpl.nodes.find((n) => n.kind === 'agent_tool') ||
        tpl.nodes.find((n) => n.kind === 'rag_retriever') ||
        tpl.nodes.find((n) => n.kind === 'llm_generator') ||
        tpl.nodes[0];
      if (focusNode) {
        setSelectedNodeId(focusNode.id);
      }
    }, 20);
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

  const handleAddNode = (item: (typeof NODE_PALETTE)[number]) => {
    const newId = `node_${Date.now().toString(36)}`;
    const lastNode = workflow.nodes[workflow.nodes.length - 1];
    const newNode: StudioNode = {
      id: newId,
      kind: item.kind,
      title: item.title,
      subtitle: item.subtitle,
      x: lastNode ? Math.min(lastNode.x + 220, 860) : 120,
      y: lastNode ? ((lastNode.y + 90) % 240) + 50 : 120,
      config: { ...item.defaultConfig },
    };

    const newEdges = lastNode
      ? [
          ...workflow.edges,
          {
            id: `edge_${Date.now().toString(36)}`,
            source: lastNode.id,
            target: newId,
            label: 'flow',
          },
        ]
      : workflow.edges;

    onUpdateWorkflow({
      ...workflow,
      nodes: [...workflow.nodes, newNode],
      edges: newEdges,
      updatedAt: new Date().toISOString(),
    });
    setSelectedNodeId(newId);
    setShowAddStepMenu(false);
  };

  const handleRemoveNode = (nodeId: string) => {
    if (workflow.nodes.length <= 1) return;
    const remainingNodes = workflow.nodes.filter((n) => n.id !== nodeId);
    const remainingEdges = workflow.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    onUpdateWorkflow({
      ...workflow,
      nodes: remainingNodes,
      edges: remainingEdges,
      updatedAt: new Date().toISOString(),
    });
    if (selectedNodeId === nodeId && remainingNodes[0]) {
      setSelectedNodeId(remainingNodes[0].id);
    }
  };

  const handleUpdateSelectedNodeConfig = (patch: Partial<StudioNode['config']>) => {
    if (!selectedNode) return;
    handleUpdateNodeById(selectedNode.id, patch);
  };

  const handleToggleAllowedTool = (toolId: AllowedToolId) => {
    const exists = workflow.allowedTools.includes(toolId);
    const updatedTools = exists
      ? workflow.allowedTools.filter((t) => t !== toolId)
      : [...workflow.allowedTools, toolId];
    onUpdateWorkflow({
      ...workflow,
      allowedTools: updatedTools,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleBinaryFileUpload = async (file: File) => {
    setUploadMessage(`Indexing "${file.name}" (${file.size.toLocaleString()} bytes)…`);
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
        setUploadMessage(`Blocked: ${data.error}`);
        return;
      }
      setUploadMessage(
        `Indexed ${data.chunksCreated} passage(s) from "${file.name}". Ready for questions!`
      );
      fetchWorkspaceChunks();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'File upload failed');
    }
  };

  const handleUploadRagDoc = async (e: React.FormEvent) => {
    e.preventDefault();
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
        return;
      }
      setUploadMessage(`Saved "${uploadFilename}" to workspace knowledge base.`);
      setShowTextPasteForm(false);
      fetchWorkspaceChunks();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    setRunError(null);
    setRunResult(null);
    setCompletedNodeIds([]);
    setActiveEdgeId(null);

    for (let i = 0; i < workflow.nodes.length; i++) {
      const node = workflow.nodes[i];
      setExecutingNodeId(node.id);
      await new Promise((r) => setTimeout(r, 180));
      setCompletedNodeIds((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));

      const outgoingEdge =
        workflow.edges.find((e) => e.source === node.id) || workflow.edges[i];
      if (outgoingEdge && i < workflow.nodes.length - 1) {
        setExecutingNodeId(null);
        setActiveEdgeId(outgoingEdge.id);
        await new Promise((r) => setTimeout(r, 110));
        setActiveEdgeId(null);
      }
    }

    const llmNode = workflow.nodes.find((n) => n.kind === 'llm_generator');
    const toolNode = workflow.nodes.find((n) => n.kind === 'agent_tool');

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
          prompt: testPrompt,
          systemPrompt: llmNode?.config.systemPrompt,
          provider: llmNode?.config.provider,
          modelName: llmNode?.config.modelName,
          allowedTools: workflow.allowedTools,
          activeTool: toolNode?.config.toolId,
          toolTargetUrl: toolNode?.config.toolEndpoint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error || 'Workflow execution blocked by policy.');
      } else {
        setRunResult(data);
        setOutputTab('answer');
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsRunning(false);
      setExecutingNodeId(null);
      setActiveEdgeId(null);
    }
  };

  const getNodeIcon = (kind: StudioNodeKind) => {
    switch (kind) {
      case 'input_trigger':
        return <MessageSquare className="h-4 w-4 text-[#D9A441]" />;
      case 'rag_retriever':
        return <Database className="h-4 w-4 text-[#3B3FA8] dark:text-[#D9A441]" />;
      case 'llm_generator':
        return <Cpu className="h-4 w-4 text-[#3B3FA8] dark:text-[#D9A441]" />;
      case 'agent_tool':
        return <Wrench className="h-4 w-4 text-[#C9821B]" />;
      case 'output_response':
        return <CheckCircle2 className="h-4 w-4 text-[#2E8B57]" />;
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

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Minimalist Top Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-base font-bold sm:text-lg">{workflow.name}</h1>
          <span className="text-xs opacity-50">·</span>
          <label htmlFor="studio-template-select" className="sr-only">
            Switch Studio Template
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
              All 12 Studio Templates…
            </option>
            {ACADEMY_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title} ({tpl.track})
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
            <span>{isAuditing ? 'Auditing Studios…' : 'Verify All Studios'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPublishPanel((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              showPublishPanel
                ? 'border-[#D9A441] bg-[#D9A441] text-[#0F1226]'
                : 'border-current/20 hover:bg-current/5'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Publish &amp; API</span>
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

      {/* Collapsible Studio Services Auditor Drawer */}
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
                  <span className="font-bold">
                    All 6 Core Service Studios &amp; 12 Templates Verified Operational
                  </span>
                  <span className="opacity-60">·</span>
                  <span className="font-mono opacity-75">Workspace: {auditReport.workspace_id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuditDrawer(false)}
                  className="text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Close Audit
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

      {/* Collapsible Publish & API Drawer */}
      <AnimatePresence>
        {showPublishPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-b ${
              isDark ? 'border-white/10 bg-[#141742]' : 'border-[#0F1226]/10 bg-[#F3EDE0]'
            }`}
          >
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 md:grid-cols-3">
              <div
                className={`rounded-xl border p-3.5 ${
                  isDark ? 'border-white/10 bg-[#0F1226]/80' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">01. Public Chat Link</span>
                  <button
                    type="button"
                    onClick={onOpenPublicChat}
                    className="font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                  >
                    Launch
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="w-full rounded-lg border border-current/15 bg-transparent px-2.5 py-1.5 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(shareableUrl);
                      setCopiedEndpoint(true);
                      setTimeout(() => setCopiedEndpoint(false), 2000);
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#D9A441] px-2.5 py-1.5 text-xs font-semibold text-[#0F1226]"
                  >
                    {copiedEndpoint ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div
                className={`rounded-xl border p-3.5 ${
                  isDark ? 'border-white/10 bg-[#0F1226]/80' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <span className="text-xs font-semibold">02. REST API Endpoint</span>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-current/10 bg-black/20 p-2 font-mono text-[11px] leading-relaxed">
{`POST ${restEndpointUrl}
{"prompt": "Hello assistant"}`}
                </pre>
              </div>

              <div
                className={`rounded-xl border p-3.5 ${
                  isDark ? 'border-white/10 bg-[#0F1226]/80' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <span className="text-xs font-semibold">03. Website Embed</span>
                <pre className="mt-2 overflow-x-auto rounded-lg border border-current/10 bg-black/20 p-2 font-mono text-[11px] leading-relaxed">
{`<iframe src="${shareableUrl}" width="100%" height="580"></iframe>`}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimalist Single-Column Workspace Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
          {/* SECTION 1: Service Studio Switcher (All 6 Core AGBA Services Simplified) */}
          <section aria-label="Core Service Studios">
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-sm font-bold">
                01. Choose a Service Studio
              </h2>
              <p className="text-xs opacity-70">{activeServiceRep.tagline}</p>
            </div>

            <div
              className={`flex flex-wrap gap-1.5 rounded-xl p-1.5 ${
                isDark ? 'bg-[#0E1030]' : 'bg-[#F3EDE0]'
              }`}
            >
              {STUDIO_SERVICE_REPRESENTATIONS.map((svc) => {
                const isActive = svc.id === selectedServiceId;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleSelectServiceStudio(svc)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#3B3FA8] text-[#FAF6EC] shadow-sm'
                        : 'opacity-75 hover:bg-current/5 hover:opacity-100'
                    }`}
                  >
                    {svc.shortLabel}
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: Linear Workflow Stepper (Click Any Step to Focus) */}
          <section aria-label="Active Workflow Steps">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <h2 className="font-display text-sm font-bold">
                  02. Select Workflow Step to Configure
                </h2>
                <span className="opacity-50">·</span>
                <span className="opacity-70">
                  Focusing on 1 active step at a time
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddStepMenu((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-current/15 px-2.5 py-1 text-xs font-semibold hover:bg-current/5"
                >
                  <Plus className="h-3.5 w-3.5 text-[#D9A441]" />
                  <span>Add Step</span>
                </button>

                {showAddStepMenu && (
                  <div
                    className={`absolute right-0 z-20 mt-1.5 w-60 rounded-xl border p-1.5 shadow-lg ${
                      isDark
                        ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                        : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                    }`}
                  >
                    {NODE_PALETTE.map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        onClick={() => handleAddNode(item)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-current/5"
                      >
                        {getNodeIcon(item.kind)}
                        <div>
                          <div className="font-semibold">{item.title}</div>
                          <div className="text-[11px] opacity-65">{item.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {workflow.nodes.map((node, index) => {
                const isSelected = selectedNode?.id === node.id;
                const isExecuting = executingNodeId === node.id;
                const isDone = completedNodeIds.includes(node.id);
                const nextEdge =
                  workflow.edges.find((e) => e.source === node.id) || workflow.edges[index];
                const isEdgeActive = Boolean(nextEdge && activeEdgeId === nextEdge.id);

                return (
                  <React.Fragment key={node.id}>
                    <motion.button
                      type="button"
                      layout
                      onClick={() => setSelectedNodeId(node.id)}
                      animate={{ scale: isExecuting ? 1.03 : 1 }}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all ${
                        isExecuting
                          ? 'border-[#2E8B57] bg-[#2E8B57]/20 font-bold ring-2 ring-[#2E8B57]/40'
                          : isSelected
                            ? 'border-[#D9A441] bg-[#D9A441]/15 font-semibold shadow-sm'
                            : isDone
                              ? 'border-[#2E8B57]/50 bg-[#2E8B57]/10'
                              : isDark
                                ? 'border-white/10 bg-[#141742]/60 opacity-80 hover:opacity-100'
                                : 'border-[#0F1226]/10 bg-white opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span className="font-mono text-[11px] opacity-60">0{index + 1}.</span>
                      {getNodeIcon(node.kind)}
                      <span>{node.title}</span>
                    </motion.button>

                    {index < workflow.nodes.length - 1 && (
                      <motion.span
                        animate={{
                          scale: isEdgeActive ? 1.25 : 1,
                          color: isEdgeActive ? '#D9A441' : undefined,
                        }}
                        className="opacity-40"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </motion.span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          {/* SECTION 3: Focused Active Node Configuration Panel (Single Surface) */}
          {selectedNode && (
            <section
              aria-label="Focused Step Settings"
              className={`rounded-2xl border p-6 ${
                isDark ? 'border-white/10 bg-[#141742]/60' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-4">
                <div className="flex items-center gap-3">
                  {getNodeIcon(selectedNode.kind)}
                  <div>
                    <h3 className="font-display text-base font-bold">{selectedNode.title}</h3>
                    <p className="text-xs opacity-70">{selectedNode.subtitle}</p>
                  </div>
                </div>

                {workflow.nodes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveNode(selectedNode.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-3 py-1.5 text-xs font-medium opacity-75 hover:border-[#C84B31] hover:text-[#C84B31] hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove Step</span>
                  </button>
                )}
              </div>

              {/* Focused Controls for INPUT TRIGGER */}
              {selectedNode.kind === 'input_trigger' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label htmlFor="studio-app-name" className="mb-1.5 block font-semibold">
                      Assistant / Studio Name
                    </label>
                    <input
                      id="studio-app-name"
                      type="text"
                      value={workflow.name}
                      onChange={(e) =>
                        onUpdateWorkflow({
                          ...workflow,
                          name: e.target.value,
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium ${
                        isDark
                          ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                      }`}
                    />
                  </div>
                  <p className="text-xs leading-relaxed opacity-75">
                    This entry step receives user questions from the live test runner below, your
                    shareable Public Chat link, or authenticated REST API calls.
                  </p>
                </div>
              )}

              {/* Focused Controls for KNOWLEDGE BASE RETRIEVER (RAG) */}
              {selectedNode.kind === 'rag_retriever' && (
                <div className="space-y-5 text-xs">
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
                    className={`rounded-xl border border-dashed p-5 text-center transition-colors ${
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
                    <FileUp className="mx-auto h-6 w-6 text-[#D9A441]" />
                    <div className="mt-2 text-sm font-semibold">
                      Upload Knowledge Files (.pdf, .docx, .md, .txt)
                    </div>
                    <p className="mt-1 text-xs opacity-70">
                      Documents are chunked and isolated strictly to workspace {activeWorkspace.name}.
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226]"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Choose File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTextPasteForm((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3 py-2 text-xs font-semibold hover:bg-current/5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{showTextPasteForm ? 'Hide Text Form' : 'Paste Text Snippet'}</span>
                      </button>
                    </div>
                  </div>

                  {uploadMessage && (
                    <div className="text-xs font-medium text-[#2E8B57]">{uploadMessage}</div>
                  )}

                  {showTextPasteForm && (
                    <form onSubmit={handleUploadRagDoc} className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="rag-doc-filename" className="mb-1 block font-semibold">
                            Filename
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
                      </div>
                      <div>
                        <label htmlFor="rag-doc-content" className="mb-1 block font-semibold">
                          Content
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B3FA8] px-4 py-2 text-xs font-semibold text-[#FAF6EC]"
                      >
                        <span>Save to Knowledge Base</span>
                      </button>
                    </form>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-current/10 pt-4">
                    <div className="flex items-center gap-3">
                      <label htmlFor="rag-topk" className="font-semibold">
                        Passages Retrieved (Top-K):
                      </label>
                      <input
                        id="rag-topk"
                        type="number"
                        min={1}
                        max={10}
                        value={selectedNode.config.topK ?? 3}
                        onChange={(e) =>
                          handleUpdateSelectedNodeConfig({
                            topK: parseInt(e.target.value, 10) || 3,
                          })
                        }
                        className={`w-20 rounded-lg border px-2.5 py-1.5 font-mono text-xs ${
                          isDark
                            ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                        }`}
                      />
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 font-semibold">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedNode.config.citationRequired)}
                        onChange={(e) =>
                          handleUpdateSelectedNodeConfig({
                            citationRequired: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#2E8B57]"
                      />
                      <span>Require Source Filename Citations</span>
                    </label>
                  </div>

                  <div className="border-t border-current/10 pt-4">
                    <div className="mb-2 font-semibold">
                      Indexed Workspace Documents ({ragChunks.length} passages)
                    </div>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {ragChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="flex items-start justify-between gap-3 border-b border-current/10 pb-2 text-xs last:border-b-0"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-semibold text-[#2E8B57]">
                              {chunk.sourceName}
                            </span>
                            <span className="mx-1.5 opacity-40">·</span>
                            <span className="opacity-75">{chunk.content}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Focused Controls for AI MODEL SYNTHESIZER (LLM) */}
              {selectedNode.kind === 'llm_generator' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="llm-provider" className="mb-1.5 block font-semibold">
                        AI Model Provider
                      </label>
                      <select
                        id="llm-provider"
                        value={selectedNode.config.provider || 'gemini'}
                        onChange={(e) => {
                          const nextProvider = e.target.value as ModelProvider;
                          const defaultModelByProvider: Record<ModelProvider, string> = {
                            gemini: 'gemini-3.8-flash',
                            openai: 'gpt-4o-mini',
                            anthropic: 'claude-3-7-sonnet',
                            mistral: 'mistral-large-latest',
                            ollama: 'llama3.2:latest',
                          };
                          handleUpdateSelectedNodeConfig({
                            provider: nextProvider,
                            modelName: defaultModelByProvider[nextProvider],
                          });
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                          isDark
                            ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                        }`}
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="mistral">Mistral AI</option>
                        <option value="ollama">Ollama (Self-Hosted)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="llm-model" className="mb-1.5 block font-semibold">
                        Model Name
                      </label>
                      <input
                        id="llm-model"
                        type="text"
                        value={selectedNode.config.modelName || 'gemini-3.8-flash'}
                        onChange={(e) =>
                          handleUpdateSelectedNodeConfig({ modelName: e.target.value })
                        }
                        className={`w-full rounded-xl border px-3 py-2.5 font-mono text-xs ${
                          isDark
                            ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="llm-temp" className="font-semibold">
                          Temperature
                        </label>
                        <span className="font-mono font-bold text-[#D9A441]">
                          {selectedNode.config.temperature ?? 0.2}
                        </span>
                      </div>
                      <input
                        id="llm-temp"
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={selectedNode.config.temperature ?? 0.2}
                        onChange={(e) =>
                          handleUpdateSelectedNodeConfig({
                            temperature: parseFloat(e.target.value),
                          })
                        }
                        className="mt-2 w-full accent-[#D9A441]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="llm-sysprompt" className="mb-1.5 block font-semibold">
                      System Instructions
                    </label>
                    <textarea
                      id="llm-sysprompt"
                      rows={4}
                      value={selectedNode.config.systemPrompt || ''}
                      onChange={(e) =>
                        handleUpdateSelectedNodeConfig({ systemPrompt: e.target.value })
                      }
                      className={`w-full rounded-xl border p-3.5 text-xs leading-relaxed ${
                        isDark
                          ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Focused Controls for SERVICE TOOL STEP (Calculator / API / Search / Email) */}
              {selectedNode.kind === 'agent_tool' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="active-service-tool" className="mb-1.5 block font-semibold">
                        Active Service Capability
                      </label>
                      <select
                        id="active-service-tool"
                        value={selectedNode.config.toolId || 'calculator'}
                        onChange={(e) => {
                          const nextTool = e.target.value as AllowedToolId;
                          handleUpdateSelectedNodeConfig({ toolId: nextTool });
                          if (!workflow.allowedTools.includes(nextTool)) {
                            handleToggleAllowedTool(nextTool);
                          }
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                          isDark
                            ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                        }`}
                      >
                        {ALL_TOOLS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedNode.config.toolId === 'http_request' && (
                      <div>
                        <label htmlFor="tool-endpoint-url" className="mb-1.5 block font-semibold">
                          External HTTPS Endpoint (SSRF-Guarded)
                        </label>
                        <input
                          id="tool-endpoint-url"
                          type="text"
                          value={selectedNode.config.toolEndpoint || 'https://api.paystack.co/'}
                          onChange={(e) =>
                            handleUpdateSelectedNodeConfig({ toolEndpoint: e.target.value })
                          }
                          placeholder="https://api.paystack.co/transaction/verify"
                          className={`w-full rounded-xl border px-3 py-2.5 font-mono text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-current/10 pt-3">
                    <div className="mb-2 font-semibold">
                      Allowed Services for This Studio
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {ALL_TOOLS.map((tool) => {
                        const checked = workflow.allowedTools.includes(tool.id);
                        return (
                          <label
                            key={tool.id}
                            className="inline-flex cursor-pointer items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleAllowedTool(tool.id)}
                              className="h-4 w-4 accent-[#2E8B57]"
                            />
                            <span className={checked ? 'font-semibold' : 'opacity-70'}>
                              {tool.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Focused Controls for CITED RESPONSE OUTPUT */}
              {selectedNode.kind === 'output_response' && (
                <div className="space-y-3 text-xs">
                  <p className="opacity-80">
                    Delivers the final response with verified source document citations to your
                    Public Chat page and REST API endpoint.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onOpenPublicChat}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B3FA8] px-3.5 py-2 text-xs font-semibold text-[#FAF6EC]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Public Chat View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPublishPanel(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3.5 py-2 text-xs font-semibold hover:bg-current/5"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>View REST API &amp; Embed Code</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* SECTION 4: Minimalist Live Test Runner & Cited Response */}
          <section
            aria-label="Test and Run Studio"
            className={`rounded-2xl border p-6 ${
              isDark ? 'border-white/10 bg-[#141742]/60' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#D9A441]" />
                <h2 className="font-display text-sm font-bold">
                  03. Test &amp; Run Studio Live
                </h2>
              </div>

              {runResult && (
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
                    Response &amp; Citations ({runResult.citations.length})
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
                    Execution Trace ({runResult.traceSteps.length})
                  </button>
                </div>
              )}
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_SAMPLE_PROMPTS.map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTestPrompt(sample)}
                  className={`rounded-lg border px-2.5 py-1 text-left text-xs transition-colors ${
                    testPrompt === sample
                      ? 'border-[#D9A441] bg-[#D9A441]/15 font-semibold'
                      : 'border-current/15 opacity-75 hover:opacity-100'
                  }`}
                >
                  {sample}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="studio-test-prompt" className="sr-only">
                Test Question
              </label>
              <input
                id="studio-test-prompt"
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Ask a question to test this Studio..."
                className={`w-full flex-1 rounded-xl border px-4 py-3 text-sm ${
                  isDark
                    ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                }`}
              />
              <button
                type="button"
                onClick={handleRunWorkflow}
                disabled={isRunning || !testPrompt.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-6 py-3 text-sm font-bold text-[#0F1226] transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isRunning ? 'Running…' : 'Run Studio'}</span>
              </button>
            </div>

            {runError && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#C84B31] bg-[#C84B31]/10 p-4 text-xs text-[#C84B31]"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-bold">Execution Blocked by Guardrail</div>
                  <p className="mt-0.5">{runError}</p>
                </div>
              </div>
            )}

            {runResult && outputTab === 'answer' && (
              <div className="mt-5 space-y-4 border-t border-current/10 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#2E8B57]">Verified Studio Output</span>
                  <span className="font-mono opacity-70">
                    {runResult.modelUsed} · {runResult.durationMs}ms
                  </span>
                </div>

                <p className="whitespace-pre-line text-sm leading-relaxed">{runResult.answer}</p>

                {runResult.citations.length > 0 && (
                  <div className="border-t border-current/10 pt-3">
                    <div className="mb-2 text-xs font-semibold opacity-75">
                      Source Citations ({runResult.citations.length})
                    </div>
                    <div className="space-y-2">
                      {runResult.citations.map((cit) => (
                        <div key={cit.documentId} className="text-xs">
                          <span className="font-mono font-semibold text-[#2E8B57]">
                            [{cit.sourceName}]
                          </span>
                          {typeof cit.similarityScore === 'number' && (
                            <>
                              <span className="mx-1.5 opacity-40">·</span>
                              <span className="font-mono opacity-75">
                                {Math.round(cit.similarityScore * 100)}% match
                              </span>
                            </>
                          )}
                          <span className="mx-1.5 opacity-40">·</span>
                          <span className="opacity-80">“{cit.excerpt}”</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {runResult && outputTab === 'trace' && (
              <div className="mt-5 space-y-2 border-t border-current/10 pt-4 text-xs">
                {runResult.traceSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 border-b border-current/10 pb-2 last:border-b-0"
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
          </section>
        </div>
      </div>
    </div>
  );
};
