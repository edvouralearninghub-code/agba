import React, { useState } from 'react';
import {
  Send,
  ArrowLeft,
  Code2,
  Copy,
  Check,
  ShieldCheck,
  Database,
  Terminal,
} from 'lucide-react';
import type { StudioWorkflowApp, Workspace } from '../types/agba.ts';

interface PublicChatViewProps {
  workspace: Workspace;
  workflow: StudioWorkflowApp;
  onBackToStudio: () => void;
  isDark: boolean;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  durationMs?: number;
  citations?: {
    sourceName: string;
    documentId: string;
    similarityScore?: number;
    excerpt: string;
  }[];
}

export const PublicChatView: React.FC<PublicChatViewProps> = ({
  workspace,
  workflow,
  onBackToStudio,
  isDark,
}) => {
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: `Welcome to **${workflow.name}** (published by *${workspace.name}*). Ask any question grounded in this workspace's verified knowledge base.`,
      modelUsed: 'agba-studio-published',
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [showEmbedDrawer, setShowEmbedDrawer] = useState<boolean>(false);
  const [copiedType, setCopiedType] = useState<'embed' | 'curl' | null>(null);

  const publicUrl = `${window.location.origin}/chat/${workspace.slug}/${workflow.id}`;
  const restEndpointUrl = `${window.location.origin}/api/v1/workspaces/${workspace.id}/apps/${workflow.id}/run`;

  const embedCode = `<script
  src="${window.location.origin}/embed/agba-widget.js"
  data-workspace-id="${workspace.id}"
  data-app-id="${workflow.id}"
  data-theme="${isDark ? 'dark' : 'light'}"
  defer
></script>`;

  const curlCode = `curl -X POST "${restEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer agba_live_${workspace.id.slice(-6)}_••••" \\
  -d '{"prompt": "What are the key onboarding and Paystack settlement rules?"}'`;

  const handleSend = async (promptText?: string) => {
    const query = (promptText ?? input).trim();
    if (!query || sending) return;

    const userMsg: ChatTurn = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInput('');
    setSending(true);

    const llmNode = workflow.nodes.find((n) => n.kind === 'llm_generator');
    const toolNode = workflow.nodes.find((n) => n.kind === 'agent_tool');

    try {
      const res = await fetch(
        `/api/v1/workspaces/${encodeURIComponent(workspace.id)}/apps/${encodeURIComponent(
          workflow.id
        )}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-agba-workspace-id': workspace.id,
            'x-agba-role': workspace.memberRole,
          },
          body: JSON.stringify({
            workspace_id: workspace.id,
            appId: workflow.id,
            appName: workflow.name,
            prompt: query,
            systemPrompt: llmNode?.config.systemPrompt,
            allowedTools: workflow.allowedTools,
            activeTool: toolNode?.config.toolId,
            toolTargetUrl: toolNode?.config.toolEndpoint,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: 'assistant',
            text: `Policy Guard: ${data.error || 'Request blocked.'}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: 'assistant',
            text: data.answer,
            modelUsed: data.modelUsed,
            durationMs: data.durationMs,
            citations: data.citations,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Network error',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`flex h-full flex-col ${
        isDark ? 'bg-[#0E1030] text-[#FAF6EC]' : 'bg-[#FAF6EC] text-[#0F1226]'
      }`}
    >
      {/* Top Published Chat Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${
          isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStudio}
            className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3 py-1.5 text-xs font-medium hover:bg-current/5 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Studio Canvas
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs opacity-75">
              <span>Published Shareable App</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{publicUrl}</span>
            </div>
            <h1 className="font-display text-base font-bold sm:text-lg">{workflow.name}</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEmbedDrawer((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3.5 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] whitespace-nowrap shrink-0"
        >
          <Code2 className="h-3.5 w-3.5" />
          {showEmbedDrawer ? 'Hide Embed & API Code' : 'Embed Widget & REST API'}
        </button>
      </div>

      {/* Embed Script & cURL REST API Drawer */}
      {showEmbedDrawer && (
        <div
          className={`border-b p-4 ${
            isDark ? 'border-white/10 bg-[#1B1F5E]/60' : 'border-[#0F1226]/10 bg-white'
          }`}
        >
          <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-current/15 p-3.5 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Code2 className="h-3.5 w-3.5 text-[#D9A441]" />
                  Embeddable Website Widget (&lt;script&gt;)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(embedCode);
                    setCopiedType('embed');
                    setTimeout(() => setCopiedType(null), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded border border-current/20 px-2 py-1 text-[11px]"
                >
                  {copiedType === 'embed' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedType === 'embed' ? 'Copied' : 'Copy HTML'}
                </button>
              </div>
              <pre
                className={`overflow-x-auto rounded p-2.5 font-mono text-[11px] ${
                  isDark ? 'bg-[#0E1030]' : 'bg-[#FAF6EC]'
                }`}
              >
                {embedCode}
              </pre>
            </div>

            <div className="rounded-xl border border-current/15 p-3.5 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Terminal className="h-3.5 w-3.5 text-[#D9A441]" />
                  Production REST Endpoint (cURL)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(curlCode);
                    setCopiedType('curl');
                    setTimeout(() => setCopiedType(null), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded border border-current/20 px-2 py-1 text-[11px]"
                >
                  {copiedType === 'curl' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copiedType === 'curl' ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <pre
                className={`overflow-x-auto rounded p-2.5 font-mono text-[11px] ${
                  isDark ? 'bg-[#0E1030]' : 'bg-[#FAF6EC]'
                }`}
              >
                {curlCode}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Chat Conversation Stream */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-between overflow-hidden p-4 sm:p-6">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[90%] rounded-xl border p-4 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'border-[#3B3FA8] bg-[#3B3FA8] text-[#FAF6EC]'
                    : isDark
                      ? 'border-white/10 bg-[#1B1F5E]/50 text-[#FAF6EC]'
                      : 'border-[#0F1226]/10 bg-white text-[#0F1226]'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 border-t border-current/10 pt-2.5 text-xs">
                    <div className="mb-1.5 flex items-center gap-1.5 font-semibold opacity-85">
                      <Database className="h-3.5 w-3.5 text-[#D9A441]" />
                      <span>Verified Workspace Citations ({msg.citations.length}):</span>
                    </div>
                    <div className="space-y-1.5">
                      {msg.citations.map((cit, i) => (
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
                          <p className="mt-0.5 opacity-75">{cit.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.role === 'assistant' && msg.durationMs !== undefined && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] opacity-65">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#2E8B57]" />
                    <span>{msg.modelUsed}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{msg.durationMs} ms</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Starter Question Prompts & Input Bar */}
        <div className="mt-4 space-y-3 border-t border-current/10 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              'How does AGBA verify Paystack webhooks and store NGN/USD amounts?',
              'If 120 customers pay 15,000 NGN and server cost is 240,000 NGN, what is our margin?',
              'Which open-source GitHub modules power AGBA?',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => handleSend(sample)}
                className="rounded-lg border border-current/15 px-2.5 py-1 text-left text-xs opacity-80 hover:bg-current/5 hover:opacity-100"
              >
                {sample}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${workflow.name}...`}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm ${
                isDark
                  ? 'border-white/15 bg-[#1B1F5E]/40 text-[#FAF6EC]'
                  : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
              }`}
            />
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D9A441] px-5 py-2.5 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? 'Thinking…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
