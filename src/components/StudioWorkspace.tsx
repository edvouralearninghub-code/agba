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
  Sparkles,
} from 'lucide-react';
import { ACADEMY_TEMPLATES } from '../data/academyTemplates.ts';
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
    title: 'Agent Tool',
    subtitle: 'Web Request, Search, Calculator, Docs, Email',
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
    label: 'Document Retrieval',
    description: 'Searches your private workspace knowledge base',
  },
  {
    id: 'calculator',
    label: 'Calculator',
    description: 'Accurate currency, margin, and unit economics math',
  },
  {
    id: 'http_request',
    label: 'Web API Request',
    description: 'Connects safely to external public web endpoints',
  },
  {
    id: 'web_search',
    label: 'Web Search',
    description: 'Finds live information from the web',
  },
  {
    id: 'send_email_novu',
    label: 'Send Notification Email',
    description: 'Sends automated email and in-app alerts',
  },
];

const QUICK_SAMPLE_PROMPTS = [
  'How does AGBA protect BYOK model keys and verify Paystack webhooks for Lagos SMEs?',
  'Calculate gross margin for 120 customers at 15,000 NGN with 450,000 NGN server cost.',
  'Summarize our Lagos cooperative onboarding KYC and settlement rules with citations.',
];

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  activeWorkspace,
  workflow,
  onUpdateWorkflow,
  onSelectTemplate,
  onOpenPublicChat,
  isDark,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    workflow.nodes.find((n) => n.kind === 'llm_generator')?.id ||
      workflow.nodes[0]?.id ||
      ''
  );
  const [setupTab, setSetupTab] = useState<'prompt' | 'rag' | 'pipeline'>('prompt');
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

  // Publish drawer state
  const [showPublishPanel, setShowPublishPanel] = useState<boolean>(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<boolean>(false);

  useEffect(() => {
    if (!workflow.nodes.some((n) => n.id === selectedNodeId) && workflow.nodes.length > 0) {
      setSelectedNodeId(workflow.nodes[0].id);
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
  const primaryLlmNode =
    workflow.nodes.find((n) => n.kind === 'llm_generator') || workflow.nodes[0];
  const primaryRagNode = workflow.nodes.find((n) => n.kind === 'rag_retriever');

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
    setSetupTab('pipeline');
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
      await new Promise((r) => setTimeout(r, 220));
      setCompletedNodeIds((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));

      const outgoingEdge =
        workflow.edges.find((e) => e.source === node.id) || workflow.edges[i];
      if (outgoingEdge && i < workflow.nodes.length - 1) {
        setExecutingNodeId(null);
        setActiveEdgeId(outgoingEdge.id);
        await new Promise((r) => setTimeout(r, 140));
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
      {/* Clean Top Studio Header Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#2E8B57]" />
            <h1 className="font-display text-base font-bold sm:text-lg">{workflow.name}</h1>
          </div>

          {onSelectTemplate && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="studio-quick-template" className="sr-only">
                Load Starter Template
              </label>
              <select
                id="studio-quick-template"
                defaultValue=""
                onChange={(e) => {
                  const found = ACADEMY_TEMPLATES.find((t) => t.id === e.target.value);
                  if (found) {
                    onSelectTemplate(found);
                    e.target.value = '';
                  }
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isDark
                    ? 'border-white/15 bg-[#1B1F5E]/60 text-[#FAF6EC] hover:border-[#D9A441]'
                    : 'border-[#0F1226]/15 bg-white text-[#0F1226] hover:border-[#3B3FA8]'
                }`}
              >
                <option value="" disabled>
                  Load Starter Template (12)…
                </option>
                {ACADEMY_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({tpl.track})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPublishPanel((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B3FA8] px-3.5 py-2 text-xs font-semibold text-[#FAF6EC] shadow-sm transition-opacity hover:opacity-95"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Public Chat</span>
          </button>
        </div>
      </div>

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
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-3">
              <div
                className={`rounded-xl border p-4 ${
                  isDark ? 'border-white/10 bg-[#0F1226]/80' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2E8B57]">
                    1. Public Chat Link
                  </span>
                  <button
                    type="button"
                    onClick={onOpenPublicChat}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                  >
                    <span>Test Live</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-1 text-xs opacity-75">
                  Share this link with your team or customers to chat with your assistant.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
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
                    <span>{copiedEndpoint ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  isDark ? 'border-white/10 bg-[#0F1226]/80' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-[#D9A441]">
                  2. REST API Endpoint
                </span>
                <p className="mt-1 text-xs opacity-75">
                  Call your assistant from your backend, mobile app, or webhook.
                </p>
                <pre className="mt-2.5 overflow-x-auto rounded-lg border border-current/10 bg-black/20 p-2 font-mono text-[11px] leading-relaxed">
{`POST ${restEndpointUrl}
Content-Type: application/json

{"prompt": "Hello assistant"}`}
                </pre>
              </div>

              <div
                className={`rounded-xl border p-4 ${
                  isDark ? 'border-white/10 bg-[#0F1226]/80' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-[#3B3FA8] dark:text-[#D9A441]">
                  3. Website Widget Embed
                </span>
                <p className="mt-1 text-xs opacity-75">
                  Paste this iframe snippet into any website or landing page.
                </p>
                <pre className="mt-2.5 overflow-x-auto rounded-lg border border-current/10 bg-black/20 p-2 font-mono text-[11px] leading-relaxed">
{`<iframe
  src="${shareableUrl}"
  width="100%" height="600"
  style="border:0;border-radius:12px;"
></iframe>`}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacious 2-Column Main Workspace (Setup on Left, Live Playground on Right) */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12">
          {/* LEFT COLUMN: 1. Configure Your Assistant (5 cols on desktop) */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            <div
              className={`rounded-2xl border p-5 shadow-sm ${
                isDark ? 'border-white/10 bg-[#141742]/70' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#D9A441]">
                    Step 1 · Configuration
                  </span>
                  <h2 className="font-display text-lg font-bold">Configure Your Assistant</h2>
                </div>
              </div>

              {/* Clean 3-Tab Switcher */}
              <div
                className={`mb-5 grid grid-cols-3 gap-1 rounded-xl p-1 text-xs font-semibold ${
                  isDark ? 'bg-[#0F1226]' : 'bg-[#F3EDE0]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSetupTab('prompt')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                    setupTab === 'prompt'
                      ? 'bg-[#3B3FA8] text-[#FAF6EC] shadow-sm'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">1. Prompt &amp; AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTab('rag')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                    setupTab === 'rag'
                      ? 'bg-[#3B3FA8] text-[#FAF6EC] shadow-sm'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <Database className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">2. Files ({ragChunks.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTab('pipeline')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
                    setupTab === 'pipeline'
                      ? 'bg-[#3B3FA8] text-[#FAF6EC] shadow-sm'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">3. Steps ({workflow.nodes.length})</span>
                </button>
              </div>

              {/* TAB 1: Prompt & Model Settings */}
              {setupTab === 'prompt' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label
                      htmlFor="assistant-name-input"
                      className="mb-1.5 block font-semibold"
                    >
                      Assistant Name
                    </label>
                    <input
                      id="assistant-name-input"
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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="llm-provider-select" className="mb-1.5 block font-semibold">
                        AI Provider
                      </label>
                      <select
                        id="llm-provider-select"
                        value={primaryLlmNode?.config.provider || 'gemini'}
                        onChange={(e) => {
                          if (!primaryLlmNode) return;
                          const nextProvider = e.target.value as ModelProvider;
                          const defaultModelByProvider: Record<ModelProvider, string> = {
                            gemini: 'gemini-3.8-flash',
                            openai: 'gpt-4o-mini',
                            anthropic: 'claude-3-7-sonnet',
                            mistral: 'mistral-large-latest',
                            ollama: 'llama3.2:latest',
                          };
                          handleUpdateNodeById(primaryLlmNode.id, {
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
                      <label htmlFor="llm-model-input" className="mb-1.5 block font-semibold">
                        Model Name
                      </label>
                      <input
                        id="llm-model-input"
                        type="text"
                        value={primaryLlmNode?.config.modelName || 'gemini-3.8-flash'}
                        onChange={(e) => {
                          if (!primaryLlmNode) return;
                          handleUpdateNodeById(primaryLlmNode.id, { modelName: e.target.value });
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 font-mono text-xs ${
                          isDark
                            ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="system-prompt-textarea" className="font-semibold">
                        System Instructions (How your assistant behaves)
                      </label>
                      <span className="font-mono text-[11px] opacity-65">
                        Temp: {primaryLlmNode?.config.temperature ?? 0.2}
                      </span>
                    </div>
                    <textarea
                      id="system-prompt-textarea"
                      rows={6}
                      value={
                        primaryLlmNode?.config.systemPrompt ||
                        'You are a helpful AI assistant. Answer questions accurately using the uploaded workspace documents and cite every source filename.'
                      }
                      onChange={(e) => {
                        if (!primaryLlmNode) return;
                        handleUpdateNodeById(primaryLlmNode.id, {
                          systemPrompt: e.target.value,
                        });
                      }}
                      placeholder="Describe your assistant's role, tone, and rules..."
                      className={`w-full rounded-xl border p-3.5 text-xs leading-relaxed ${
                        isDark
                          ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">Response Creativity (Temperature)</span>
                      <span className="font-mono font-bold text-[#D9A441]">
                        {primaryLlmNode?.config.temperature ?? 0.2}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={primaryLlmNode?.config.temperature ?? 0.2}
                      onChange={(e) => {
                        if (!primaryLlmNode) return;
                        handleUpdateNodeById(primaryLlmNode.id, {
                          temperature: parseFloat(e.target.value),
                        });
                      }}
                      className="w-full accent-[#D9A441]"
                    />
                    <div className="flex justify-between text-[11px] opacity-60">
                      <span>0.0 (Strict &amp; Factual)</span>
                      <span>1.0 (Creative)</span>
                    </div>
                  </div>

                  {primaryRagNode && (
                    <div
                      className={`flex items-center justify-between rounded-xl border p-3.5 ${
                        isDark ? 'border-white/10 bg-[#0F1226]/60' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">Require Document Citations</div>
                        <div className="text-[11px] opacity-75">
                          Grounds answers in your uploaded files ({primaryRagNode.config.topK ?? 3}{' '}
                          passages retrieved per query)
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(primaryRagNode.config.citationRequired)}
                        onChange={(e) =>
                          handleUpdateNodeById(primaryRagNode.id, {
                            citationRequired: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#2E8B57]"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setSetupTab('rag')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-current/15 px-3.5 py-2 text-xs font-semibold hover:bg-current/5"
                    >
                      <Database className="h-3.5 w-3.5 text-[#D9A441]" />
                      <span>Next: Knowledge Files ({ragChunks.length})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleRunWorkflow}
                      disabled={isRunning}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#D9A441] px-4 py-2 text-xs font-bold text-[#0F1226] shadow-sm hover:opacity-95 disabled:opacity-50"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{isRunning ? 'Running…' : 'Test Now'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Knowledge Files (RAG) */}
              {setupTab === 'rag' && (
                <div className="space-y-4 text-xs">
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
                    className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                      isDraggingFile
                        ? 'border-[#D9A441] bg-[#D9A441]/15'
                        : isDark
                          ? 'border-white/20 bg-[#0F1226]/70 hover:border-[#D9A441]/60'
                          : 'border-[#0F1226]/20 bg-[#FAF6EC] hover:border-[#3B3FA8]/60'
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
                    <FileUp className="mx-auto h-7 w-7 text-[#D9A441]" />
                    <div className="mt-2 text-sm font-bold">
                      Upload PDF, Word (.docx), Markdown, or Text
                    </div>
                    <p className="mt-1 text-xs opacity-75">
                      Your assistant automatically searches these files to answer questions with citations.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#D9A441] px-4 py-2 text-xs font-bold text-[#0F1226] shadow-sm hover:opacity-95"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Select File from Computer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTextPasteForm((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-current/20 px-3 py-2 text-xs font-semibold hover:bg-current/5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{showTextPasteForm ? 'Hide Text Form' : 'Paste Text Note'}</span>
                      </button>
                    </div>
                  </div>

                  {uploadMessage && (
                    <div className="rounded-xl border border-[#2E8B57]/40 bg-[#2E8B57]/10 p-3 text-xs font-medium">
                      {uploadMessage}
                    </div>
                  )}

                  {showTextPasteForm && (
                    <form
                      onSubmit={handleUploadRagDoc}
                      className={`space-y-3 rounded-xl border p-4 ${
                        isDark ? 'border-white/10 bg-[#0F1226]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                      }`}
                    >
                      <div className="font-semibold">Paste Policy, FAQ, or Price List</div>
                      <div>
                        <label htmlFor="rag-doc-filename" className="mb-1 block opacity-75">
                          Document Title / Filename
                        </label>
                        <input
                          id="rag-doc-filename"
                          type="text"
                          value={uploadFilename}
                          onChange={(e) => setUploadFilename(e.target.value)}
                          className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#1B1F5E]/50 text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                          }`}
                        />
                      </div>
                      <div>
                        <label htmlFor="rag-doc-content" className="mb-1 block opacity-75">
                          Document Content
                        </label>
                        <textarea
                          id="rag-doc-content"
                          rows={4}
                          value={uploadContent}
                          onChange={(e) => setUploadContent(e.target.value)}
                          className={`w-full rounded-lg border p-2.5 text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#1B1F5E]/50 text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                          }`}
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B3FA8] px-4 py-2 text-xs font-semibold text-[#FAF6EC]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Save to Knowledge Base</span>
                      </button>
                    </form>
                  )}

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold">
                        Indexed Workspace Knowledge ({ragChunks.length} passages)
                      </span>
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {ragChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className={`rounded-xl border p-3 ${
                            isDark
                              ? 'border-white/10 bg-[#0F1226]/80'
                              : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-xs font-semibold text-[#2E8B57]">
                              {chunk.sourceName}
                            </span>
                            <span className="shrink-0 rounded bg-current/10 px-1.5 py-0.5 font-mono text-[10px] opacity-75">
                              Chunk #{chunk.chunkIndex + 1}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed opacity-80">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Pipeline Steps & Agent Tools */}
              {setupTab === 'pipeline' && (
                <div className="space-y-5 text-xs">
                  <div>
                    <div className="mb-2 font-semibold">
                      Enabled Agent Tools (Click to toggle capabilities)
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {ALL_TOOLS.map((tool) => {
                        const checked = workflow.allowedTools.includes(tool.id);
                        return (
                          <label
                            key={tool.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                              checked
                                ? 'border-[#2E8B57] bg-[#2E8B57]/10'
                                : isDark
                                  ? 'border-white/10 bg-[#0F1226]/60 opacity-75'
                                  : 'border-[#0F1226]/10 bg-[#FAF6EC]/60 opacity-75'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleAllowedTool(tool.id)}
                              className="mt-0.5 h-4 w-4 accent-[#2E8B57]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold">{tool.label}</div>
                              <div className="text-[11px] opacity-75">{tool.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-current/10 pt-4">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="font-semibold">
                        Workflow Pipeline Steps ({workflow.nodes.length})
                      </span>
                      <span className="text-[11px] opacity-70">Click a step to configure</span>
                    </div>

                    <div className="space-y-2.5">
                      {workflow.nodes.map((node, index) => {
                        const isSelected = node.id === selectedNode?.id;
                        return (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                              isSelected
                                ? 'border-[#D9A441] ring-1 ring-[#D9A441]'
                                : isDark
                                  ? 'border-white/10 bg-[#0F1226]/80 hover:border-white/25'
                                  : 'border-[#0F1226]/10 bg-[#FAF6EC]/70 hover:border-[#0F1226]/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3B3FA8]/15 font-mono text-[11px] font-bold text-[#3B3FA8] dark:bg-[#D9A441]/20 dark:text-[#D9A441]">
                                  {index + 1}
                                </span>
                                {getNodeIcon(node.kind)}
                                <div>
                                  <div className="font-semibold">{node.title}</div>
                                  <div className="text-[11px] opacity-70">{node.subtitle}</div>
                                </div>
                              </div>

                              {workflow.nodes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveNode(node.id);
                                  }}
                                  title="Remove step"
                                  className="rounded-lg p-1.5 opacity-60 hover:bg-[#C84B31]/15 hover:text-[#C84B31] hover:opacity-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Inline configuration when an Agent Tool step is selected */}
                            {isSelected && node.kind === 'agent_tool' && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="mt-3 space-y-2.5 border-t border-current/10 pt-3"
                              >
                                <div>
                                  <label className="mb-1 block font-medium">Active Tool</label>
                                  <select
                                    value={node.config.toolId || 'calculator'}
                                    onChange={(e) =>
                                      handleUpdateSelectedNodeConfig({
                                        toolId: e.target.value as AllowedToolId,
                                      })
                                    }
                                    className={`w-full rounded-lg border px-2.5 py-2 text-xs ${
                                      isDark
                                        ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                                        : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                                    }`}
                                  >
                                    {ALL_TOOLS.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {node.config.toolId === 'http_request' && (
                                  <div>
                                    <label className="mb-1 block font-medium">
                                      External Webhook / API Endpoint URL
                                    </label>
                                    <input
                                      type="text"
                                      value={
                                        node.config.toolEndpoint || 'https://api.paystack.co/'
                                      }
                                      onChange={(e) =>
                                        handleUpdateSelectedNodeConfig({
                                          toolEndpoint: e.target.value,
                                        })
                                      }
                                      placeholder="https://api.example.com/v1/data"
                                      className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs ${
                                        isDark
                                          ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                                          : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                                      }`}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3">
                      <div className="mb-1.5 text-[11px] font-semibold opacity-75">
                        Add a Step to Pipeline:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {NODE_PALETTE.map((item) => (
                          <button
                            key={item.kind}
                            type="button"
                            onClick={() => handleAddNode(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-current/15 px-2.5 py-1.5 text-[11px] font-semibold hover:border-[#D9A441] hover:bg-[#D9A441]/10"
                          >
                            <Plus className="h-3 w-3 text-[#D9A441]" />
                            <span>{item.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: 2. Live Test Playground & Cited Output (7 cols on desktop) */}
          <div className="flex flex-col gap-5 lg:col-span-7">
            {/* Live Interactive Pipeline Bar */}
            <div
              className={`rounded-2xl border p-4 shadow-sm ${
                isDark ? 'border-white/10 bg-[#141742]/70' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#D9A441]" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Live Execution Pipeline
                  </span>
                </div>
                <span className="font-mono text-[11px] opacity-70">
                  {isRunning
                    ? 'Running workflow steps…'
                    : `${workflow.nodes.length} steps active · Click any step to edit`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {workflow.nodes.map((node, index) => {
                  const isExecuting = executingNodeId === node.id;
                  const isDone = completedNodeIds.includes(node.id);
                  const isSelected = selectedNode?.id === node.id;
                  const nextEdge =
                    workflow.edges.find((e) => e.source === node.id) || workflow.edges[index];
                  const isEdgeActive = Boolean(nextEdge && activeEdgeId === nextEdge.id);

                  return (
                    <React.Fragment key={node.id}>
                      <motion.button
                        type="button"
                        layout
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          if (node.kind === 'rag_retriever') setSetupTab('rag');
                          else if (node.kind === 'llm_generator') setSetupTab('prompt');
                          else setSetupTab('pipeline');
                        }}
                        animate={{
                          scale: isExecuting ? 1.04 : 1,
                        }}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                          isExecuting
                            ? 'border-[#2E8B57] bg-[#2E8B57]/20 font-bold ring-2 ring-[#2E8B57]/40'
                            : isDone
                              ? 'border-[#2E8B57]/60 bg-[#2E8B57]/10'
                              : isSelected
                                ? 'border-[#D9A441] bg-[#D9A441]/15 font-semibold'
                                : isDark
                                  ? 'border-white/10 bg-[#0F1226] hover:border-white/25'
                                  : 'border-[#0F1226]/10 bg-[#FAF6EC] hover:border-[#0F1226]/25'
                        }`}
                      >
                        {getNodeIcon(node.kind)}
                        <span className="font-medium">{node.title}</span>
                        {isExecuting && (
                          <span className="ml-1 inline-flex h-2 w-2 animate-ping rounded-full bg-[#2E8B57]" />
                        )}
                        {!isExecuting && isDone && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#2E8B57]" />
                        )}
                      </motion.button>

                      {index < workflow.nodes.length - 1 && (
                        <div className="flex items-center">
                          <motion.div
                            animate={{
                              scale: isEdgeActive ? 1.25 : 1,
                              color: isEdgeActive ? '#D9A441' : undefined,
                            }}
                            className="opacity-50"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </motion.div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Live Test Playground Card */}
            <div
              className={`flex flex-1 flex-col rounded-2xl border p-5 shadow-sm ${
                isDark ? 'border-white/10 bg-[#141742]/70' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#2E8B57]">
                    Step 2 · Live Playground
                  </span>
                  <h2 className="font-display text-lg font-bold">
                    Test Your Assistant &amp; Verify Citations
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
                      Cited Answer ({runResult.citations.length})
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

              {/* Quick Sample Prompts */}
              <div className="mb-3">
                <div className="mb-1.5 text-xs font-medium opacity-75">
                  Try a sample question or type your own below:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SAMPLE_PROMPTS.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTestPrompt(sample)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
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

              {/* Question Input + Run Button */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="studio-test-prompt" className="sr-only">
                  Ask your assistant a question
                </label>
                <textarea
                  id="studio-test-prompt"
                  rows={3}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Ask a question to test your assistant..."
                  className={`w-full flex-1 rounded-xl border p-3.5 text-sm leading-relaxed ${
                    isDark
                      ? 'border-white/15 bg-[#0F1226] text-[#FAF6EC]'
                      : 'border-[#0F1226]/15 bg-[#FAF6EC]/60 text-[#0F1226]'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleRunWorkflow}
                  disabled={isRunning || !testPrompt.trim()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-6 py-3.5 text-sm font-bold text-[#0F1226] shadow-md transition-opacity hover:opacity-95 disabled:opacity-50 sm:self-end"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{isRunning ? 'Running…' : 'Run Assistant'}</span>
                </button>
              </div>

              {/* Error Banner */}
              {runError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#C84B31] bg-[#C84B31]/10 p-4 text-xs text-[#C84B31]"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-bold">Execution Blocked by Security Guardrail</div>
                    <p className="mt-0.5">{runError}</p>
                  </div>
                </div>
              )}

              {/* Output Area */}
              <div className="mt-5 flex-1">
                {!runResult && !runError && (
                  <div
                    className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center ${
                      isDark ? 'border-white/10 bg-[#0F1226]/40' : 'border-[#0F1226]/15 bg-[#FAF6EC]/50'
                    }`}
                  >
                    <Sparkles className="h-8 w-8 text-[#D9A441]" />
                    <div className="mt-2 font-display text-base font-bold">
                      Ready to Run Your Assistant
                    </div>
                    <p className="mt-1 max-w-md text-xs leading-relaxed opacity-75">
                      Click <strong>Run Assistant</strong> above to test how your assistant answers
                      questions using your system instructions and uploaded knowledge files.
                    </p>
                  </div>
                )}

                {runResult && outputTab === 'answer' && (
                  <div className="space-y-4">
                    <div
                      className={`rounded-2xl border p-5 ${
                        isDark ? 'border-white/15 bg-[#0F1226]' : 'border-[#0F1226]/15 bg-[#FAF6EC]/70'
                      }`}
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-[#2E8B57]" />
                          <span className="font-bold text-[#2E8B57]">Assistant Response</span>
                        </div>
                        <span className="font-mono text-[11px] opacity-75">
                          Model: {runResult.modelUsed} · {runResult.durationMs}ms
                        </span>
                      </div>

                      <p className="whitespace-pre-line text-sm leading-relaxed">
                        {runResult.answer}
                      </p>
                    </div>

                    {/* Citations List */}
                    {runResult.citations.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider opacity-75">
                          Verified Source Citations ({runResult.citations.length})
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {runResult.citations.map((cit) => (
                            <div
                              key={cit.documentId}
                              className={`rounded-xl border p-3 text-xs ${
                                isDark
                                  ? 'border-white/10 bg-[#0F1226]/80'
                                  : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-mono font-semibold text-[#2E8B57]">
                                  [{cit.sourceName}]
                                </span>
                                {typeof cit.similarityScore === 'number' && (
                                  <span className="rounded bg-[#2E8B57]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#2E8B57]">
                                    {Math.round(cit.similarityScore * 100)}% match
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed opacity-80">
                                “{cit.excerpt}”
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {runResult && outputTab === 'trace' && (
                  <div className="space-y-2">
                    {runResult.traceSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-xs ${
                          isDark ? 'border-white/10 bg-[#0F1226]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{step.node}</div>
                          <div className="mt-0.5 text-[11px] opacity-80">{step.detail}</div>
                        </div>
                        <span className="rounded bg-[#2E8B57]/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#2E8B57]">
                          {step.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
