import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Check,
  Send,
  Inbox,
  Settings,
  CheckCircle2,
  RefreshCw,
  Users,
  Reply,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { Workspace } from '../types/agba.ts';

interface CustomTableColumn {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'timestamp' | 'json';
  required?: boolean;
}

interface CustomDatabaseTable {
  id: string;
  workspace_id: string;
  tableName: string;
  description: string;
  columns: CustomTableColumn[];
  rows: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

interface WorkbenchSharedProps {
  activeWorkspace: Workspace;
  reqHeaders: Record<string, string>;
  cardSurface: string;
  inputSurface: string;
}

// ============================================================================
// 1. SUPABASE-STYLE DATABASE TABLE EDITOR & LIVE REST API WORKBENCH
// ============================================================================
export const SupabaseDatabaseWorkbench: React.FC<WorkbenchSharedProps> = ({
  activeWorkspace,
  reqHeaders,
  cardSurface,
  inputSurface,
}) => {
  const [tables, setTables] = useState<CustomDatabaseTable[]>([]);
  const [activeTableName, setActiveTableName] = useState<string>('customers');
  const [showNewTableModal, setShowNewTableModal] = useState<boolean>(false);
  const [newTableName, setNewTableName] = useState<string>('');
  const [newTableDesc, setNewTableDesc] = useState<string>('');
  const [newColumns, setNewColumns] = useState<CustomTableColumn[]>([
    { name: 'title', type: 'text', required: true },
    { name: 'amount', type: 'number', required: false },
    { name: 'active', type: 'boolean', required: false },
  ]);
  const [rowDraft, setRowDraft] = useState<Record<string, string>>({});
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<boolean>(false);
  const [apiTestOutput, setApiTestOutput] = useState<string | null>(null);

  const loadTables = async () => {
    try {
      const res = await fetch(
        `/api/studio/tables?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        { headers: reqHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        const list: CustomDatabaseTable[] = data.tables || [];
        setTables(list);
        if (list.length > 0 && !list.some((t) => t.tableName === activeTableName)) {
          setActiveTableName(list[0].tableName);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadTables();
  }, [activeWorkspace.id]);

  const activeTable =
    tables.find((t) => t.tableName === activeTableName) || tables[0] || null;

  const editableColumns = (activeTable?.columns || []).filter(
    (c) => c.name !== 'id' && c.name !== 'created_at'
  );

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    setStatusMsg(null);
    try {
      const res = await fetch('/api/studio/tables', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          tableName: newTableName,
          description: newTableDesc,
          columns: newColumns.filter((c) => c.name.trim().length > 0),
        }),
      });
      const data = await res.json();
      if (res.ok && data.table) {
        setTables(data.tables || []);
        setActiveTableName(data.table.tableName);
        setNewTableName('');
        setNewTableDesc('');
        setShowNewTableModal(false);
        setStatusMsg(`Created table "${data.table.tableName}" with live REST API endpoint.`);
      } else {
        setStatusMsg(data.error || 'Could not create table.');
      }
    } catch {
      setStatusMsg('Network error creating table.');
    }
  };

  const handleInsertRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTable) return;
    setStatusMsg(null);
    const payload: Record<string, unknown> = {};
    for (const col of editableColumns) {
      const raw = rowDraft[col.name] ?? '';
      if (col.type === 'number') {
        payload[col.name] = Number(raw || 0);
      } else if (col.type === 'boolean') {
        payload[col.name] = raw.toLowerCase() === 'true' || raw === '1';
      } else {
        payload[col.name] = raw;
      }
    }

    try {
      const res = await fetch(
        `/api/studio/tables/${encodeURIComponent(activeTable.tableName)}/rows`,
        {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            workspace_id: activeWorkspace.id,
            row: payload,
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setTables(data.tables || []);
        setRowDraft({});
        setStatusMsg(`Inserted row ${data.insertedRow?.id} into "${activeTable.tableName}".`);
      } else {
        setStatusMsg(data.error || 'Failed to insert row.');
      }
    } catch {
      setStatusMsg('Network error inserting row.');
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!activeTable) return;
    try {
      const res = await fetch(
        `/api/studio/tables/${encodeURIComponent(
          activeTable.tableName
        )}/rows/${encodeURIComponent(rowId)}?workspace_id=${encodeURIComponent(
          activeWorkspace.id
        )}`,
        {
          method: 'DELETE',
          headers: reqHeaders,
        }
      );
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch {
      // ignore
    }
  };

  const handleDropTable = async (tableName: string) => {
    try {
      const res = await fetch(
        `/api/studio/tables/${encodeURIComponent(
          tableName
        )}?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        {
          method: 'DELETE',
          headers: reqHeaders,
        }
      );
      if (res.ok) {
        const data = await res.json();
        const next: CustomDatabaseTable[] = data.tables || [];
        setTables(next);
        if (next.length > 0) setActiveTableName(next[0].tableName);
      }
    } catch {
      // ignore
    }
  };

  const handleTestLiveBaaSGet = async () => {
    if (!activeTable) return;
    try {
      const res = await fetch(
        `/api/baas/${encodeURIComponent(activeWorkspace.id)}/${encodeURIComponent(
          activeTable.tableName
        )}`
      );
      const data = await res.json();
      setApiTestOutput(JSON.stringify(data, null, 2));
    } catch {
      setApiTestOutput('{"error": "Failed to fetch endpoint"}');
    }
  };

  const baasPath = activeTable
    ? `/api/baas/${activeWorkspace.id}/${activeTable.tableName}`
    : `/api/baas/${activeWorkspace.id}/customers`;

  const filteredRows = (activeTable?.rows || []).filter((r) => {
    if (!searchFilter.trim()) return true;
    return JSON.stringify(r).toLowerCase().includes(searchFilter.toLowerCase());
  });

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Column: Tables List, New Table Creator & Row Inserter */}
      <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-4 ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold">
              Supabase-Style Table Manager
            </h2>
            <p className="text-[11px] opacity-75">
              Create tables, add rows, and get instant REST APIs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewTableModal((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#D9A441] px-2.5 py-1.5 text-xs font-bold text-[#0F1226]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Table</span>
          </button>
        </div>

        {/* Table Switcher */}
        <div className="space-y-1.5">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition ${
                activeTable?.tableName === t.tableName
                  ? 'border-[#D9A441] bg-[#D9A441]/10 font-bold'
                  : inputSurface
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTableName(t.tableName);
                  setApiTestOutput(null);
                }}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <Database className="h-3.5 w-3.5 text-[#2E8B57]" />
                <span>{t.tableName}</span>
                <span className="rounded bg-current/10 px-1.5 py-0.5 font-mono text-[10px]">
                  {t.rows.length} rows
                </span>
              </button>
              {!['customers', 'orders'].includes(t.tableName) && (
                <button
                  type="button"
                  onClick={() => void handleDropTable(t.tableName)}
                  className="rounded p-1 text-[#C84B31] hover:bg-[#C84B31]/10"
                  title="Drop custom table"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create New Table Form */}
        {showNewTableModal && (
          <form
            onSubmit={handleCreateTable}
            className={`space-y-2.5 rounded-xl border p-3.5 text-xs ${inputSurface}`}
          >
            <div className="font-bold text-[#D9A441]">Create New Workspace Table</div>
            <div>
              <label className="mb-1 block font-semibold">Table Name (lowercase)</label>
              <input
                type="text"
                required
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g. products, leads, invoices"
                className="w-full rounded-lg border border-current/20 bg-transparent px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold">Description</label>
              <input
                type="text"
                value={newTableDesc}
                onChange={(e) => setNewTableDesc(e.target.value)}
                placeholder="What does this table store?"
                className="w-full rounded-lg border border-current/20 bg-transparent px-2.5 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Columns (id &amp; created_at added automatically)</span>
                <button
                  type="button"
                  onClick={() =>
                    setNewColumns((prev) => [...prev, { name: '', type: 'text', required: false }])
                  }
                  className="text-[11px] font-bold text-[#D9A441] underline"
                >
                  + Add Column
                </button>
              </div>
              {newColumns.map((col, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="column_name"
                    value={col.name}
                    onChange={(e) => {
                      const next = [...newColumns];
                      next[idx] = { ...col, name: e.target.value };
                      setNewColumns(next);
                    }}
                    className="flex-1 rounded border border-current/20 bg-transparent px-2 py-1 font-mono text-[11px]"
                  />
                  <select
                    value={col.type}
                    onChange={(e) => {
                      const next = [...newColumns];
                      next[idx] = {
                        ...col,
                        type: e.target.value as CustomTableColumn['type'],
                      };
                      setNewColumns(next);
                    }}
                    className="rounded border border-current/20 bg-transparent px-1.5 py-1 font-mono text-[11px]"
                  >
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#2E8B57] py-2 font-bold text-white"
            >
              Create Table Now
            </button>
          </form>
        )}

        {/* Insert Row into Active Table */}
        {activeTable && (
          <form
            onSubmit={handleInsertRow}
            className="space-y-2.5 border-t border-current/10 pt-3 text-xs"
          >
            <div className="font-bold">
              Insert New Row into <code className="text-[#2E8B57]">{activeTable.tableName}</code>
            </div>
            {editableColumns.map((col) => (
              <div key={col.name}>
                <label className="mb-0.5 block font-mono text-[11px] opacity-80">
                  {col.name} <span className="opacity-50">({col.type})</span>
                </label>
                {col.type === 'boolean' ? (
                  <select
                    value={rowDraft[col.name] || 'true'}
                    onChange={(e) =>
                      setRowDraft((prev) => ({ ...prev, [col.name]: e.target.value }))
                    }
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${inputSurface}`}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    type={col.type === 'number' ? 'number' : 'text'}
                    required={col.required}
                    value={rowDraft[col.name] || ''}
                    onChange={(e) =>
                      setRowDraft((prev) => ({ ...prev, [col.name]: e.target.value }))
                    }
                    placeholder={`Enter ${col.name}...`}
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs ${inputSurface}`}
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#D9A441] px-4 py-2 text-xs font-bold text-[#0F1226] hover:bg-[#c89332]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Insert Row into {activeTable.tableName}</span>
            </button>
          </form>
        )}

        {statusMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-[#2E8B57]/40 bg-[#2E8B57]/10 p-2.5 text-xs text-[#2E8B57]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Right Column: Visual Table Grid & Instant REST API Endpoints */}
      <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-8 ${cardSurface}`}>
        {activeTable ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-mono text-base font-bold">{activeTable.tableName}</h2>
                  <span className="rounded bg-[#2E8B57]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#2E8B57]">
                    {activeTable.rows.length} rows
                  </span>
                </div>
                <p className="text-xs opacity-75">{activeTable.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter rows..."
                  className={`rounded-lg border px-2.5 py-1.5 text-xs ${inputSurface}`}
                />
                <button
                  type="button"
                  onClick={() => void loadTables()}
                  className="rounded-lg border border-current/15 p-1.5 hover:bg-current/5"
                  title="Refresh table"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Data Table Grid */}
            <div className="overflow-x-auto rounded-xl border border-current/15">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className={`border-b border-current/15 ${inputSurface}`}>
                    {activeTable.columns.map((col) => (
                      <th key={col.name} className="px-3 py-2.5 font-mono font-bold">
                        {col.name}{' '}
                        <span className="font-normal opacity-50">({col.type})</span>
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/10">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTable.columns.length + 1}
                        className="px-4 py-8 text-center opacity-60"
                      >
                        No rows in this table yet. Use the form on the left or POST to{' '}
                        <code>{baasPath}</code> to insert rows.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr key={String(row.id || idx)} className="hover:bg-current/5">
                        {activeTable.columns.map((col) => (
                          <td key={col.name} className="px-3 py-2.5 font-mono text-[11px]">
                            {typeof row[col.name] === 'boolean'
                              ? row[col.name]
                                ? 'true'
                                : 'false'
                              : String(row[col.name] ?? '—')}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void handleDeleteRow(String(row.id))}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-[#C84B31] hover:bg-[#C84B31]/10"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Instant Supabase-Style REST BaaS API Panel */}
            <div className={`space-y-2.5 rounded-xl border p-4 text-xs ${inputSurface}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase text-[#2E8B57]">
                    Instant Auto-Generated REST API (Like Supabase PostgREST)
                  </span>
                  <div className="mt-0.5 font-mono text-xs font-bold">
                    GET / POST / DELETE {baasPath}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        typeof window !== 'undefined'
                          ? `${window.location.origin}${baasPath}`
                          : baasPath;
                      navigator.clipboard.writeText(url);
                      setCopiedEndpoint(true);
                      setTimeout(() => setCopiedEndpoint(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-2.5 py-1.5 text-[11px] font-semibold"
                  >
                    {copiedEndpoint ? (
                      <Check className="h-3.5 w-3.5 text-[#2E8B57]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedEndpoint ? 'Copied URL' : 'Copy Endpoint URL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTestLiveBaaSGet()}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#2B3A8C] px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Test Live GET API</span>
                  </button>
                </div>
              </div>

              {apiTestOutput && (
                <pre className="max-h-[160px] overflow-auto rounded-lg border border-current/15 bg-black/10 p-2.5 font-mono text-[11px]">
                  {apiTestOutput}
                </pre>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

// ============================================================================
// 2. OUTBOUND & INBOUND EMAIL ENGINE ACROSS THE BOARD (`svc-notify`)
// ============================================================================
export const EmailAcrossBoardWorkbench: React.FC<WorkbenchSharedProps> = ({
  activeWorkspace,
  reqHeaders,
  cardSurface,
  inputSurface,
}) => {
  const [subTab, setSubTab] = useState<'outbound' | 'inbound' | 'config'>('outbound');
  const [mode, setMode] = useState<'single' | 'broadcast'>('single');
  const [provider, setProvider] = useState<
    'agba_relay' | 'resend' | 'brevo' | 'sendgrid' | 'postmark'
  >('agba_relay');
  const [inboundProvider, setInboundProvider] = useState<
    'agba_inbound' | 'resend_inbound' | 'sendgrid_parse' | 'postmark_inbound' | 'mailgun_routes'
  >('resend_inbound');
  const [fromName, setFromName] = useState<string>('AGBA Workspace Mailer');
  const [fromEmail, setFromEmail] = useState<string>('hello@trendtactics.ng');
  const [replyToEmail, setReplyToEmail] = useState<string>('support@trendtactics.ng');
  const [rawApiKey, setRawApiKey] = useState<string>('');
  const [maskedKey, setMaskedKey] = useState<string | undefined>(undefined);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(true);

  const [recipientsRaw, setRecipientsRaw] = useState<string>('tunde.bakare@kobosme.ng');
  const [subject, setSubject] = useState<string>(
    'Your AGBA Workspace & Paystack Settlement Summary'
  );
  const [body, setBody] = useState<string>(
    'Hello there,\n\nYour workspace database tables and AI assistant endpoints are active. Reply directly to this email if you need any assistance from our Lagos engineering team.'
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [outboundList, setOutboundList] = useState<
    {
      id: string;
      provider: string;
      mode: string;
      from: string;
      recipients: string[];
      subject: string;
      body: string;
      status: string;
      providerMessageId: string;
      deliveryNote: string;
      createdAt: string;
    }[]
  >([]);

  const [inboundList, setInboundList] = useState<
    {
      id: string;
      provider: string;
      from: string;
      fromName: string;
      to: string;
      subject: string;
      body: string;
      status: string;
      aiReplyBody?: string;
      receivedAt: string;
    }[]
  >([]);
  const [selectedInboundId, setSelectedInboundId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<string>('');
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);

  const loadEmailOverview = async () => {
    try {
      const res = await fetch(
        `/api/studio/email/overview?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        { headers: reqHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setProvider(data.config.outboundProvider || 'agba_relay');
          setInboundProvider(data.config.inboundProvider || 'resend_inbound');
          setFromName(data.config.fromName || 'AGBA Workspace Mailer');
          setFromEmail(data.config.fromEmail || 'hello@trendtactics.ng');
          setReplyToEmail(data.config.replyToEmail || 'support@trendtactics.ng');
          setMaskedKey(data.config.maskedApiKey);
          setAutoReplyEnabled(Boolean(data.config.autoReplyEnabled));
        }
        setOutboundList(data.outbound || []);
        setInboundList(data.inbound || []);
        if (data.inbound?.length > 0 && !selectedInboundId) {
          setSelectedInboundId(data.inbound[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadEmailOverview();
  }, [activeWorkspace.id]);

  const handleImportCustomersFromDb = async () => {
    try {
      const res = await fetch(
        `/api/baas/${encodeURIComponent(activeWorkspace.id)}/customers`
      );
      if (res.ok) {
        const data = await res.json();
        const emails = (data.data || [])
          .map((r: Record<string, unknown>) => String(r.email || '').trim())
          .filter((e: string) => e.includes('@'));
        if (emails.length > 0) {
          setMode('broadcast');
          setRecipientsRaw(emails.join(', '));
          setFeedbackMsg(
            `Imported ${emails.length} customer email(s) directly from your workspace "customers" database table.`
          );
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientsRaw.trim() || !subject.trim() || !body.trim()) return;
    setIsSending(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/studio/email/send', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          mode,
          provider,
          recipientsRaw,
          subject,
          body,
        }),
      });
      const data = await res.json();
      if (res.ok && data.record) {
        setOutboundList(data.outbound || []);
        setFeedbackMsg(data.record.deliveryNote);
      } else {
        setFeedbackMsg(data.error || 'Failed to send email.');
      }
    } catch {
      setFeedbackMsg('Network error sending email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateInbound = async () => {
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/inbound/email/${encodeURIComponent(activeWorkspace.id)}`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          provider: inboundProvider,
          from: 'chinedu.okafor@lekki-ventures.ng',
          fromName: 'Chinedu Okafor (Lekki Ventures)',
          subject: 'We want to upgrade our team to 15 seats on AGBA',
          text: 'Hi team, we tested the new Website Builder and Supabase Database Studio. Please send us the onboarding invoice for 15 seats in NGN.',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInboundList(data.inbound || []);
        setOutboundList(data.outbound || []);
        if (data.inboundRecord) {
          setSelectedInboundId(data.inboundRecord.id);
        }
        setFeedbackMsg(
          `Received inbound email from Chinedu Okafor${
            autoReplyEnabled ? ' and automatically sent an AI Auto-Reply!' : '.'
          }`
        );
      }
    } catch {
      // ignore
    }
  };

  const handleReplyInbound = async (inboundId: string, customText?: string) => {
    const textToSend = (customText || replyDraft).trim();
    if (!textToSend) return;
    try {
      const res = await fetch(`/api/studio/email/inbound/${encodeURIComponent(inboundId)}/reply`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          replyBody: textToSend,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInboundList(data.inbound || []);
        setOutboundList(data.outbound || []);
        setReplyDraft('');
        setFeedbackMsg('Sent direct email reply and logged in Outbox.');
      }
    } catch {
      // ignore
    }
  };

  const handleSaveProviderConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/studio/email/config', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
          outboundProvider: provider,
          inboundProvider,
          fromEmail,
          fromName,
          replyToEmail,
          rawApiKey: rawApiKey.trim() || undefined,
          autoReplyEnabled,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMaskedKey(data.config?.maskedApiKey);
        setRawApiKey('');
        setFeedbackMsg('Saved Outbound & Inbound Email Provider configuration.');
      }
    } catch {
      // ignore
    }
  };

  const activeInbound =
    inboundList.find((m) => m.id === selectedInboundId) || inboundList[0] || null;
  const inboundWebhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/inbound/email/${activeWorkspace.id}`
      : `/api/inbound/email/${activeWorkspace.id}`;

  return (
    <div className="space-y-4">
      {/* Sub-navigation bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 ${cardSurface}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('outbound')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              subTab === 'outbound'
                ? 'bg-[#2B3A8C] text-white'
                : 'border border-current/15 opacity-80'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>1. Send Single or Broadcast Email ({outboundList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('inbound')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              subTab === 'inbound'
                ? 'bg-[#2B3A8C] text-white'
                : 'border border-current/15 opacity-80'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>2. Inbound Email Inbox &amp; Auto-Reply ({inboundList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('config')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              subTab === 'config'
                ? 'bg-[#2B3A8C] text-white'
                : 'border border-current/15 opacity-80'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>3. Outbound &amp; Inbound Providers ({provider.toUpperCase()})</span>
          </button>
        </div>

        {feedbackMsg && (
          <div className="flex items-center gap-1.5 rounded-lg bg-[#2E8B57]/15 px-3 py-1.5 text-xs font-semibold text-[#2E8B57]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* TAB 1: OUTBOUND SINGLE & BROADCAST MAILER */}
      {subTab === 'outbound' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleSendEmail}
            className={`space-y-3.5 rounded-2xl border p-5 lg:col-span-5 text-xs ${cardSurface}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">
                Send Email Across the Board
              </h2>
              <button
                type="button"
                onClick={() => void handleImportCustomersFromDb()}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D9A441] bg-[#D9A441]/10 px-2.5 py-1 text-[11px] font-bold text-[#D9A441]"
              >
                <Users className="h-3 w-3" />
                <span>Load Customer Emails from DB</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block font-semibold">Send Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'single' | 'broadcast')}
                  className={`w-full rounded-lg border px-2.5 py-2 font-semibold ${inputSurface}`}
                >
                  <option value="single">Single Transactional Email</option>
                  <option value="broadcast">Bulk Broadcast (Multi-Recipient)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Outbound Provider</label>
                <select
                  value={provider}
                  onChange={(e) =>
                    setProvider(
                      e.target.value as
                        | 'agba_relay'
                        | 'resend'
                        | 'brevo'
                        | 'sendgrid'
                        | 'postmark'
                    )
                  }
                  className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs font-bold ${inputSurface}`}
                >
                  <option value="agba_relay">AGBA Built-in Relay (Instant)</option>
                  <option value="resend">Resend API (api.resend.com)</option>
                  <option value="brevo">Brevo SMTP API (api.brevo.com)</option>
                  <option value="sendgrid">SendGrid v3 API</option>
                  <option value="postmark">Postmark API</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold">
                {mode === 'broadcast'
                  ? 'Recipient Emails (Comma or space separated across the board)'
                  : 'Recipient Email Address'}
              </label>
              <textarea
                rows={mode === 'broadcast' ? 2 : 1}
                required
                value={recipientsRaw}
                onChange={(e) => setRecipientsRaw(e.target.value)}
                placeholder="tunde@company.ng, amaka@logistics.com, team@startup.io"
                className={`w-full rounded-xl border p-2.5 font-mono text-xs ${inputSurface}`}
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">Email Subject Line</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-xs ${inputSurface}`}
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">Email Body</label>
              <textarea
                rows={5}
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={`w-full rounded-xl border p-2.5 text-xs leading-relaxed ${inputSurface}`}
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-4 py-2.5 text-xs font-bold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {isSending
                  ? 'Dispatching Email…'
                  : mode === 'broadcast'
                    ? 'Send Bulk Broadcast Across All Recipients'
                    : 'Send Email Now'}
              </span>
            </button>
          </form>

          {/* Outbox Ledger */}
          <div className={`space-y-3 rounded-2xl border p-5 lg:col-span-7 text-xs ${cardSurface}`}>
            <div className="flex items-center justify-between border-b border-current/10 pb-3">
              <div>
                <h2 className="font-display text-sm font-bold">
                  Live Outbound Delivery Ledger ({outboundList.length})
                </h2>
                <p className="text-[11px] opacity-75">
                  From: {fromName} &lt;{fromEmail}&gt;
                </p>
              </div>
              <span className="rounded bg-[#2E8B57]/15 px-2.5 py-1 font-mono text-[10px] font-bold text-[#2E8B57]">
                PROVIDER: {provider.toUpperCase()}
              </span>
            </div>

            <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
              {outboundList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-current/15 p-10 text-center opacity-70">
                  No outbound emails sent yet in this session. Click{' '}
                  <strong>Send Email Now</strong> on the left to dispatch your first message or
                  broadcast.
                </div>
              ) : (
                outboundList.map((item) => (
                  <div key={item.id} className={`rounded-xl border p-3.5 space-y-1.5 ${inputSurface}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-sm">{item.subject}</span>
                      <span className="rounded bg-[#2E8B57]/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#2E8B57]">
                        {item.status} · {item.provider} · {item.mode}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] opacity-80">
                      To ({item.recipients.length}): {item.recipients.join(', ')}
                    </div>
                    <p className="text-xs opacity-90 whitespace-pre-line">{item.body}</p>
                    <div className="pt-1 text-[10px] font-mono opacity-65">
                      {item.deliveryNote} · ID: {item.providerMessageId}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INBOUND EMAIL INBOX & AI AUTO-REPLY */}
      {subTab === 'inbound' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className={`space-y-3 rounded-2xl border p-5 lg:col-span-5 text-xs ${cardSurface}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold">
                  Inbound Customer Inbox ({inboundList.length})
                </h2>
                <p className="text-[11px] opacity-75">
                  Receives webhooks from Resend, SendGrid, Postmark &amp; Mailgun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSimulateInbound()}
                className="inline-flex items-center gap-1 rounded-lg bg-[#D9A441] px-2.5 py-1.5 text-[11px] font-bold text-[#0F1226]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Simulate Inbound Email</span>
              </button>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {inboundList.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => setSelectedInboundId(msg.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    activeInbound?.id === msg.id
                      ? 'border-[#D9A441] bg-[#D9A441]/10'
                      : inputSurface
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{msg.fromName}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                        msg.status === 'replied'
                          ? 'bg-[#2E8B57]/15 text-[#2E8B57]'
                          : 'bg-[#D9A441]/20 text-[#D9A441]'
                      }`}
                    >
                      {msg.status}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] opacity-70">{msg.from}</div>
                  <div className="mt-1 font-semibold truncate">{msg.subject}</div>
                </button>
              ))}
            </div>
          </div>

          <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-7 text-xs ${cardSurface}`}>
            {activeInbound ? (
              <>
                <div className="border-b border-current/10 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-current/10 px-2 py-0.5 font-mono text-[10px] uppercase">
                      Inbound via {activeInbound.provider}
                    </span>
                    <span className="font-mono text-[11px] opacity-70">
                      To: {activeInbound.to}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-base font-bold">
                    {activeInbound.subject}
                  </h3>
                  <div className="mt-0.5 font-mono text-xs opacity-80">
                    From: {activeInbound.fromName} &lt;{activeInbound.from}&gt;
                  </div>
                </div>

                <div className={`rounded-xl border p-4 leading-relaxed ${inputSurface}`}>
                  {activeInbound.body}
                </div>

                {activeInbound.aiReplyBody && (
                  <div className="rounded-xl border border-[#2E8B57]/40 bg-[#2E8B57]/10 p-3.5 space-y-1">
                    <div className="font-bold text-[#2E8B57]">
                      Sent Reply to {activeInbound.from}:
                    </div>
                    <p className="leading-relaxed">{activeInbound.aiReplyBody}</p>
                  </div>
                )}

                <div className="space-y-2 border-t border-current/10 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold">Reply to {activeInbound.fromName}</label>
                    <button
                      type="button"
                      onClick={() => {
                        const drafted = `Hi ${activeInbound.fromName},\n\nThank you for your email regarding "${activeInbound.subject}". We have confirmed your details in our AGBA workspace and processed your request. Let us know if you need anything else!`;
                        setReplyDraft(drafted);
                      }}
                      className="text-[11px] font-bold text-[#D9A441] underline"
                    >
                      Generate AI Reply Draft
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="Type your reply or click 'Generate AI Reply Draft' above..."
                    className={`w-full rounded-xl border p-2.5 text-xs ${inputSurface}`}
                  />
                  <button
                    type="button"
                    onClick={() => void handleReplyInbound(activeInbound.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-bold text-white"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    <span>Send Reply Email Now</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 3: OUTBOUND & INBOUND PROVIDER SETTINGS */}
      {subTab === 'config' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleSaveProviderConfig}
            className={`space-y-3.5 rounded-2xl border p-5 lg:col-span-6 text-xs ${cardSurface}`}
          >
            <h2 className="font-display text-sm font-bold">
              Outbound &amp; Inbound Email Provider Configuration
            </h2>
            <p className="text-[11px] opacity-75">
              Connect Resend, Brevo, SendGrid, or Postmark for external inbox delivery, or use the
              built-in AGBA Relay with zero setup.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-semibold">Default Outbound Provider</label>
                <select
                  value={provider}
                  onChange={(e) =>
                    setProvider(
                      e.target.value as
                        | 'agba_relay'
                        | 'resend'
                        | 'brevo'
                        | 'sendgrid'
                        | 'postmark'
                    )
                  }
                  className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs ${inputSurface}`}
                >
                  <option value="agba_relay">AGBA Built-in Relay</option>
                  <option value="resend">Resend (api.resend.com)</option>
                  <option value="brevo">Brevo / Sendinblue</option>
                  <option value="sendgrid">SendGrid v3</option>
                  <option value="postmark">Postmark</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">Default Inbound Provider</label>
                <select
                  value={inboundProvider}
                  onChange={(e) =>
                    setInboundProvider(
                      e.target.value as
                        | 'agba_inbound'
                        | 'resend_inbound'
                        | 'sendgrid_parse'
                        | 'postmark_inbound'
                        | 'mailgun_routes'
                    )
                  }
                  className={`w-full rounded-lg border px-2.5 py-2 font-mono text-xs ${inputSurface}`}
                >
                  <option value="resend_inbound">Resend Inbound Webhook</option>
                  <option value="sendgrid_parse">SendGrid Inbound Parse</option>
                  <option value="postmark_inbound">Postmark Inbound</option>
                  <option value="mailgun_routes">Mailgun Routes</option>
                  <option value="agba_inbound">AGBA Direct Inbound</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-semibold">Sender Display Name</label>
                <input
                  type="text"
                  required
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs ${inputSurface}`}
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Sender Email Address</label>
                <input
                  type="email"
                  required
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${inputSurface}`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold">
                Provider API Key (Optional — Encrypted with AES-256-GCM)
              </label>
              <input
                type="password"
                value={rawApiKey}
                onChange={(e) => setRawApiKey(e.target.value)}
                placeholder={
                  maskedKey
                    ? `Saved key: ${maskedKey} (type new key to replace)`
                    : 're_123456... or SG.123456... or xkeysib-...'
                }
                className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${inputSurface}`}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={autoReplyEnabled}
                onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                className="accent-[#D9A441]"
              />
              <span>
                Automatically send an AI acknowledgment reply whenever a new inbound customer email
                arrives
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#D9A441] py-2.5 font-bold text-[#0F1226]"
            >
              Save Email Provider Settings
            </button>
          </form>

          <div className={`space-y-4 rounded-2xl border p-5 lg:col-span-6 text-xs ${cardSurface}`}>
            <h3 className="font-display text-sm font-bold">
              Your Workspace Inbound Email Webhook Endpoint
            </h3>
            <p className="opacity-80 leading-relaxed">
              Paste this webhook URL into <strong>Resend Inbound</strong>,{' '}
              <strong>SendGrid Inbound Parse</strong>, <strong>Postmark</strong>, or{' '}
              <strong>Mailgun Routes</strong> to stream incoming customer emails directly into this
              workspace’s Inbox:
            </p>
            <div className={`flex items-center justify-between gap-2 rounded-xl border p-3 font-mono text-xs ${inputSurface}`}>
              <span className="truncate">{inboundWebhookUrl}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inboundWebhookUrl);
                  setCopiedWebhook(true);
                  setTimeout(() => setCopiedWebhook(false), 2000);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-2.5 py-1 text-[11px] font-semibold"
              >
                {copiedWebhook ? <Check className="h-3.5 w-3.5 text-[#2E8B57]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
