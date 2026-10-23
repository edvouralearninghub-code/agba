import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  X,
  Save,
  RotateCcw,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { FREE_STACK_CATEGORIES } from '../data/freeStackData.ts';
import type { FreeStackCategory, FreeStackEntry, Workspace } from '../types/agba.ts';

interface FreeStackCmsEditorProps {
  activeWorkspace: Workspace;
  workspaceId?: string;
  entries: FreeStackEntry[];
  onEntriesChange: (updated: FreeStackEntry[]) => void;
  editingEntry: FreeStackEntry | null;
  onSelectEditingEntry: (entry: FreeStackEntry | null) => void;
  onClose: () => void;
  isDark: boolean;
}

export const FreeStackCmsEditor: React.FC<FreeStackCmsEditorProps> = ({
  activeWorkspace,
  workspaceId,
  entries,
  onEntriesChange,
  editingEntry,
  onSelectEditingEntry,
  onClose,
  isDark,
}) => {
  const scopedWorkspaceId = workspaceId || activeWorkspace.id;

  // Form state for Service Name, Description, Tier Details, Link, Category, and Verification Date
  const [serviceName, setServiceName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<FreeStackCategory>('Cloud & Compute');
  const [freeTierSummary, setFreeTierSummary] = useState<string>('');
  const [officialPricingUrl, setOfficialPricingUrl] = useState<string>('https://');
  const [verifiedOn, setVerifiedOn] = useState<string>(new Date().toISOString().slice(0, 10));

  const [cmsSearch, setCmsSearch] = useState<string>('');
  const [cmsCategoryFilter, setCmsCategoryFilter] = useState<FreeStackCategory | 'All'>('All');
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdminUser =
    activeWorkspace.memberRole === 'owner' || activeWorkspace.memberRole === 'admin';

  useEffect(() => {
    if (editingEntry) {
      setServiceName(editingEntry.serviceName);
      setDescription(editingEntry.description || '');
      setCategory(editingEntry.category);
      setFreeTierSummary(editingEntry.freeTierSummary);
      setOfficialPricingUrl(editingEntry.officialPricingUrl);
      setVerifiedOn(editingEntry.verifiedOn);
    } else {
      setServiceName('');
      setDescription('');
      setCategory('Cloud & Compute');
      setFreeTierSummary('');
      setOfficialPricingUrl('https://');
      setVerifiedOn(new Date().toISOString().slice(0, 10));
    }
  }, [editingEntry]);

  const resetFormToCreate = () => {
    onSelectEditingEntry(null);
    setServiceName('');
    setDescription('');
    setCategory('Cloud & Compute');
    setFreeTierSummary('');
    setOfficialPricingUrl('https://');
    setVerifiedOn(new Date().toISOString().slice(0, 10));
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser) {
      setStatusMessage({
        type: 'error',
        text: 'Only Workspace Owners and Admins can create or update directory entries.',
      });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const isUpdating = Boolean(editingEntry);
      const endpoint = isUpdating
        ? `/api/cms/free-stack/${encodeURIComponent(editingEntry!.id)}`
        : '/api/cms/free-stack';
      const method = isUpdating ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-agba-workspace-id': scopedWorkspaceId,
          'x-agba-role': activeWorkspace.memberRole,
        },
        body: JSON.stringify({
          workspace_id: scopedWorkspaceId,
          serviceName,
          description,
          category,
          freeTierSummary,
          officialPricingUrl,
          verifiedOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Could not save directory entry. Please check all fields.',
        });
        return;
      }

      if (Array.isArray(data.entries)) {
        onEntriesChange(data.entries);
      } else if (isUpdating) {
        onEntriesChange(entries.map((item) => (item.id === data.entry.id ? data.entry : item)));
      } else {
        onEntriesChange([data.entry, ...entries]);
      }

      setStatusMessage({
        type: 'success',
        text: isUpdating
          ? `Updated "${data.entry.serviceName}" live in ${activeWorkspace.name}. Changes are immediately active without redeploying.`
          : `Saved "${data.entry.serviceName}" to ${activeWorkspace.name} (${data.totalEntries} verified services live).`,
      });

      if (!isUpdating) {
        resetFormToCreate();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save entry.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickVerify = async (entry: FreeStackEntry) => {
    if (!isAdminUser) {
      setStatusMessage({
        type: 'error',
        text: 'Administrative role (Owner or Admin) required to verify entries.',
      });
      return;
    }
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/cms/free-stack/${encodeURIComponent(entry.id)}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agba-workspace-id': activeWorkspace.id,
          'x-agba-role': activeWorkspace.memberRole,
        },
        body: JSON.stringify({
          workspace_id: activeWorkspace.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Unable to update verification date.',
        });
        return;
      }
      if (Array.isArray(data.entries)) {
        onEntriesChange(data.entries);
      } else {
        onEntriesChange(entries.map((item) => (item.id === data.entry.id ? data.entry : item)));
      }
      if (editingEntry?.id === entry.id) {
        onSelectEditingEntry(data.entry);
      }
      setStatusMessage({
        type: 'success',
        text: `Stamped today's verification date (${data.entry.verifiedOn}) on "${entry.serviceName}".`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Unable to update verification date.',
      });
    }
  };

  const handleDeleteEntry = async (entry: FreeStackEntry) => {
    if (!isAdminUser) {
      setStatusMessage({
        type: 'error',
        text: 'Administrative role (Owner or Admin) required to delete entries.',
      });
      return;
    }
    setStatusMessage(null);
    try {
      const res = await fetch(
        `/api/cms/free-stack/${encodeURIComponent(
          entry.id
        )}?workspace_id=${encodeURIComponent(activeWorkspace.id)}`,
        {
          method: 'DELETE',
          headers: {
            'x-agba-workspace-id': activeWorkspace.id,
            'x-agba-role': activeWorkspace.memberRole,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Unable to remove entry.',
        });
        return;
      }
      if (Array.isArray(data.entries)) {
        onEntriesChange(data.entries);
      } else {
        onEntriesChange(entries.filter((item) => item.id !== entry.id));
      }
      if (editingEntry?.id === entry.id) {
        resetFormToCreate();
      }
      setConfirmDeleteId(null);
      setStatusMessage({
        type: 'success',
        text: `Removed "${entry.serviceName}" from the live directory.`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Unable to remove entry.',
      });
    }
  };

  const filteredManagerEntries = useMemo(() => {
    const q = cmsSearch.trim().toLowerCase();
    return entries.filter((item) => {
      const matchesCat = cmsCategoryFilter === 'All' || item.category === cmsCategoryFilter;
      const matchesQ =
        !q ||
        item.serviceName.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.freeTierSummary.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [entries, cmsSearch, cmsCategoryFilter]);

  return (
    <div
      className={`mt-6 overflow-hidden rounded-2xl border shadow-sm transition-colors ${
        isDark ? 'border-[#D9A441]/50 bg-[#1B1F5E]/40' : 'border-[#3B3FA8]/40 bg-white'
      }`}
    >
      {/* Top CMS Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-[#2E8B57] dark:text-[#D9A441]" />
            <span>Free Stack Administrative Content Manager</span>
            <span aria-hidden="true">·</span>
            <span className="opacity-75">Workspace: {activeWorkspace.name}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize opacity-75">Role: {activeWorkspace.memberRole}</span>
          </div>
          <p className="mt-0.5 text-xs opacity-75">
            Create, edit, re-verify, or remove Free Stack directory entries live without redeploying
            the application.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editingEntry && (
            <button
              type="button"
              onClick={resetFormToCreate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3 py-1.5 text-xs font-medium hover:bg-current/5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Service Entry
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Content Manager"
            className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-2.5 py-1.5 text-xs font-medium hover:bg-current/5"
          >
            <X className="h-3.5 w-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {!isAdminUser && (
        <div className="border-b border-[#C9821B]/30 bg-[#C9821B]/10 px-5 py-2.5 text-xs font-medium text-[#C9821B]">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>
              Administrative Access Required: Switch your workspace role to Owner or Admin in the
              top bar to add, edit, or delete entries.
            </span>
          </span>
        </div>
      )}

      {/* Main Split Editor + Directory Content List */}
      <div className="grid gap-6 p-5 lg:grid-cols-12">
        {/* Left Column: Create / Edit Service Form */}
        <form onSubmit={handleSaveEntry} className="space-y-3.5 text-xs lg:col-span-5">
          <div className="flex items-center justify-between border-b border-current/10 pb-2">
            <h3 className="font-display text-base font-semibold">
              {editingEntry ? `Edit Service: ${editingEntry.serviceName}` : 'Add New Free Service'}
            </h3>
            {editingEntry && (
              <button
                type="button"
                onClick={resetFormToCreate}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
              >
                <RotateCcw className="h-3 w-3" />
                Switch to Create Mode
              </button>
            )}
          </div>

          <div>
            <label htmlFor="cms-service-name" className="mb-1 block font-medium">
              Service Name
            </label>
            <input
              id="cms-service-name"
              type="text"
              required
              disabled={!isAdminUser}
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Claude SEO Suite or Plausible Analytics"
              className={`w-full rounded-lg border px-3 py-2 text-xs disabled:opacity-60 ${
                isDark
                  ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                  : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
              }`}
            />
          </div>

          <div>
            <label htmlFor="cms-description" className="mb-1 block font-medium">
              Description
            </label>
            <input
              id="cms-description"
              type="text"
              disabled={!isAdminUser}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of what this service or repository helps builders accomplish..."
              className={`w-full rounded-lg border px-3 py-2 text-xs disabled:opacity-60 ${
                isDark
                  ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                  : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
              }`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cms-category" className="mb-1 block font-medium">
                Category
              </label>
              <select
                id="cms-category"
                disabled={!isAdminUser}
                value={category}
                onChange={(e) => setCategory(e.target.value as FreeStackCategory)}
                className={`w-full rounded-lg border px-3 py-2 text-xs disabled:opacity-60 ${
                  isDark
                    ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                }`}
              >
                {FREE_STACK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cms-verified-on" className="mb-1 block font-medium">
                Verification Date
              </label>
              <input
                id="cms-verified-on"
                type="date"
                required
                disabled={!isAdminUser}
                value={verifiedOn}
                onChange={(e) => setVerifiedOn(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 font-mono text-xs disabled:opacity-60 ${
                  isDark
                    ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                }`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="cms-link" className="mb-1 block font-medium">
              Link (Official Pricing or Repository URL)
            </label>
            <input
              id="cms-link"
              type="url"
              required
              disabled={!isAdminUser}
              value={officialPricingUrl}
              onChange={(e) => setOfficialPricingUrl(e.target.value)}
              placeholder="https://vendor.com/pricing or https://github.com/..."
              className={`w-full rounded-lg border px-3 py-2 font-mono text-xs disabled:opacity-60 ${
                isDark
                  ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                  : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
              }`}
            />
          </div>

          <div>
            <label htmlFor="cms-tier-details" className="mb-1 block font-medium">
              Tier Details (Free Tier Quotas, Limits, or Open-Source License)
            </label>
            <textarea
              id="cms-tier-details"
              rows={3}
              required
              disabled={!isAdminUser}
              value={freeTierSummary}
              onChange={(e) => setFreeTierSummary(e.target.value)}
              placeholder="Describe the monthly requests, storage, compute, or self-hosted license included for free..."
              className={`w-full rounded-lg border p-3 text-xs leading-relaxed disabled:opacity-60 ${
                isDark
                  ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                  : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !isAdminUser}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-4 py-2.5 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] disabled:opacity-50"
            >
              {editingEntry ? (
                <Save className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>
                {saving
                  ? 'Saving Changes…'
                  : editingEntry
                    ? 'Save & Update Entry'
                    : 'Publish New Entry'}
              </span>
            </button>

            {editingEntry && (
              <button
                type="button"
                onClick={resetFormToCreate}
                className="rounded-lg border border-current/20 px-3 py-2.5 text-xs font-medium hover:bg-current/5"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {statusMessage && (
            <div
              className={`rounded-lg border p-3 text-xs ${
                statusMessage.type === 'success'
                  ? 'border-[#2E8B57]/40 bg-[#2E8B57]/10 text-[#2E8B57] dark:text-[#D9A441]'
                  : 'border-[#C2413B]/40 bg-[#C2413B]/10 text-[#C2413B]'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </form>

        {/* Right Column: Quick Search & Direct CRUD Table */}
        <div className="flex flex-col justify-between lg:col-span-7">
          <div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-semibold">
                Directory Entries ({filteredManagerEntries.length} of {entries.length})
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
                  <input
                    type="search"
                    value={cmsSearch}
                    onChange={(e) => setCmsSearch(e.target.value)}
                    placeholder="Filter services..."
                    aria-label="Filter CMS entries"
                    className={`w-44 rounded-lg border py-1.5 pr-2.5 pl-8 text-xs ${
                      isDark
                        ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                        : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                    }`}
                  />
                </div>
                <select
                  value={cmsCategoryFilter}
                  onChange={(e) =>
                    setCmsCategoryFilter(e.target.value as FreeStackCategory | 'All')
                  }
                  aria-label="Filter CMS category"
                  className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                    isDark
                      ? 'border-white/15 bg-[#0E1030] text-[#FAF6EC]'
                      : 'border-[#0F1226]/15 bg-[#FAF6EC] text-[#0F1226]'
                  }`}
                >
                  <option value="All">All Categories</option>
                  {FREE_STACK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className={`max-h-[380px] overflow-y-auto rounded-xl border ${
                isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]/60'
              }`}
            >
              <table className="w-full text-left text-xs">
                <thead
                  className={`sticky top-0 border-b ${
                    isDark ? 'border-white/10 bg-[#1B1F5E]' : 'border-[#0F1226]/10 bg-white'
                  }`}
                >
                  <tr>
                    <th className="py-2.5 pr-2 pl-3 font-semibold">Service</th>
                    <th className="px-2 py-2.5 font-semibold">Category</th>
                    <th className="px-2 py-2.5 font-semibold">Verified</th>
                    <th className="py-2.5 pr-3 pl-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/10">
                  {filteredManagerEntries.slice(0, 65).map((item) => {
                    const isSelected = editingEntry?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected
                            ? isDark
                              ? 'bg-[#D9A441]/15'
                              : 'bg-[#3B3FA8]/10'
                            : 'hover:bg-current/[0.03]'
                        }`}
                      >
                        <td className="py-2.5 pr-2 pl-3">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <span>{item.serviceName}</span>
                            <a
                              href={item.officialPricingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View official link"
                              className="opacity-60 hover:opacity-100"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          {item.description && (
                            <div className="mt-0.5 line-clamp-1 text-[11px] opacity-70">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 opacity-80">{item.category}</td>
                        <td className="px-2 py-2.5 font-mono tabular-nums opacity-75">
                          {item.verifiedOn}
                        </td>
                        <td className="py-2.5 pr-3 pl-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectEditingEntry(item)}
                              title="Edit this service"
                              className="inline-flex items-center gap-1 rounded border border-current/20 px-2 py-1 text-[11px] font-medium hover:bg-current/5"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              disabled={!isAdminUser}
                              onClick={() => handleQuickVerify(item)}
                              title="Stamp today's verification date"
                              className="inline-flex items-center gap-1 rounded border border-current/20 px-2 py-1 text-[11px] font-medium hover:bg-current/5 disabled:opacity-40"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Verify</span>
                            </button>
                            {confirmDeleteId === item.id ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(item)}
                                className="rounded bg-[#C2413B] px-2 py-1 text-[11px] font-semibold text-white"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={!isAdminUser}
                                onClick={() => setConfirmDeleteId(item.id)}
                                title="Remove entry"
                                className="rounded border border-current/20 p-1 text-[#C2413B] hover:bg-[#C2413B]/10 disabled:opacity-40"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
