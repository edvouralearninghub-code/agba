import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';
import { FREE_STACK_CATEGORIES, FREE_STACK_ENTRIES } from '../data/freeStackData.ts';
import { FreeStackCmsEditor } from './FreeStackCmsEditor.tsx';
import type { FreeStackCategory, FreeStackEntry, Workspace } from '../types/agba.ts';

interface FreeStackViewProps {
  activeWorkspace: Workspace;
  isDark: boolean;
  initialCategory?: FreeStackCategory | 'All';
  initialOpenCms?: boolean;
}

const FEATURED_AGBA_ECOSYSTEM = [
  {
    name: 'Claude SEO Suite',
    role: 'AI SEO, Schema.org & GEO/AEO Audits',
    license: 'MIT Open Source',
    url: 'https://github.com/AgriciDaniel/claude-seo',
    category: 'AI & Model APIs' as FreeStackCategory,
  },
  {
    name: 'OpenWork Core',
    role: 'Autonomous AI Coworker & Task Runner',
    license: 'MIT Core',
    url: 'https://github.com/different-ai/openwork',
    category: 'AI & Model APIs' as FreeStackCategory,
  },
  {
    name: 'Awesome MCP Servers',
    role: 'Model Context Protocol Tool Connectors',
    license: 'MIT Directory',
    url: 'https://github.com/punkpeye/awesome-mcp-servers',
    category: 'AI & Model APIs' as FreeStackCategory,
  },
  {
    name: 'Mattermost Team Edition',
    role: 'Self-Hosted Team ChatOps & Playbooks',
    license: 'Apache-2.0 Core',
    url: 'https://github.com/mattermost/mattermost',
    category: 'Email & Notifications' as FreeStackCategory,
  },
  {
    name: 'Plausible Analytics CE',
    role: 'Cookie-Free, Privacy-First Web Analytics',
    license: 'Self-Hosted Events API',
    url: 'https://github.com/plausible/analytics',
    category: 'Monitoring & Logs' as FreeStackCategory,
  },
];

