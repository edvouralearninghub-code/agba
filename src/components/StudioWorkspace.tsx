import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import type {
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

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  activeWorkspace,
  workflow,
  onUpdateWorkflow,
  onOpenPublicChat,
  isDark,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    workflow.nodes[2]?.id || workflow.nodes[0]?.id || ''
  );
  const [testPrompt, setTestPrompt] = useState<string>(
    'How does AGBA protect BYOK model keys and verify Paystack webhooks for Lagos SMEs?'
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
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
    setMobilePane('inspector');
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

    for (const node of workflow.nodes) {
      setExecutingNodeId(node.id);
      await new Promise((r) => setTimeout(r, 220));
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
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsRunning(false);
      setExecutingNodeId(null);
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

  const shareableUrl = `${window.location.origin}/chat/${activeWorkspace.slug}/${workflow.id}`;
  const restEndpointUrl = `${window.location.origin}/api/v1/workspaces/${activeWorkspace.id}/apps/${workflow.id}/run`;

  return (
    <div className="flex h-full flex-col">
      {/* Studio Sub-Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs opacity-75">
            <span>Workspace: {activeWorkspace.name}</span>
            <span aria-hidden="true">·</span>
            <span>{workflow.category}</span>
          </div>
          <h2 className="font-display truncate text-lg font-semibold">{workflow.name}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenPublicChat}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isDark
                ? 'border-[#D9A441]/60 text-[#D9A441] hover:bg-[#D9A441]/10'
                : 'border-[#3B3FA8] text-[#3B3FA8] hover:bg-[#3B3FA8]/5'
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Launch Public Chat Page
          </button>
          <button
            type="button"
            onClick={() => setShowPublishPanel((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isDark
                ? 'border-white/20 text-[#FAF6EC] hover:bg-white/5'
                : 'border-[#0F1226]/20 text-[#0F1226] hover:bg-[#0F1226]/5'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            Publish &amp; API
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunWorkflow}
            className="inline-flex items-center gap-2 rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] transition-colors duration-150 hover:bg-[#c89332] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {isRunning ? 'Executing Workflow…' : 'Run Workflow'}
          </button>
        </div>
      </div>

      {/* Publish Shareable Chat Page & REST Endpoint Drawer */}
      {showPublishPanel && (
        <div
          className={`border-b px-4 py-4 ${
            isDark ? 'border-white/10 bg-[#1B1F5E]/60' : 'border-[#0F1226]/10 bg-white'
          }`}
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold">
                Published Deployment Endpoints ({activeWorkspace.name})
              </p>
              <p className="text-xs opacity-75">
                Shareable Chat Page: <span className="font-mono">{shareableUrl}</span>
              </p>
              <p className="text-xs opacity-75">
                REST Endpoint: <span className="font-mono">{restEndpointUrl}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenPublicChat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3 py-1.5 text-xs font-semibold text-[#0F1226] whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Standalone Chat &amp; Embed Code
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
                {copiedEndpoint ? 'Copied REST URL' : 'Copy REST URL'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
              mobilePane === pane
                ? 'border-b-2 border-[#D9A441] font-semibold'
                : 'opacity-65'
            }`}
          >
            {pane === 'palette' ? '1. Palette & RAG' : pane === 'canvas' ? '2. Canvas' : '3. Inspector & Run'}
          </button>
        ))}
      </div>

      {/* Three-Pane Studio Workspace: Left 280px Palette | Center Flexible Canvas | Right 360px Inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANE: 280px Node Palette & Workspace RAG Index */}
        <aside
          aria-label="Studio Node Palette and RAG Documents"
          className={`${
            mobilePane === 'palette' ? 'block w-full' : 'hidden'
          } lg:block lg:w-[280px] shrink-0 overflow-y-auto border-r p-4 ${
            isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
          }`}
        >
          <div className="mb-6">
            <h3 className="mb-1 text-xs font-semibold">Add Workflow Node</h3>
            <p className="mb-3 text-xs opacity-70">
              Click any Apache-2.0 core node type to append it to your canvas.
            </p>
            <div className="space-y-2">
              {NODE_PALETTE.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => handleAddNode(item)}
                  className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors duration-150 ${
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
                    <p className="mt-0.5 text-[11px] leading-snug opacity-70">{item.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Per-App Tool Allowlist */}
          <div className="mb-6 border-t border-current/10 pt-4">
            <h3 className="mb-1 text-xs font-semibold">Enabled Assistant Tools</h3>
            <p className="mb-2.5 text-[11px] opacity-70">
              Choose which capabilities this workflow is permitted to use.
            </p>
            <div className="space-y-1.5">
              {ALL_TOOLS.map((tool) => {
                const checked = workflow.allowedTools.includes(tool.id);
                return (
                  <label
                    key={tool.id}
                    className="flex cursor-pointer items-start gap-2 rounded p-1.5 text-xs hover:bg-current/5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleAllowedTool(tool.id)}
                      className="mt-0.5 accent-[#3B3FA8]"
                    />
                    <div>
                      <div className="font-medium">{tool.label}</div>
                      <div className="text-[11px] opacity-65">{tool.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Workspace RAG Binary Drag-and-Drop + Text Upload */}
          <div className="border-t border-current/10 pt-4">
            <h3 className="mb-1 text-xs font-semibold">
              Workspace Knowledge Base ({ragChunks.length} passages)
            </h3>
            <p className="mb-2.5 text-[11px] opacity-70">
              Supported files: <span className="font-mono">.pdf, .docx, .txt, .md</span> (up to 10MB).
              Private to {activeWorkspace.name}.
            </p>

            {/* Binary File Dropzone */}
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
              className={`mb-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-3 text-center transition-colors ${
                isDraggingFile
                  ? 'border-[#D9A441] bg-[#D9A441]/10'
                  : isDark
                    ? 'border-white/20 bg-[#1B1F5E]/25 hover:border-[#D9A441]/60'
                    : 'border-[#0F1226]/25 bg-white hover:border-[#3B3FA8]'
              }`}
            >
              <FileUp className="h-4 w-4 text-[#D9A441]" />
              <span className="mt-1 text-xs font-semibold">
                Drop .PDF, .DOCX, .TXT, or .MD file
              </span>
              <span className="text-[11px] opacity-70">
                Parsed on server via zlib &amp; indexed with 64-dim vectors
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
                className={`w-full rounded border px-2.5 py-1.5 font-mono text-xs ${
                  isDark
                    ? 'border-white/15 bg-[#1B1F5E]/40 text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                }`}
              />
              <textarea
                rows={3}
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
                aria-label="Document text content to chunk and embed"
                placeholder="Or paste text to chunk & embed..."
                className={`w-full rounded border p-2 text-xs ${
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
                Chunk &amp; Index Text Snippet
              </button>
            </form>
            {uploadMessage && (
              <p className="mt-2 font-mono text-[11px] text-[#2E8B57] dark:text-[#D9A441]">
                {uploadMessage}
              </p>
            )}
            <div className="mt-3 space-y-1.5">
              {ragChunks.map((c) => (
                <div
                  key={c.id}
                  className={`rounded border p-2 text-[11px] ${
                    isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
                  }`}
                >
                  <div className="font-mono font-semibold">{c.sourceName}</div>
                  <div className="mt-0.5 line-clamp-2 opacity-75">{c.content}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER PANE: Visual Workflow Canvas */}
        <main
          aria-label="Visual Workflow Canvas"
          className={`${
            mobilePane === 'canvas' ? 'flex' : 'hidden'
          } lg:flex flex-1 flex-col justify-between overflow-auto p-4 sm:p-6 ${
            isDark ? 'bg-[#0E1030]' : 'bg-[#FAF6EC]'
          }`}
        >
          <div
            className={`relative min-h-[380px] flex-1 overflow-auto rounded-xl border p-6 ${
              isDark
                ? 'border-white/10 bg-[#1B1F5E]/25'
                : 'border-[#0F1226]/10 bg-white/75'
            }`}
            style={{
              backgroundImage: isDark
                ? 'radial-gradient(rgba(250, 246, 236, 0.08) 1px, transparent 1px)'
                : 'radial-gradient(rgba(15, 18, 38, 0.08) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs opacity-75">
                <span>Interactive Workflow Graph</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{workflow.nodes.length} nodes</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{workflow.edges.length} connections</span>
              </div>
              <div className="text-xs opacity-75">
                Select any node to inspect parameters on the right
              </div>
            </div>

            <div className="relative flex flex-col items-stretch gap-4 xl:flex-row xl:items-center xl:gap-3 pt-4">
              {workflow.nodes.map((node, index) => {
                const isSelected = selectedNode?.id === node.id;
                const isExecuting = executingNodeId === node.id;
                return (
                  <React.Fragment key={node.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNodeId(node.id);
                      }}
                      aria-label={`Inspect node ${node.title}`}
                      className={`group relative flex flex-col rounded-xl border p-4 text-left transition-all duration-150 xl:w-56 shrink-0 ${
                        isExecuting ? 'agba-node-executing' : ''
                      } ${
                        isSelected
                          ? isDark
                            ? 'border-[#D9A441] bg-[#1B1F5E]'
                            : 'border-[#3B3FA8] bg-white shadow-sm'
                          : isDark
                            ? 'border-white/15 bg-[#1B1F5E]/60 hover:border-white/35'
                            : 'border-[#0F1226]/15 bg-white hover:border-[#0F1226]/35'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          {getNodeIcon(node.kind)}
                          <span>0{index + 1}</span>
                        </span>
                        <span className="font-mono text-[11px] opacity-60">{node.kind}</span>
                      </div>
                      <div className="font-display text-sm font-semibold">{node.title}</div>
                      <p className="mt-1 text-xs opacity-75">{node.subtitle}</p>

                      {node.config.provider && (
                        <div className="mt-3 border-t border-current/10 pt-2 font-mono text-[11px] opacity-80">
                          {node.config.provider} · {node.config.modelName}
                        </div>
                      )}
                      {node.config.toolId && (
                        <div className="mt-3 border-t border-current/10 pt-2 font-mono text-[11px] opacity-80">
                          tool: {node.config.toolId}
                        </div>
                      )}
                      {node.config.topK && (
                        <div className="mt-3 border-t border-current/10 pt-2 font-mono text-[11px] opacity-80">
                          topK: {node.config.topK} · citations: on
                        </div>
                      )}
                    </button>

                    {index < workflow.nodes.length - 1 && (
                      <div
                        className="flex items-center justify-center py-1 xl:py-0"
                        aria-hidden="true"
                      >
                        <svg
                          className="h-6 w-6 rotate-90 xl:h-6 xl:w-12 xl:rotate-0"
                          viewBox="0 0 48 24"
                          fill="none"
                        >
                          <line
                            x1="0"
                            y1="12"
                            x2="40"
                            y2="12"
                            stroke={isRunning ? '#D9A441' : isDark ? '#FAF6EC' : '#3B3FA8'}
                            strokeOpacity={isRunning ? '1' : '0.45'}
                            strokeWidth="2"
                            className={isRunning ? 'agba-flow-active' : ''}
                          />
                          <polygon
                            points="38,7 48,12 38,17"
                            fill={isRunning ? '#D9A441' : isDark ? '#FAF6EC' : '#3B3FA8'}
                            fillOpacity={isRunning ? '1' : '0.6'}
                          />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Bottom Interactive Test & Citation Output Console */}
          <div
            className={`mt-4 rounded-xl border p-4 ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="studio-test-prompt" className="text-xs font-semibold">
                Test Your Assistant (With Document Citations)
              </label>
              <span className="text-[11px] opacity-70">
                Knowledge Base: {activeWorkspace.name}
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="studio-test-prompt"
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                }`}
              />
              <button
                type="button"
                disabled={isRunning}
                onClick={handleRunWorkflow}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {isRunning ? 'Running…' : 'Send & Cite'}
              </button>
            </div>

            {runError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#C2413B] bg-[#C2413B]/10 p-3 text-xs text-[#C2413B]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{runError}</span>
              </div>
            )}

            {runResult && (
              <div className="mt-4 space-y-3 border-t border-current/10 pt-3 text-xs">
                <div className="flex flex-wrap items-center gap-2 opacity-75">
                  <ShieldCheck className="h-4 w-4 text-[#2E8B57]" />
                  <span>Model: {runResult.modelUsed}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{runResult.durationMs} ms</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeWorkspace.name}</span>
                </div>
                <div
                  className={`rounded-lg border p-3 leading-relaxed whitespace-pre-wrap ${
                    isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                  }`}
                >
                  {runResult.answer}
                </div>
                {runResult.citations.length > 0 && (
                  <div>
                    <div className="mb-1.5 font-semibold">
                      Verified Workspace Citations ({runResult.citations.length}):
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {runResult.citations.map((cit, i) => (
                        <div
                          key={`${cit.documentId}-${i}`}
                          className="rounded border border-current/10 p-2 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-mono font-semibold">
                            <span>
                              [Source {i + 1}] {cit.sourceName}
                            </span>
                            {cit.similarityScore !== undefined && (
                              <span>cosine: {cit.similarityScore}</span>
                            )}
                          </div>
                          <div className="mt-0.5 opacity-75">{cit.excerpt}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT PANE: 360px Node Inspector Panel */}
        <aside
          aria-label="Node Inspector Panel"
          className={`${
            mobilePane === 'inspector' ? 'block w-full' : 'hidden'
          } lg:block lg:w-[360px] shrink-0 overflow-y-auto border-l p-4 ${
            isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
          }`}
        >
          <div className="mb-4 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#D9A441]" />
            <h3 className="font-display text-sm font-semibold">Node Inspector</h3>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div
                className={`rounded-lg border p-3 ${
                  isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <div className="font-mono text-[11px] opacity-65">ID: {selectedNode.id}</div>
                <div className="mt-0.5 font-display text-base font-semibold">
                  {selectedNode.title}
                </div>
                <div className="mt-0.5 opacity-75">{selectedNode.subtitle}</div>
              </div>

              {selectedNode.kind === 'llm_generator' && (
                <>
                  <div>
                    <label className="mb-1 block font-medium">
                      BYOK Model Provider (Adapter Interface)
                    </label>
                    <select
                      value={selectedNode.config.provider || 'gemini'}
                      onChange={(e) => {
                        const provider = e.target.value as ModelProvider;
                        const defaultModelMap: Record<ModelProvider, string> = {
                          gemini: 'gemini-3.8-flash',
                          openai: 'gpt-4o-mini',
                          anthropic: 'claude-3-5-sonnet',
                          mistral: 'mistral-small-latest',
                          ollama: 'ollama:llama3.2',
                        };
                        handleUpdateSelectedNodeConfig({
                          provider,
                          modelName: defaultModelMap[provider],
                        });
                      }}
                      className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
                        isDark
                          ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                      }`}
                    >
                      <option value="gemini">Google Gemini (BYOK / Server)</option>
                      <option value="openai">OpenAI (BYOK)</option>
                      <option value="anthropic">Anthropic Claude (BYOK)</option>
                      <option value="mistral">Mistral AI (BYOK)</option>
                      <option value="ollama">Ollama Local (Llama 3.2 / Open-Weights)</option>
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
                      className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
                        isDark
                          ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-medium">
                      System Instructions (Protected from Untrusted RAG Context)
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
                      Top-K Chunks (Neon pgvector Cosine Similarity)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={selectedNode.config.topK ?? 3}
                      onChange={(e) =>
                        handleUpdateSelectedNodeConfig({ topK: Number(e.target.value) })
                      }
                      className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
                        isDark
                          ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                          : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                      }`}
                    />
                  </div>
                  <div className="rounded-lg border border-current/15 p-3">
                    <div className="font-semibold">Workspace Privacy</div>
                    <p className="mt-1 opacity-75">
                      Retrieves passages exclusively from documents uploaded to {activeWorkspace.name}.
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
                      className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
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
                        Target Endpoint URL (SSRF Protected)
                      </label>
                      <input
                        type="text"
                        value={selectedNode.config.toolEndpoint || 'https://api.paystack.co/'}
                        onChange={(e) =>
                          handleUpdateSelectedNodeConfig({ toolEndpoint: e.target.value })
                        }
                        placeholder="https://api.example.com/v1/data"
                        className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
                          isDark
                            ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                        }`}
                      />
                      <p className="mt-1 text-[11px] opacity-70">
                        Try entering <span className="font-mono">http://169.254.169.254/</span> or{' '}
                        <span className="font-mono">http://127.0.0.1:8080</span> and clicking Run
                        Workflow to see SSRF protection block the request.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Execution Trace Log */}
              {runResult && (
                <div className="border-t border-current/10 pt-4">
                  <div className="mb-2 font-semibold">Latest Execution Trace</div>
                  <div className="space-y-2">
                    {runResult.traceSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`rounded border p-2.5 text-[11px] ${
                          isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>{step.node}</span>
                          <span className="font-mono text-[#2E8B57] dark:text-[#D9A441]">
                            {step.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-1 opacity-75">{step.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
};
