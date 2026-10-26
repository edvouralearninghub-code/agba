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
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
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
  { id: 'document_retrieval', label: 'Document Retrieval', description: 'Searches your private workspace knowledge base' },
  { id: 'calculator', label: 'Calculator', description: 'Accurate currency, margin, and unit economics math' },
  { id: 'http_request', label: 'Web API Request', description: 'Connects safely to external public web endpoints' },
  { id: 'web_search', label: 'Web Search', description: 'Finds live information from the web' },
  { id: 'send_email_novu', label: 'Send Notification Email', description: 'Sends automated email and in-app alerts' },
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
    workflow.nodes[2]?.id || workflow.nodes[0]?.id || ''
  );
  const [leftTab, setLeftTab] = useState<'nodes' | 'rag' | 'tools'>('nodes');
  const [showLeftDock, setShowLeftDock] = useState<boolean>(true);
  const [showRightDock, setShowRightDock] = useState<boolean>(true);
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Publish modal / panel state
  const [showPublishPanel, setShowPublishPanel] = useState<boolean>(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState<boolean>(false);

  // Mobile pane switcher (360px support)
  const [mobilePane, setMobilePane] = useState<'palette' | 'canvas' | 'inspector'>('canvas');

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
    setShowRightDock(true);
    setMobilePane('inspector');
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
    const updatedNodes = workflow.nodes.map((node) =>
      node.id === selectedNode.id
        ? { ...node, config: { ...node.config, ...patch } }
        : node
    );
    onUpdateWorkflow({
      ...workflow,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString(),
    });
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
    setUploadMessage(`Parsing "${file.name}" (${file.size.toLocaleString()} bytes) on backend…`);
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
        `Parsed & Indexed ${data.chunksCreated} chunk(s) from "${file.name}" as ${data.storageKey}.`
      );
      fetchWorkspaceChunks();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Binary upload failed');
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
      setUploadMessage(`Indexed as ${data.storageKey} in workspace "${activeWorkspace.id}".`);
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
      await new Promise((r) => setTimeout(r, 260));
      setCompletedNodeIds((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));

      const outgoingEdge =
        workflow.edges.find((e) => e.source === node.id) || workflow.edges[i];
      if (outgoingEdge && i < workflow.nodes.length - 1) {
        setExecutingNodeId(null);
        setActiveEdgeId(outgoingEdge.id);
        await new Promise((r) => setTimeout(r, 180));
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
      {/* Studio Sub-Toolbar with Quick Template Switcher & Dock Toggles */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowLeftDock((v) => !v)}
            title={showLeftDock ? 'Hide Left Dock (Expand Canvas)' : 'Show Left Dock'}
            className="hidden lg:inline-flex items-center justify-center rounded-lg border border-current/15 p-1.5 opacity-80 hover:bg-current/5 hover:opacity-100"
          >
            {showLeftDock ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4 text-[#D9A441]" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] opacity-75">
              <span>{activeWorkspace.name}</span>
              <span aria-hidden="true">·</span>
              <span>{workflow.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{workflow.nodes.length} steps</span>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-display truncate text-base font-semibold sm:text-lg">
                {workflow.name}
              </h2>
              {onSelectTemplate && (
                <select
                  aria-label="Quick switch Academy workflow template"
                  value=""
                  onChange={(e) => {
                    const found = ACADEMY_TEMPLATES.find((t) => t.id === e.target.value);
                    if (found) onSelectTemplate(found);
                  }}
                  className={`hidden xl:inline-block max-w-[180px] rounded-md border px-2 py-1 text-[11px] font-medium ${
                    isDark
                      ? 'border-white/15 bg-[#1B1F5E]/60 text-[#FAF6EC]'
                      : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                  }`}
                >
                  <option value="" disabled>
                    Switch Template ({ACADEMY_TEMPLATES.length})…
                  </option>
                  {ACADEMY_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenPublicChat}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isDark
                ? 'border-[#D9A441]/60 text-[#D9A441] hover:bg-[#D9A441]/10'
                : 'border-[#3B3FA8] text-[#3B3FA8] hover:bg-[#3B3FA8]/5'
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Public Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPublishPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isDark
                ? 'border-white/20 text-[#FAF6EC] hover:bg-white/5'
                : 'border-[#0F1226]/20 text-[#0F1226] hover:bg-[#0F1226]/5'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Publish &amp; API</span>
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunWorkflow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3.5 py-1.5 text-xs font-semibold text-[#0F1226] transition-colors duration-150 hover:bg-[#c89332] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isRunning ? 'Running…' : 'Run Workflow'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRightDock((v) => !v)}
            title={showRightDock ? 'Hide Inspector (Expand Canvas)' : 'Show Inspector'}
            className="hidden lg:inline-flex items-center justify-center rounded-lg border border-current/15 p-1.5 opacity-80 hover:bg-current/5 hover:opacity-100"
          >
            {showRightDock ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4 text-[#D9A441]" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive 3-Step User Action Bar (So any user immediately knows what to do) */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-1.5 text-[11px] ${
          isDark
            ? 'border-white/10 bg-[#1B1F5E]/35 text-[#FAF6EC]'
            : 'border-[#0F1226]/10 bg-[#3B3FA8]/5 text-[#0F1226]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
            Quick Start Guide:
          </span>
          <button
            type="button"
            onClick={() => {
              setShowLeftDock(true);
              setLeftTab('rag');
              setMobilePane('palette');
            }}
            className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            <span>1. Upload PDF / DOCX ({ragChunks.length} chunks)</span>
          </button>
          <span aria-hidden="true" className="opacity-40">
            →
          </span>
          <button
            type="button"
            onClick={handleRunWorkflow}
            className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            <span>2. Type Question &amp; Click &ldquo;Run Workflow&rdquo;</span>
          </button>
          <span aria-hidden="true" className="opacity-40">
            →
          </span>
          <button
            type="button"
            onClick={() => setShowPublishPanel((p) => !p)}
            className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            <span>3. Click &ldquo;Publish &amp; API&rdquo; to Share</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenPublicChat}
          className="font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
        >
          Open Live Chat View →
        </button>
      </div>

      {/* Publish Shareable Chat Page & REST Endpoint Drawer */}
      <AnimatePresence>
        {showPublishPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`overflow-hidden border-b px-4 py-3 ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/60' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold">
                  03. Ship — Live Deployment Endpoints ({activeWorkspace.name})
                </p>
                <p className="opacity-75">
                  Shareable Chat: <span className="font-mono">{shareableUrl}</span>
                </p>
                <p className="opacity-75">
                  REST Webhook: <span className="font-mono">{restEndpointUrl}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenPublicChat}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3 py-1.5 text-xs font-semibold text-[#0F1226] whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Standalone Chat &amp; Embed Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(restEndpointUrl);
                    setCopiedEndpoint(true);
                    setTimeout(() => setCopiedEndpoint(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0"
                >
                  {copiedEndpoint ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedEndpoint ? 'Copied REST URL' : 'Copy REST URL'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile 360px Pane Switcher */}
      <div
        className={`flex border-b lg:hidden ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        {(['palette', 'canvas', 'inspector'] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            onClick={() => setMobilePane(pane)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              mobilePane === pane
                ? 'border-b-2 border-[#D9A441] font-semibold'
                : 'opacity-65'
            }`}
          >
            {pane === 'palette' ? '1. Nodes & Files' : pane === 'canvas' ? '2. Playground' : '3. Inspector'}
          </button>
        ))}
      </div>

      {/* Main Three-Pane Studio Playground (No Ugly Scrollbars!) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT DOCK: Tabbed Palette (Nodes | Knowledge RAG | Tools) — Fits Without Scrollbar */}
        {(showLeftDock || mobilePane === 'palette') && (
          <aside
            aria-label="Studio Node Palette and RAG Documents"
            className={`${
              mobilePane === 'palette' ? 'flex w-full' : 'hidden'
            } lg:flex lg:w-[260px] shrink-0 flex-col border-r ${
              isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
            }`}
          >
            {/* Segmented Tab Switcher (Prevents Vertical Overflow) */}
            <div className="grid grid-cols-3 gap-1 border-b border-current/10 p-2">
              {(
                [
                  { id: 'nodes', label: '+ Nodes' },
                  { id: 'rag', label: `Files (${ragChunks.length})` },
                  { id: 'tools', label: `Tools (${workflow.allowedTools.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLeftTab(tab.id)}
                  className={`rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                    leftTab === tab.id
                      ? 'bg-[#D9A441] text-[#0F1226]'
                      : 'opacity-75 hover:bg-current/5 hover:opacity-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto p-3">
              {leftTab === 'nodes' && (
                <div>
                  <p className="mb-2.5 text-[11px] opacity-75">
                    Click any building block to append it to your workflow canvas:
                  </p>
                  <div className="space-y-2">
                    {NODE_PALETTE.map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        onClick={() => handleAddNode(item)}
                        className={`flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150 ${
                          isDark
                            ? 'border-white/10 bg-[#1B1F5E]/40 hover:border-[#D9A441]/60'
                            : 'border-[#0F1226]/10 bg-white hover:border-[#3B3FA8]'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">{getNodeIcon(item.kind)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs font-semibold">{item.title}</span>
                            <Plus className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug opacity-70">
                            {item.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {leftTab === 'rag' && (
                <div>
                  <p className="mb-2 text-[11px] opacity-75">
                    Upload <span className="font-mono">.pdf, .docx, .txt, .md</span> (max 10MB) to{' '}
                    {activeWorkspace.name}:
                  </p>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) {
                        handleBinaryFileUpload(dropped);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`mb-2.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center transition-colors ${
                      isDraggingFile
                        ? 'border-[#D9A441] bg-[#D9A441]/10'
                        : isDark
                          ? 'border-white/20 bg-[#1B1F5E]/25 hover:border-[#D9A441]/60'
                          : 'border-[#0F1226]/25 bg-white hover:border-[#3B3FA8]'
                    }`}
                  >
                    <FileUp className="h-4 w-4 text-[#D9A441]" />
                    <span className="mt-1 text-xs font-semibold">
                      Drop .PDF, .DOCX, .TXT, or .MD
                    </span>
                    <span className="text-[10px] opacity-70">
                      Indexed into pgvector with workspace RLS
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleBinaryFileUpload(f);
                      }}
                      className="hidden"
                    />
                  </div>

                  <form onSubmit={handleUploadRagDoc} className="space-y-2">
                    <input
                      type="text"
                      value={uploadFilename}
                      onChange={(e) => setUploadFilename(e.target.value)}
                      aria-label="Document filename"
                      placeholder="Filename (e.g. policy.pdf)"
                      className={`w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs ${
                        isDark
                          ? 'border-white/15 bg-[#1B1F5E]/40 text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                      }`}
                    />
                    <textarea
                      rows={2}
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      aria-label="Document text content to chunk and embed"
                      placeholder="Or paste text to chunk & embed..."
                      className={`w-full rounded-lg border p-2 text-xs ${
                        isDark
                          ? 'border-white/15 bg-[#1B1F5E]/40 text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                      }`}
                    />
                    <button
                      type="submit"
                      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isDark
                          ? 'border-[#D9A441]/50 text-[#D9A441] hover:bg-[#D9A441]/10'
                          : 'border-[#3B3FA8] text-[#3B3FA8] hover:bg-[#3B3FA8]/5'
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Index Text Snippet</span>
                    </button>
                  </form>

                  {uploadMessage && (
                    <p className="mt-2 font-mono text-[11px] text-[#2E8B57] dark:text-[#D9A441]">
                      {uploadMessage}
                    </p>
                  )}

                  <div className="mt-3 space-y-1.5">
                    {ragChunks.slice(0, 4).map((c) => (
                      <div
                        key={c.id}
                        className={`rounded-lg border p-2 text-[11px] ${
                          isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
                        }`}
                      >
                        <div className="font-mono font-semibold truncate">{c.sourceName}</div>
                        <div className="mt-0.5 line-clamp-2 opacity-75">{c.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {leftTab === 'tools' && (
                <div>
                  <p className="mb-2.5 text-[11px] opacity-75">
                    Select which safe tools this workflow is permitted to invoke:
                  </p>
                  <div className="space-y-1.5">
                    {ALL_TOOLS.map((tool) => {
                      const checked = workflow.allowedTools.includes(tool.id);
                      return (
                        <label
                          key={tool.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-xs transition-colors ${
                            checked
                              ? isDark
                                ? 'border-[#D9A441]/50 bg-[#1B1F5E]/50'
                                : 'border-[#3B3FA8]/50 bg-white'
                              : 'border-current/10 hover:bg-current/5'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleAllowedTool(tool.id)}
                            className="mt-0.5 accent-[#3B3FA8]"
                          />
                          <div>
                            <div className="font-semibold">{tool.label}</div>
                            <div className="text-[11px] opacity-70">{tool.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* CENTER PANE: Spacious Auto-Fitting Playground Canvas (ZERO Horizontal Scrollbars!) */}
        <main
          aria-label="Visual Workflow Canvas"
          className={`${
            mobilePane === 'canvas' ? 'flex' : 'hidden'
          } lg:flex min-w-0 flex-1 flex-col justify-between overflow-hidden p-3 sm:p-4 ${
            isDark ? 'bg-[#0E1030]' : 'bg-[#FAF6EC]'
          }`}
        >
          {/* Top Guided 3-Step Strip (Learn -> Build -> Ship) */}
          <div
            className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/35' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>How to Work in Studio:</span>
              </span>
              <span className="opacity-85">
                <strong>01 Learn:</strong> Pick a template above
              </span>
              <ArrowRight className="hidden sm:inline h-3 w-3 opacity-50" />
              <span className="opacity-85">
                <strong>02 Build:</strong> Click any node card to customize
              </span>
              <ArrowRight className="hidden sm:inline h-3 w-3 opacity-50" />
              <span className="opacity-85">
                <strong>03 Ship:</strong> Run below or click Publish &amp; API
              </span>
            </div>
          </div>

          {/* Auto-Fitting Multi-Column Canvas Grid (Fits 3, 4, or 5+ Nodes Without Horizontal Overflow!) */}
          <div
            className={`no-scrollbar relative min-h-0 flex-1 overflow-y-auto rounded-2xl border p-4 sm:p-5 ${
              isDark
                ? 'border-white/10 bg-[#1B1F5E]/25'
                : 'border-[#0F1226]/10 bg-white/80'
            }`}
            style={{
              backgroundImage: isDark
                ? 'radial-gradient(rgba(250, 246, 236, 0.07) 1px, transparent 1px)'
                : 'radial-gradient(rgba(15, 18, 38, 0.07) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs opacity-75">
                <span className="font-semibold">Visual Pipeline Graph</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{workflow.nodes.length} nodes</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{workflow.edges.length} connections</span>
                {isRunning && (
                  <>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-[#D9A441]">
                      Executing Signal Flow…
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] opacity-75">
                Click any node card to edit its model, prompt, or tool on the right
              </div>
            </div>

            {/* Cinematic Framer Motion Signal & Edge Conduit Visualizer */}
            <div
              className={`mb-3.5 rounded-xl border px-3 py-2.5 ${
                isDark ? 'border-white/10 bg-[#0E1030]/80' : 'border-[#0F1226]/10 bg-[#FAF6EC]/90'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {workflow.nodes.map((node, idx) => {
                  const isExec = executingNodeId === node.id;
                  const isDone = completedNodeIds.includes(node.id);
                  const outgoingEdge =
                    workflow.edges.find((e) => e.source === node.id) || workflow.edges[idx];
                  const isEdgeActive = Boolean(
                    outgoingEdge &&
                      (activeEdgeId === outgoingEdge.id ||
                        (isDone &&
                          idx < workflow.nodes.length - 1 &&
                          (executingNodeId === workflow.nodes[idx + 1]?.id ||
                            completedNodeIds.includes(workflow.nodes[idx + 1]?.id))))
                  );

                  return (
                    <React.Fragment key={`signal_${node.id}`}>
                      <motion.button
                        type="button"
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          setShowRightDock(true);
                        }}
                        animate={{
                          scale: isExec ? 1.07 : 1,
                          y: isExec ? -1.5 : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          isExec
                            ? 'border-[#D9A441] bg-[#D9A441] text-[#0F1226] font-semibold shadow-sm'
                            : isDone
                              ? isDark
                                ? 'border-[#2E8B57]/60 bg-[#2E8B57]/15 text-[#FAF6EC]'
                                : 'border-[#2E8B57]/50 bg-[#2E8B57]/10 text-[#0F1226]'
                              : isDark
                                ? 'border-white/15 bg-[#1B1F5E]/50 text-[#FAF6EC]/80'
                                : 'border-[#0F1226]/15 bg-white text-[#0F1226]/80'
                        }`}
                      >
                        <span className="font-mono text-[10px]">0{idx + 1}</span>
                        <span className="max-w-[115px] truncate">{node.title}</span>
                        {isDone && !isExec && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-[#2E8B57] dark:text-[#D9A441]"
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.button>

                      {idx < workflow.nodes.length - 1 && (
                        <div className="relative flex min-w-[34px] flex-1 items-center justify-center">
                          <svg
                            viewBox="0 0 80 18"
                            className="h-4 w-full overflow-visible"
                            aria-hidden="true"
                          >
                            <line
                              x1="2"
                              y1="9"
                              x2="78"
                              y2="9"
                              stroke="currentColor"
                              strokeOpacity={0.2}
                              strokeWidth="2"
                              strokeDasharray="4 4"
                            />
                            <motion.line
                              x1="2"
                              y1="9"
                              x2="78"
                              y2="9"
                              stroke="#D9A441"
                              strokeWidth="2.5"
                              initial={{ pathLength: 0, opacity: 0.35 }}
                              animate={{
                                pathLength: isEdgeActive ? 1 : isRunning ? 0.45 : 0.15,
                                opacity: isEdgeActive ? 1 : 0.4,
                              }}
                              transition={{ duration: 0.28, ease: 'easeInOut' }}
                            />
                            {outgoingEdge && activeEdgeId === outgoingEdge.id && (
                              <motion.circle
                                r="4"
                                cy="9"
                                fill="#D9A441"
                                initial={{ cx: 4, opacity: 0.9 }}
                                animate={{ cx: 76, opacity: 1 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                              />
                            )}
                          </svg>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {workflow.nodes.map((node, index) => {
                const isSelected = selectedNode?.id === node.id;
                const isExecuting = executingNodeId === node.id;
                const isCompleted = completedNodeIds.includes(node.id);
                const nextNode = workflow.nodes[index + 1];
                const outgoingEdge =
                  workflow.edges.find((e) => e.source === node.id) || workflow.edges[index];
                const isOutgoingEdgeFiring =
                  Boolean(outgoingEdge && activeEdgeId === outgoingEdge.id);

                return (
                  <motion.div
                    key={node.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{
                      opacity: 1,
                      y: isExecuting ? -3 : 0,
                      scale: isExecuting ? 1.02 : 1,
                    }}
                    whileHover={{ y: -2 }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 24,
                      delay: index * 0.03,
                    }}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setShowRightDock(true);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedNodeId(node.id);
                        setShowRightDock(true);
                      }
                    }}
                    aria-label={`Inspect node ${node.title}`}
                    className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-3.5 text-left transition-colors duration-150 ${
                      isExecuting ? 'agba-node-executing' : ''
                    } ${
                      isSelected
                        ? isDark
                          ? 'border-[#D9A441] bg-[#1B1F5E] shadow-md'
                          : 'border-[#3B3FA8] bg-white shadow-md'
                        : isCompleted
                          ? isDark
                            ? 'border-[#2E8B57]/55 bg-[#1B1F5E]/75'
                            : 'border-[#2E8B57]/45 bg-white'
                          : isDark
                            ? 'border-white/15 bg-[#1B1F5E]/60 hover:border-white/35'
                            : 'border-[#0F1226]/15 bg-white hover:border-[#0F1226]/35'
                    }`}
                  >
                    {/* Animated Framer Motion Top Execution Sweeping Beam */}
                    <AnimatePresence>
                      {(isExecuting || isOutgoingEdgeFiring) && (
                        <motion.div
                          initial={{ x: '-100%', opacity: 0.9 }}
                          animate={{ x: '100%', opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.55,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          className="pointer-events-none absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-[#D9A441] to-transparent"
                        />
                      )}
                    </AnimatePresence>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          {getNodeIcon(node.kind)}
                          <span className="font-mono">STEP 0{index + 1}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isExecuting ? (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="font-mono text-[10px] font-semibold text-[#D9A441]"
                            >
                              LIVE FLOW
                            </motion.span>
                          ) : isCompleted ? (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="font-mono text-[10px] font-semibold text-[#2E8B57] dark:text-[#D9A441]"
                            >
                              VERIFIED ✓
                            </motion.span>
                          ) : (
                            <span className="font-mono text-[10px] opacity-65">
                              {node.kind.replace('_', ' ')}
                            </span>
                          )}
                          {index < workflow.nodes.length - 1 && (
                            <ArrowRight
                              className={`h-3.5 w-3.5 ${
                                isExecuting || isOutgoingEdgeFiring
                                  ? 'text-[#D9A441] animate-pulse'
                                  : 'opacity-45'
                              }`}
                            />
                          )}
                        </div>
                      </div>
                      <div className="font-display text-sm font-semibold leading-snug">
                        {node.title}
                      </div>
                      <p className="mt-1 text-xs leading-snug opacity-75">{node.subtitle}</p>
                    </div>

                    <div className="mt-3 space-y-1.5 border-t border-current/10 pt-2 font-mono text-[11px] opacity-85">
                      <div className="truncate">
                        {node.config.provider && (
                          <span>
                            {node.config.provider} · {node.config.modelName}
                          </span>
                        )}
                        {node.config.toolId && <span>tool: {node.config.toolId}</span>}
                        {node.config.topK && (
                          <span>topK: {node.config.topK} · citations: on</span>
                        )}
                        {!node.config.provider && !node.config.toolId && !node.config.topK && (
                          <span>Ready · connected in flow</span>
                        )}
                      </div>

                      {/* Animated Edge Connection Footer inside Node Card */}
                      {nextNode && (
                        <div className="flex items-center justify-between gap-2 text-[10px] opacity-75">
                          <span className="truncate">
                            Edge ({outgoingEdge?.label || 'flow'}) ➔ 0{index + 2} {nextNode.title}
                          </span>
                          <motion.span
                            animate={{
                              x: isOutgoingEdgeFiring || isExecuting ? [0, 4, 0] : 0,
                              opacity: isOutgoingEdgeFiring || isExecuting ? 1 : 0.55,
                            }}
                            transition={{
                              duration: 0.45,
                              repeat: isOutgoingEdgeFiring || isExecuting ? Infinity : 0,
                            }}
                            className="font-semibold text-[#D9A441]"
                          >
                            ➔
                          </motion.span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Bottom Playground Console (Compact Prompt Input + Sample Chips + Tabbed Output) */}
          <div
            className={`mt-3 rounded-2xl border p-3.5 ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="studio-test-prompt" className="text-xs font-semibold">
                Playground — Test Your Assistant (With Document Citations)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_SAMPLE_PROMPTS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTestPrompt(sample)}
                    className="rounded-md border border-current/15 px-2 py-0.5 text-[10px] font-medium opacity-75 hover:bg-current/5 hover:opacity-100"
                  >
                    Sample {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="studio-test-prompt"
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRunning) {
                    void handleRunWorkflow();
                  }
                }}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs sm:text-sm ${
                  isDark
                    ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                }`}
              />
              <button
                type="button"
                disabled={isRunning}
                onClick={handleRunWorkflow}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{isRunning ? 'Running…' : 'Send & Cite'}</span>
              </button>
            </div>

            {runError && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-[#C2413B] bg-[#C2413B]/10 p-2.5 text-xs text-[#C2413B]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{runError}</span>
              </div>
            )}

            {runResult && (
              <div className="no-scrollbar mt-3 max-h-44 overflow-y-auto border-t border-current/10 pt-2.5 text-xs">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 opacity-80">
                    <ShieldCheck className="h-4 w-4 text-[#2E8B57]" />
                    <span className="font-semibold">{runResult.modelUsed}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{runResult.durationMs} ms</span>
                  </div>
                  <div className="inline-flex rounded-lg border border-current/15 p-0.5">
                    <button
                      type="button"
                      onClick={() => setOutputTab('answer')}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        outputTab === 'answer' ? 'bg-[#D9A441] text-[#0F1226] font-semibold' : ''
                      }`}
                    >
                      Cited Answer ({runResult.citations.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutputTab('trace')}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        outputTab === 'trace' ? 'bg-[#D9A441] text-[#0F1226] font-semibold' : ''
                      }`}
                    >
                      Execution Trace ({runResult.traceSteps.length})
                    </button>
                  </div>
                </div>

                {outputTab === 'answer' ? (
                  <div className="space-y-2">
                    <div
                      className={`rounded-lg border p-2.5 leading-relaxed whitespace-pre-wrap ${
                        isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                      }`}
                    >
                      {runResult.answer}
                    </div>
                    {runResult.citations.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {runResult.citations.map((cit, i) => (
                          <div
                            key={`${cit.documentId}-${i}`}
                            className="rounded-lg border border-current/10 p-2 text-[11px]"
                          >
                            <div className="flex items-center justify-between font-mono font-semibold">
                              <span className="truncate">
                                [{i + 1}] {cit.sourceName}
                              </span>
                              {cit.similarityScore !== undefined && (
                                <span>sim: {cit.similarityScore}</span>
                              )}
                            </div>
                            <div className="mt-0.5 line-clamp-1 opacity-75">{cit.excerpt}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {runResult.traceSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border p-2 text-[11px] ${
                          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="truncate">{step.node}</span>
                          <span className="font-mono text-[#2E8B57] dark:text-[#D9A441]">
                            {step.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 opacity-75">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT DOCK: Compact Node Inspector (Fits Without Scrollbars) */}
        {(showRightDock || mobilePane === 'inspector') && (
          <aside
            aria-label="Node Inspector Panel"
            className={`${
              mobilePane === 'inspector' ? 'flex w-full' : 'hidden'
            } lg:flex lg:w-[290px] shrink-0 flex-col border-l ${
              isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-current/10 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#D9A441]" />
                <h3 className="font-display text-sm font-semibold">Node Inspector</h3>
              </div>
              {selectedNode && workflow.nodes.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveNode(selectedNode.id)}
                  title="Remove this node from workflow"
                  className="inline-flex items-center gap-1 rounded-md border border-current/15 px-2 py-1 text-[11px] opacity-75 hover:border-[#C2413B] hover:text-[#C2413B] hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto p-3.5">
              {selectedNode ? (
                <div className="space-y-3.5 text-xs">
                  <div
                    className={`rounded-xl border p-3 ${
                      isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-white'
                    }`}
                  >
                    <div className="font-mono text-[10px] opacity-65">ID: {selectedNode.id}</div>
                    <div className="mt-0.5 font-display text-sm font-semibold">
                      {selectedNode.title}
                    </div>
                    <div className="mt-0.5 text-[11px] opacity-75">{selectedNode.subtitle}</div>
                  </div>

                  {selectedNode.kind === 'llm_generator' && (
                    <>
                      <div>
                        <label className="mb-1 block font-medium">
                          BYOK Model Provider
                        </label>
                        <select
                          value={selectedNode.config.provider || 'gemini'}
                          onChange={(e) => {
                            const provider = e.target.value as ModelProvider;
                            const defaultModelMap: Record<ModelProvider, string> = {
                              gemini: 'gemini-3.8-flash',
                              openai: 'gpt-4o-mini',
                              anthropic: 'claude-sonnet-4-5',
                              mistral: 'mistral-small-latest',
                              ollama: 'ollama:llama3.2',
                            };
                            handleUpdateSelectedNodeConfig({
                              provider,
                              modelName: defaultModelMap[provider],
                            });
                          }}
                          className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                          }`}
                        >
                          <option value="gemini">Google Gemini (BYOK / Server)</option>
                          <option value="openai">OpenAI (BYOK)</option>
                          <option value="anthropic">Anthropic Claude (BYOK)</option>
                          <option value="mistral">Mistral AI (BYOK)</option>
                          <option value="ollama">Ollama Local (Llama 3.2)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block font-medium">Model Identifier</label>
                        <input
                          type="text"
                          value={selectedNode.config.modelName || 'gemini-3.8-flash'}
                          onChange={(e) =>
                            handleUpdateSelectedNodeConfig({ modelName: e.target.value })
                          }
                          className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block font-medium">
                          System Instructions (Sandboxed)
                        </label>
                        <textarea
                          rows={4}
                          value={selectedNode.config.systemPrompt || ''}
                          onChange={(e) =>
                            handleUpdateSelectedNodeConfig({ systemPrompt: e.target.value })
                          }
                          className={`w-full rounded-lg border p-2.5 text-xs leading-relaxed ${
                            isDark
                              ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                          }`}
                        />
                      </div>
                    </>
                  )}

                  {selectedNode.kind === 'rag_retriever' && (
                    <>
                      <div>
                        <label className="mb-1 block font-medium">
                          Top-K Passages (pgvector Cosine)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={selectedNode.config.topK ?? 3}
                          onChange={(e) =>
                            handleUpdateSelectedNodeConfig({ topK: Number(e.target.value) })
                          }
                          className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                          }`}
                        />
                      </div>
                      <div className="rounded-xl border border-current/15 p-3">
                        <div className="font-semibold">Workspace Isolation</div>
                        <p className="mt-1 text-[11px] opacity-75">
                          Retrieves passages strictly from {activeWorkspace.name} with PostgreSQL
                          FORCE ROW LEVEL SECURITY.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedNode.kind === 'agent_tool' && (
                    <>
                      <div>
                        <label className="mb-1 block font-medium">Select Tool Binding</label>
                        <select
                          value={selectedNode.config.toolId || 'calculator'}
                          onChange={(e) =>
                            handleUpdateSelectedNodeConfig({
                              toolId: e.target.value as AllowedToolId,
                            })
                          }
                          className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs ${
                            isDark
                              ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                              : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                          }`}
                        >
                          {ALL_TOOLS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label} ({t.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedNode.config.toolId === 'http_request' && (
                        <div>
                          <label className="mb-1 block font-medium">
                            Target Endpoint URL (SSRF Filtered)
                          </label>
                          <input
                            type="text"
                            value={selectedNode.config.toolEndpoint || 'https://api.paystack.co/'}
                            onChange={(e) =>
                              handleUpdateSelectedNodeConfig({ toolEndpoint: e.target.value })
                            }
                            placeholder="https://api.example.com/v1/data"
                            className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs ${
                              isDark
                                ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                                : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                            }`}
                          />
                          <p className="mt-1 text-[11px] opacity-70">
                            Loopback and private metadata IPs (<span className="font-mono">169.254.169.254</span>) are blocked automatically.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {(selectedNode.kind === 'input_trigger' ||
                    selectedNode.kind === 'output_response') && (
                    <div className="rounded-xl border border-current/15 p-3">
                      <div className="font-semibold">
                        {selectedNode.kind === 'input_trigger'
                          ? 'Entry Trigger Active'
                          : 'Cited Output Channel'}
                      </div>
                      <p className="mt-1 text-[11px] opacity-75">
                        {selectedNode.kind === 'input_trigger'
                          ? 'Accepts user prompts from the Studio Playground, Public Chat Page, or REST API webhook.'
                          : 'Formats the synthesized answer with verified document source citations.'}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