export const FreeStackView: React.FC<FreeStackViewProps> = ({
  activeWorkspace,
  isDark,
  initialCategory = 'All',
  initialOpenCms = false,
}) => {
  const [entries, setEntries] = useState<FreeStackEntry[]>(FREE_STACK_ENTRIES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<FreeStackCategory | 'All'>(
    initialCategory
  );
  const [mobileTocOpen, setMobileTocOpen] = useState<boolean>(false);

  // Interactive CMS Editor state triggered by initialOpenCms flag
  const [showCmsEditor, setShowCmsEditor] = useState<boolean>(initialOpenCms);
  const [editingEntry, setEditingEntry] = useState<FreeStackEntry | null>(null);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setShowCmsEditor(initialOpenCms);
  }, [initialOpenCms]);

  useEffect(() => {
    fetch(`/api/cms/free-stack?workspace_id=${encodeURIComponent(activeWorkspace.id)}`, {
      headers: {
        'x-agba-workspace-id': activeWorkspace.id,
        'x-agba-role': activeWorkspace.memberRole,
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (payload?.data && Array.isArray(payload.data)) {
          setEntries(payload.data);
        }
      })
      .catch(() => {
        // Fallback to local verified entries
      });
  }, [activeWorkspace.id, activeWorkspace.memberRole]);

  const handleEditRow = (entry: FreeStackEntry) => {
    setEditingEntry(entry);
    setShowCmsEditor(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesCat = selectedCategory === 'All' || entry.category === selectedCategory;
      const matchesQuery =
        !q ||
        entry.serviceName.toLowerCase().includes(q) ||
        (entry.description && entry.description.toLowerCase().includes(q)) ||
        entry.freeTierSummary.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [entries, searchQuery, selectedCategory]);

  const activeCategories = useMemo(() => {
    if (selectedCategory !== 'All') {
      return [selectedCategory];
    }
    return FREE_STACK_CATEGORIES.filter((cat) =>
      filteredEntries.some((entry) => entry.category === cat)
    );
  }, [selectedCategory, filteredEntries]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 border-b border-current/10 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
            <span>AGBA Free Stack Directory</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
              {entries.length} verified always-free services
            </span>
            <span aria-hidden="true">·</span>
            <span>Workspace: {activeWorkspace.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setShowCmsEditor((s) => !s);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3.5 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] whitespace-nowrap shrink-0"
            >
              {showCmsEditor ? (
                <>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Hide Content Manager</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Manage &amp; Add Entries (CMS)</span>
                </>
              )}
            </button>
          </div>
        </div>

        <h1 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
          Verified Always-Free Developer, AI &amp; Cloud Services
        </h1>
        <p className="mt-2 max-w-3xl text-sm opacity-85">
          Every service below is independently researched, written in clear language, linked
          directly to its official pricing or open-source repository page, and stamped with its
          verification date.
        </p>

        {/* Featured AGBA Open-Source Ecosystem Strip */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold opacity-80">
            <Layers className="h-3.5 w-3.5 text-[#D9A441]" />
            <span>Featured Open-Source Powerhouses in the AGBA Stack</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURED_AGBA_ECOSYSTEM.map((feat) => (
              <div
                key={feat.name}
                className={`flex flex-col justify-between rounded-xl border p-3 text-xs ${
                  isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 font-semibold">
                    <span className="truncate">{feat.name}</span>
                    <a
                      href={feat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open ${feat.name}`}
                      className="text-[#3B3FA8] hover:opacity-80 dark:text-[#D9A441]"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug opacity-80">{feat.role}</p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-current/10 pt-1.5 text-[10px] opacity-70">
                  <span className="font-mono">{feat.license}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(feat.category);
                      setSearchQuery(feat.name.split(' ')[0]);
                    }}
                    className="font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                  >
                    Filter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Interactive CMS Content Manager View (Triggered by initialOpenCms or toggle) */}
        {showCmsEditor && (
          <FreeStackCmsEditor
            activeWorkspace={activeWorkspace}
            workspaceId={activeWorkspace.id}
            entries={entries}
            onEntriesChange={setEntries}
            editingEntry={editingEntry}
            onSelectEditingEntry={setEditingEntry}
            onClose={() => {
              setShowCmsEditor(false);
              setEditingEntry(null);
            }}
            isDark={isDark}
          />
        )}

        {/* Search & Category Filter Controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 opacity-50" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search across ${entries.length} verified free services, MCP servers, SEO, analytics, databases...`}
              aria-label="Search AGBA Free Stack directory"
              className={`w-full rounded-lg border py-2.5 pr-4 pl-10 text-sm ${
                isDark
                  ? 'border-white/15 bg-[#1B1F5E]/40 text-[#FAF6EC]'
                  : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
              }`}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as FreeStackCategory | 'All')}
            aria-label="Filter by category"
            className={`rounded-lg border px-3.5 py-2.5 text-xs font-medium ${
              isDark
                ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
            }`}
          >
            <option value="All">All Categories ({entries.length})</option>
            {FREE_STACK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({entries.filter((e) => e.category === cat).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Collapsible Table of Contents */}
      <div className="mb-6 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTocOpen((o) => !o)}
          className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-xs font-semibold ${
            isDark ? 'border-white/15 bg-[#1B1F5E]/40' : 'border-[#0F1226]/15 bg-white'
          }`}
        >
          <span>Jump to Category ({activeCategories.length})</span>
          {mobileTocOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {mobileTocOpen && (
          <nav
            aria-label="Mobile Free Stack Table of Contents"
            className={`mt-2 rounded-lg border p-3 ${
              isDark ? 'border-white/15 bg-[#1B1F5E]/30' : 'border-[#0F1226]/15 bg-white'
            }`}
          >
            <ul className="space-y-1.5 text-xs">
              {activeCategories.map((cat) => (
                <li key={cat}>
                  <a
                    href={`#cat-${cat.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    onClick={() => setMobileTocOpen(false)}
                    className="block py-1 hover:underline"
                  >
                    {cat}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* Desktop Sticky Table of Contents + Text-First Category Tables */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="hidden lg:sticky lg:top-6 lg:block lg:w-64 shrink-0">
          <nav
            aria-label="Free Stack Categories Table of Contents"
            className={`rounded-xl border p-4 ${
              isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="mb-3 flex items-center justify-between text-xs font-semibold">
              <span>Categories</span>
              <span className="font-mono tabular-nums opacity-70">{entries.length} total</span>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className={`flex w-full items-center justify-between text-left transition-colors hover:underline ${
                    selectedCategory === 'All' ? 'font-semibold text-[#D9A441]' : 'opacity-80'
                  }`}
                >
                  <span className="truncate">All Categories</span>
                  <span className="font-mono tabular-nums opacity-60">{entries.length}</span>
                </button>
              </li>
              {FREE_STACK_CATEGORIES.map((cat) => {
                const count = entries.filter((e) => e.category === cat).length;
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategory((prev) => (prev === cat ? 'All' : cat))
                      }
                      className={`flex w-full items-center justify-between text-left transition-colors hover:underline ${
                        selectedCategory === cat ? 'font-semibold text-[#D9A441]' : 'opacity-80'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      <span className="font-mono tabular-nums opacity-60">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Category Sections with Tables */}
        <div className="min-w-0 flex-1 space-y-10">
          {activeCategories.length === 0 ? (
            <div className="rounded-xl border border-current/10 p-8 text-center">
              <p className="text-sm font-medium">No services match &ldquo;{searchQuery}&rdquo;.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-3 rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226]"
              >
                Reset Search Filter
              </button>
            </div>
          ) : (
            activeCategories.map((category) => {
              const items = filteredEntries.filter((e) => e.category === category);
              return (
                <section
                  key={category}
                  id={`cat-${category.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  className="scroll-mt-6"
                >
                  <div className="mb-3 flex items-baseline justify-between border-b border-current/10 pb-2">
                    <h2 className="font-display text-lg font-semibold">{category}</h2>
                    <span className="font-mono text-xs tabular-nums opacity-65">
                      {items.length} {items.length === 1 ? 'service' : 'services'}
                    </span>
                  </div>

                  <div
                    className={`overflow-x-auto rounded-xl border ${
                      isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white'
                    }`}
                  >
                    <table className="w-full border-collapse text-left text-xs sm:text-sm">
                      <thead>
                        <tr
                          className={`border-b text-xs ${
                            isDark
                              ? 'border-white/10 bg-[#1B1F5E]/50'
                              : 'border-[#0F1226]/10 bg-[#FAF6EC]/70'
                          }`}
                        >
                          <th className="py-3 pr-3 pl-4 font-semibold">Service &amp; Description</th>
                          <th className="px-3 py-3 font-semibold">What the free tier includes</th>
                          <th className="px-3 py-3 font-semibold whitespace-nowrap">Verified On</th>
                          <th className="py-3 pr-4 pl-3 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-current/10">
                        {items.map((item) => (
                          <tr
                            key={item.id}
                            className="transition-colors hover:bg-current/[0.03]"
                          >
                            <td className="py-3.5 pr-3 pl-4 align-top">
                              <div className="font-semibold">{item.serviceName}</div>
                              {item.description && (
                                <div className="mt-0.5 text-xs opacity-75">{item.description}</div>
                              )}
                            </td>
                            <td className="px-3 py-3.5 align-top leading-relaxed opacity-90">
                              {item.freeTierSummary}
                            </td>
                            <td className="px-3 py-3.5 align-top font-mono text-xs tabular-nums whitespace-nowrap opacity-75">
                              {item.verifiedOn}
                            </td>
                            <td className="py-3.5 pr-4 pl-3 text-right align-top whitespace-nowrap">
                              <div className="inline-flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleEditRow(item)}
                                  title={`Edit ${item.serviceName} in Content Manager`}
                                  className="inline-flex items-center gap-1 text-xs font-medium opacity-75 hover:opacity-100 hover:underline"
                                >
                                  <Pencil className="h-3 w-3" />
                                  <span>Edit</span>
                                </button>
                                <a
                                  href={item.officialPricingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                                >
                                  <span>Link</span>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
