import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Layers,
  ShieldCheck,
  Database,
  Wrench,
  ExternalLink,
  Sun,
  Moon,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { AdirePattern } from './AdirePattern.tsx';
import { AgbaLogoMark, AgbaHeroBackdrop } from './AgbaLogoMark.tsx';
import { FREE_STACK_ENTRIES } from '../data/freeStackData.ts';
import { ACADEMY_TEMPLATES } from '../data/academyTemplates.ts';
import type { AcademyTemplate, FreeStackCategory, FreeStackEntry } from '../types/agba.ts';

interface MarketingLandingProps {
  onEnterStudio: () => void;
  onEnterFreeStack: (options?: { category?: FreeStackCategory | 'All'; openCms?: boolean }) => void;
  onEnterAcademy: (track?: 'All' | 'Starter' | 'RAG Tutorial' | 'Advanced Multi-Agent') => void;
  onEnterBilling: () => void;
  onEnterPublicChat: () => void;
  onOpenTemplateInStudio: (tpl: AcademyTemplate) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const MarketingLanding: React.FC<MarketingLandingProps> = ({
  onEnterStudio,
  onEnterFreeStack,
  onEnterAcademy,
  onEnterBilling,
  onEnterPublicChat,
  onOpenTemplateInStudio,
  isDark,
  onToggleTheme,
}) => {
  const [pricingCurrency, setPricingCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [previewRunning, setPreviewRunning] = useState<boolean>(true);
  const [liveFreeStack, setLiveFreeStack] = useState<FreeStackEntry[]>(FREE_STACK_ENTRIES);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/cms/free-stack')
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (payload?.data && Array.isArray(payload.data)) {
          setLiveFreeStack(payload.data);
        }
      })
      .catch(() => {
        // Fallback to local verified entries
      });
  }, []);

  const navigationMenus = [
    {
      id: 'pillars',
      label: 'Pillars',
      href: '#pillars',
      items: [
        {
          title: 'Learn — AGBA Academy',
          desc: 'Guided AI tutorials and working starter agents you can inspect and run.',
          action: () => onEnterAcademy('All'),
        },
        {
          title: 'Build — AGBA Studio',
          desc: 'Visual workflow builder with document knowledge bases and model connections.',
          action: () => onEnterStudio(),
        },
        {
          title: 'Ship — AGBA Free Stack',
          desc: `${liveFreeStack.length} verified always-free cloud, database, and DevOps services.`,
          action: () => onEnterFreeStack({ category: 'All' }),
        },
      ],
    },
    {
      id: 'studio',
      label: 'Studio',
      href: '#studio-preview',
      items: [
        {
          title: 'Visual Workflow Canvas',
          desc: 'Design multi-step AI assistants without writing backend boilerplate.',
          action: () => onEnterStudio(),
        },
        {
          title: 'Document Knowledge Base',
          desc: 'Upload PDFs, Word documents, and notes for cited, accurate answers.',
          action: () => onEnterStudio(),
        },
        {
          title: 'Shareable Chat & Website Widget',
          desc: 'Publish your assistant as a public web link or embeddable site widget.',
          action: () => onEnterPublicChat(),
        },
      ],
    },
    {
      id: 'academy',
      label: 'Academy',
      href: '#academy',
      items: [
        {
          title: 'Starter Agents',
          desc: 'Fast, practical workflows for customer support, summaries, and triage.',
          action: () => onEnterAcademy('Starter'),
        },
        {
          title: 'Document Q&A (RAG) Tutorials',
          desc: 'Step-by-step guides for assistants that answer from your own files.',
          action: () => onEnterAcademy('RAG Tutorial'),
        },
        {
          title: 'Multi-Agent Workflows',
          desc: 'Coordinate research, calculation, and verification steps in one flow.',
          action: () => onEnterAcademy('Advanced Multi-Agent'),
        },
      ],
    },
    {
      id: 'free-stack',
      label: 'Free Stack',
      href: '#free-stack',
      items: [
        {
          title: `Browse All Free Services (${liveFreeStack.length})`,
          desc: 'Explore the complete directory of verified always-free developer tiers.',
          action: () => onEnterFreeStack({ category: 'All' }),
        },
        {
          title: 'Cloud, Hosting & Edge',
          desc: 'Free web hosting, serverless compute, and background workers.',
          action: () => onEnterFreeStack({ category: 'Cloud & Compute' }),
        },
        {
          title: 'Databases & Vector Stores',
          desc: 'Always-free PostgreSQL, vector search, and document databases.',
          action: () => onEnterFreeStack({ category: 'Databases & Vector Stores' }),
        },
        {
          title: 'AI & Model APIs',
          desc: 'Free inference endpoints, embeddings, and open-weights model runners.',
          action: () => onEnterFreeStack({ category: 'AI & Model APIs' }),
        },
        {
          title: 'Content Manager (CMS Editor)',
          desc: 'Add or update Free Stack directory entries live without redeploying.',
          action: () => onEnterFreeStack({ category: 'All', openCms: true }),
        },
      ],
    },
    {
      id: 'pricing',
      label: 'Pricing',
      href: '#pricing',
      items: [
        {
          title: 'Compare Monthly Plans',
          desc: 'Transparent plans for solo builders, growing SMEs, and agencies.',
          action: () => {
            const el = document.getElementById('pricing');
            el?.scrollIntoView({ behavior: 'smooth' });
          },
        },
        {
          title: 'Workspace Billing & Quotas',
          desc: 'Switch between NGN and USD billing and manage usage alerts.',
          action: () => onEnterBilling(),
        },
      ],
    },
  ];

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDark ? 'bg-[#0E1030] text-[#FAF6EC]' : 'bg-[#FAF6EC] text-[#0F1226]'
      }`}
    >
      {/* Top Navigation Bar with Accessible Sub-Menus */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          isDark
            ? 'border-white/10 bg-[#0E1030]/95'
            : 'border-[#0F1226]/10 bg-[#FAF6EC]/95'
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-4 py-4 sm:px-6">
          {/* Zone 1: Brand Crest & Wordmark */}
          <a
            href="#top"
            className="group inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight whitespace-nowrap shrink-0"
          >
            <AgbaLogoMark size={30} />
            <span>AGBA</span>
          </a>

          {/* Zone 2: 5 Navigation Links with Rich Sub-Menus */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {navigationMenus.map((menu) => {
              const isOpen = openMenuId === menu.id;
              return (
                <div
                  key={menu.id}
                  className="relative"
                  onMouseEnter={() => setOpenMenuId(menu.id)}
                  onMouseLeave={() => setOpenMenuId(null)}
                >
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(isOpen ? null : menu.id)}
                    aria-expanded={isOpen}
                    className="inline-flex items-center gap-1 py-1 opacity-85 hover:opacity-100 transition-opacity whitespace-nowrap shrink-0"
                  >
                    <span>{menu.label}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-150 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="absolute top-full left-0 z-40 w-80 pt-2">
                      <div
                        className={`rounded-xl border p-2 shadow-lg ${
                          isDark
                            ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                            : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                        }`}
                      >
                        {menu.items.map((sub) => (
                          <button
                            key={sub.title}
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              sub.action();
                            }}
                            className="flex w-full flex-col rounded-lg p-2.5 text-left transition-colors hover:bg-current/5"
                          >
                            <span className="text-xs font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                              {sub.title}
                            </span>
                            <span className="mt-0.5 text-[11px] leading-snug opacity-80">
                              {sub.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Zone 3: Theme Toggle & Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-2.5 py-2 text-xs font-medium hover:bg-current/5 whitespace-nowrap shrink-0"
            >
              {isDark ? (
                <Sun className="h-3.5 w-3.5 text-[#D9A441]" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              type="button"
              onClick={onEnterStudio}
              className="rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] transition-colors duration-150 hover:bg-[#c89332] whitespace-nowrap shrink-0"
            >
              Start building free
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Toggle mobile menu"
              className="rounded-lg border border-current/15 p-2 md:hidden"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Expandable Sub-Menu Drawer */}
        {mobileNavOpen && (
          <div
            className={`border-t px-4 py-4 md:hidden ${
              isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
            }`}
          >
            <div className="space-y-4">
              {navigationMenus.map((menu) => (
                <div key={menu.id} className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-65">
                    {menu.label}
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {menu.items.map((sub) => (
                      <button
                        key={sub.title}
                        type="button"
                        onClick={() => {
                          setMobileNavOpen(false);
                          sub.action();
                        }}
                        className={`rounded-lg border p-2.5 text-left ${
                          isDark
                            ? 'border-white/10 bg-[#1B1F5E]/40'
                            : 'border-[#0F1226]/10 bg-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">{sub.title}</div>
                        <div className="mt-0.5 text-[11px] opacity-75">{sub.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* SECTION 1: HERO (with bespoke Adire texture + ambient Àgbà Wisdom Tapestry in background) */}
      <section
        id="top"
        className={`relative overflow-hidden border-b py-20 md:py-28 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <AdirePattern opacity={0.05} />
        <AgbaHeroBackdrop isDark={isDark} />

        <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium opacity-80">
              Built in Lagos by Trendtactics Digital · AI Learning, Building &amp; Shipping Platform
            </p>
            <h1
              className="font-display mt-3 text-[36px] leading-[1.12] font-bold tracking-tight sm:text-[44px] lg:text-[56px]"
              style={{ textWrap: 'balance' }}
            >
              Build AI the wise way.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed opacity-90 sm:text-lg">
              Every community has an <em>àgbà</em> — the elder who has seen it before and shows you
              the way. AGBA puts learning, visual building, and verified always-free deployment
              tools in one calm workspace so you can ship real AI apps with your own model keys.
            </p>

            {/* Primary & Secondary CTAs (Max 2 visible at once) */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onEnterStudio}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D9A441] px-6 py-3 text-sm font-semibold text-[#0F1226] transition-colors duration-150 hover:bg-[#c89332] whitespace-nowrap shrink-0"
              >
                <span>Start building free</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onEnterFreeStack({ category: 'All' })}
                className={`inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  isDark
                    ? 'border-[#FAF6EC]/30 text-[#FAF6EC] hover:bg-white/5'
                    : 'border-[#0F1226]/30 text-[#0F1226] hover:bg-[#0F1226]/5'
                }`}
              >
                <span>Explore the Free Stack</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE PROBLEM */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold opacity-70">01. The Challenge</div>
          <h2
            className="font-display mt-2 text-2xl font-bold sm:text-[32px]"
            style={{ textWrap: 'balance' }}
          >
            Good ideas stall when tools are scattered and cloud bills surprise you.
          </h2>
          <p className="mt-4 text-base leading-relaxed opacity-85">
            AI tools are scattered across dozens of sites, tutorials assume you already know the
            answer, and hidden platform markups drain budgets before your first user arrives.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              num: '01',
              title: 'Fragmented Subscriptions',
              body: 'Builders juggle separate logins for prompt testing, vector databases, authentication, and webhooks before launching a single assistant.',
            },
            {
              num: '02',
              title: 'Tutorials That Stop Too Early',
              body: 'Most examples skip workspace privacy, key protection, and document citations — leaving founders stuck when moving to production.',
            },
            {
              num: '03',
              title: 'Opaque API Key Markups',
              body: 'Closed platforms lock you into bundled token credits instead of letting you bring your own Gemini, OpenAI, Anthropic, or local Llama keys.',
            },
          ].map((item) => (
            <div
              key={item.num}
              className={`rounded-xl border p-6 ${
                isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div className="font-mono text-xs font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                {item.num}.
              </div>
              <h3 className="font-display mt-2 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed opacity-85">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={onEnterStudio}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
          >
            <span>See how AGBA unifies your stack</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* SECTION 3: THREE PILLARS (Learn / Build / Ship) */}
      <section
        id="pillars"
        className={`border-y py-16 md:py-24 ${
          isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white/60'
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold opacity-70">02. Three Pillars</div>
            <h2
              className="font-display mt-2 text-2xl font-bold sm:text-[32px]"
              style={{ textWrap: 'balance' }}
            >
              Three pillars under one roof: Learn, Build, and Ship.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div
              className={`flex flex-col justify-between rounded-xl border p-6 ${
                isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs opacity-75">
                  <BookOpen className="h-4 w-4 text-[#D9A441]" />
                  <span>Pillar 01 · AGBA Academy</span>
                </div>
                <h3 className="font-display mt-3 text-2xl font-semibold">Learn</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-85">
                  Step-by-step tutorials and working starter agents. Inspect every prompt and step,
                  run with hosted models or local Llama via Ollama, and import into your workspace in
                  one click.
                </p>
              </div>
              <div className="mt-6 border-t border-current/10 pt-4 font-mono text-xs opacity-75">
                {ACADEMY_TEMPLATES.length} interactive templates ready
              </div>
            </div>

            <div
              className={`flex flex-col justify-between rounded-xl border p-6 ${
                isDark ? 'border-[#D9A441]/50 bg-[#0E1030]' : 'border-[#3B3FA8] bg-[#FAF6EC]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs opacity-75">
                  <Cpu className="h-4 w-4 text-[#D9A441]" />
                  <span>Pillar 02 · AGBA Studio</span>
                </div>
                <h3 className="font-display mt-3 text-2xl font-semibold">Build</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-85">
                  Connect your own API keys, upload PDFs and Word documents to your private
                  workspace knowledge base, retrieve cited answers, and attach safe tools like
                  calculators and web search.
                </p>
              </div>
              <div className="mt-6 border-t border-current/10 pt-4 font-mono text-xs opacity-75">
                Visual workflows · Bring your own keys
              </div>
            </div>

            <div
              className={`flex flex-col justify-between rounded-xl border p-6 ${
                isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs opacity-75">
                  <Layers className="h-4 w-4 text-[#D9A441]" />
                  <span>Pillar 03 · AGBA Free Stack</span>
                </div>
                <h3 className="font-display mt-3 text-2xl font-semibold">Ship</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-85">
                  Publish your Studio workflow as a shareable chat page, website widget, or API
                  endpoint — backed by our verified directory of always-free cloud, database, and
                  monitoring tiers.
                </p>
              </div>
              <div className="mt-6 border-t border-current/10 pt-4 font-mono text-xs opacity-75">
                {liveFreeStack.length} verified free-tier services
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={onEnterStudio}
              className="rounded-lg bg-[#D9A441] px-5 py-2.5 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332]"
            >
              Start building free
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 4: STUDIO PREVIEW */}
      <section id="studio-preview" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-semibold opacity-70">03. AGBA Studio Preview</div>
            <h2 className="font-display mt-2 text-2xl font-bold sm:text-[32px]">
              Visual workflows designed for clarity, citations, and team privacy.
            </h2>
            <p className="mt-2 max-w-2xl text-sm opacity-85">
              Three-pane workspace: choose building blocks on the left, connect your flow in the
              center, and fine-tune instructions and citations on the right.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewRunning((r) => !r)}
              className="rounded-lg border border-current/20 px-3.5 py-2 text-xs font-medium hover:bg-current/5 whitespace-nowrap shrink-0"
            >
              {previewRunning ? 'Pause Flow Preview' : 'Play Flow Preview'}
            </button>
            <button
              type="button"
              onClick={onEnterStudio}
              className="rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] whitespace-nowrap shrink-0"
            >
              Open Studio Workspace
            </button>
          </div>
        </div>

        {/* Live Studio Interactive Preview Frame */}
        <div
          className={`overflow-hidden rounded-xl border ${
            isDark ? 'border-white/15 bg-[#1B1F5E]/30' : 'border-[#0F1226]/15 bg-white'
          }`}
        >
          <div
            className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs ${
              isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <span>Workflow: SME Policy &amp; Compliance Assistant</span>
              <span aria-hidden="true">·</span>
              <span className="opacity-75">Trendtactics Digital Workspace</span>
            </div>
            <div className="text-[11px] opacity-75">
              Private Knowledge Base · Cited Responses · Ready to Publish
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-12">
            <div className="flex flex-col justify-center gap-4 lg:col-span-8">
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                {[
                  {
                    step: '01',
                    title: 'Document Upload',
                    sub: 'PDF, Word & Markdown files',
                    icon: <Database className="h-4 w-4 text-[#D9A441]" />,
                  },
                  {
                    step: '02',
                    title: 'Knowledge Retrieval',
                    sub: 'Finds relevant passages',
                    icon: <ShieldCheck className="h-4 w-4 text-[#2E8B57]" />,
                  },
                  {
                    step: '03',
                    title: 'Grounded Answer',
                    sub: 'Replies with source citations',
                    icon: <Wrench className="h-4 w-4 text-[#3B3FA8] dark:text-[#D9A441]" />,
                  },
                ].map((n, idx) => (
                  <React.Fragment key={n.step}>
                    <div
                      className={`flex-1 rounded-xl border p-4 ${
                        previewRunning && idx === 1 ? 'agba-node-executing' : ''
                      } ${
                        isDark
                          ? 'border-white/15 bg-[#0E1030]'
                          : 'border-[#0F1226]/15 bg-[#FAF6EC]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold">{n.step}</span>
                        {n.icon}
                      </div>
                      <div className="font-display mt-2 text-sm font-semibold">{n.title}</div>
                      <div className="mt-1 text-[11px] opacity-75">{n.sub}</div>
                    </div>
                    {idx < 2 && (
                      <svg
                        className="mx-auto h-6 w-6 rotate-90 sm:h-6 sm:w-10 sm:rotate-0 shrink-0"
                        viewBox="0 0 40 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <line
                          x1="0"
                          y1="12"
                          x2="32"
                          y2="12"
                          stroke="#D9A441"
                          strokeWidth="2"
                          className={previewRunning ? 'agba-flow-active' : ''}
                        />
                        <polygon points="30,7 40,12 30,17" fill="#D9A441" />
                      </svg>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 text-xs lg:col-span-4 ${
                isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
              }`}
            >
              <div className="font-semibold">Cited Output Preview</div>
              <p className="mt-2 leading-relaxed opacity-85">
                &ldquo;All merchant settlements are verified automatically and recorded in your
                chosen workspace currency (NGN or USD) with duplicate-event protection.&rdquo;
              </p>
              <div className="mt-3 border-t border-current/10 pt-2 font-mono text-[11px] opacity-75">
                Source: [Lagos_SME_Settlement_Guide.pdf]
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: ACADEMY AND TEMPLATES */}
      <section
        id="academy"
        className={`border-t py-16 md:py-24 ${
          isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white/60'
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-semibold opacity-70">04. AGBA Academy &amp; Templates</div>
              <h2 className="font-display mt-2 text-2xl font-bold sm:text-[32px]">
                Start from working agents, not blank screens.
              </h2>
              <p className="mt-2 max-w-2xl text-sm opacity-85">
                Starter workflows, document Q&amp;A pipelines, and multi-agent templates compatible
                with both hosted API keys and local Llama via Ollama.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEnterAcademy('All')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
            >
              <span>Browse all {ACADEMY_TEMPLATES.length} Academy templates</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ACADEMY_TEMPLATES.slice(0, 4).map((tpl, idx) => (
              <div
                key={tpl.id}
                className={`flex flex-col justify-between rounded-xl border p-5 ${
                  isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                }`}
              >
                <div>
                  <div className="text-xs opacity-70">
                    <span className="font-mono">0{idx + 1}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{tpl.track}</span>
                  </div>
                  <h3 className="font-display mt-2 text-lg font-semibold">{tpl.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed opacity-85">{tpl.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTemplateInStudio(tpl)}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                >
                  <span>Open in Studio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: FREE STACK TEASER (Live count from real data) */}
      <section id="free-stack" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24">
        <div
          className={`rounded-2xl border p-6 sm:p-10 ${
            isDark ? 'border-white/15 bg-[#1B1F5E]/40' : 'border-[#0F1226]/15 bg-white'
          }`}
        >
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
                <span>05. AGBA Free Stack Directory</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                  Live Directory Count: {liveFreeStack.length} Verified Services
                </span>
              </div>
              <h2 className="font-display mt-2 text-2xl font-bold sm:text-[32px]">
                Ship with tools that cost nothing to start.
              </h2>
              <p className="mt-3 text-sm leading-relaxed opacity-85">
                We independently research and verify always-free tiers across compute, vector
                databases, authentication, CI/CD, DNS, and notifications — written in clear prose
                with direct official pricing links and live CMS updates.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onEnterFreeStack({ category: 'All', openCms: true })}
                className="inline-flex items-center gap-2 rounded-lg border border-current/20 px-4 py-3 text-xs font-semibold hover:bg-current/5 whitespace-nowrap"
              >
                <span>Manage Entries (CMS)</span>
              </button>
              <button
                type="button"
                onClick={() => onEnterFreeStack({ category: 'All' })}
                className="inline-flex items-center gap-2 rounded-lg bg-[#D9A441] px-6 py-3 text-sm font-semibold text-[#0F1226] hover:bg-[#c89332] whitespace-nowrap"
              >
                <span>Explore the Free Stack ({liveFreeStack.length})</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Preview slice of 4 live entries */}
          <div className="mt-8 overflow-x-auto border-t border-current/10 pt-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-current/10 opacity-70">
                  <th className="py-2 pr-3">Service</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">What the free tier includes</th>
                  <th className="py-2 pl-3 text-right">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/10">
                {liveFreeStack.slice(0, 4).map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-3 font-semibold whitespace-nowrap">
                      <a
                        href={entry.officialPricingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <span>{entry.serviceName}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap opacity-75">{entry.category}</td>
                    <td className="px-3 py-3 opacity-90">{entry.freeTierSummary}</td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums whitespace-nowrap opacity-75">
                      {entry.verifiedOn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 7: PRICING */}
      <section
        id="pricing"
        className={`border-t py-16 md:py-24 ${
          isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white/60'
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-semibold opacity-70">06. Transparent Pricing</div>
              <h2 className="font-display mt-2 text-2xl font-bold sm:text-[32px]">
                Pay only for workspace scale. Bring your own model keys.
              </h2>
              <p className="mt-2 text-sm opacity-85">
                Monthly plans billed in NGN or USD. Prices display{' '}
                <span className="font-mono">[PRICE_TBD]</span> until finalized by the owner.
              </p>
            </div>

            <div
              className={`inline-flex rounded-lg border p-1 self-start ${
                isDark ? 'border-white/15 bg-[#0E1030]' : 'border-[#0F1226]/15 bg-[#FAF6EC]'
              }`}
            >
              {(['NGN', 'USD'] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setPricingCurrency(curr)}
                  className={`rounded-md px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    pricingCurrency === curr
                      ? 'bg-[#D9A441] text-[#0F1226]'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: 'Free',
                subtitle: 'For students & individual builders getting started',
                price: `${pricingCurrency} [PRICE_TBD] / month`,
                features: [
                  '1 dedicated workspace',
                  'Bring-Your-Own-Key connections (Gemini, OpenAI, Anthropic, Mistral, Ollama)',
                  '3 Studio workflows & 50 MB document storage',
                  'Full AGBA Free Stack & Academy access',
                ],
              },
              {
                tier: 'Builder',
                subtitle: 'For founders & SMEs shipping production AI workflows',
                price: `${pricingCurrency} [PRICE_TBD] / month`,
                features: [
                  'Up to 5 team members with role permissions',
                  '25 Studio apps + shareable chat pages & REST endpoints',
                  '2 GB private vector knowledge base storage',
                  'Automated quota & workflow-failure notifications',
                ],
              },
              {
                tier: 'Team',
                subtitle: 'For agencies & multi-workspace engineering teams',
                price: `${pricingCurrency} [PRICE_TBD] / month`,
                features: [
                  'Multi-workspace agency management & activity logs',
                  '10 GB vector knowledge base & priority document indexing',
                  'Custom allowlisted web tools & rate limits',
                  'Multi-channel SMS, email, and in-app team alerts',
                ],
              },
            ].map((plan, idx) => (
              <div
                key={plan.tier}
                className={`flex flex-col justify-between rounded-xl border p-6 ${
                  idx === 1
                    ? isDark
                      ? 'border-[#D9A441] bg-[#0E1030]'
                      : 'border-[#3B3FA8] bg-[#FAF6EC]'
                    : isDark
                      ? 'border-white/10 bg-[#0E1030]'
                      : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                }`}
              >
                <div>
                  <div className="text-xs opacity-75">{plan.subtitle}</div>
                  <h3 className="font-display mt-1 text-2xl font-bold">{plan.tier}</h3>
                  <div className="mt-4 border-y border-current/10 py-3 font-mono text-lg font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                    {plan.price}
                  </div>
                  <ul className="mt-4 space-y-2.5 text-xs leading-relaxed">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2E8B57] dark:text-[#D9A441]" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={onEnterStudio}
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
                    idx === 1
                      ? 'bg-[#D9A441] text-[#0F1226] hover:bg-[#c89332]'
                      : 'border border-current/25 hover:bg-current/5'
                  }`}
                >
                  Start building free
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: PROOF SECTION */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold opacity-70">07. Verifiable Proof</div>
          <h2 className="font-display mt-2 text-2xl font-bold sm:text-[32px]">
            Real outcomes only — zero fabricated benchmarks.
          </h2>
          <p className="mt-2 text-sm opacity-85">
            We publish only verified customer outcomes and real production benchmarks. Placeholders
            remain below until verified workspace metrics are published by Trendtactics Digital.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              label: 'Time from Sign-Up to Deployed Assistant',
              metric: '[PROOF: real metric needed]',
              context: 'Target benchmark: under 15 minutes from template selection to live chat link.',
            },
            {
              label: 'SME & Student Builders Onboarded',
              metric: '[PROOF: real metric needed]',
              context: 'Reserved for verified workspace cohort metrics from Trendtactics Digital.',
            },
            {
              label: 'Named Customer Case Study & Outcome',
              metric: '[PROOF: real metric needed]',
              context: 'Reserved for attributable founder or agency story with verified results.',
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border p-6 ${
                isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div className="text-xs font-semibold opacity-75">{item.label}</div>
              <div className="mt-3 font-mono text-sm font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                {item.metric}
              </div>
              <p className="mt-2 text-xs leading-relaxed opacity-75">{item.context}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 9: FAQ */}
      <section
        id="faq"
        className={`border-t py-16 md:py-24 ${
          isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white/60'
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold opacity-70">08. Frequently Asked Questions</div>
            <h2 className="font-display mt-2 text-2xl font-bold sm:text-[32px]">
              Clear answers before you build.
            </h2>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[
              {
                q: 'How are my Bring-Your-Own-Key (BYOK) model API keys protected?',
                a: 'Your keys are encrypted at rest on the server and decrypted only in memory when a workflow runs. They are never exposed in the browser and always appear masked showing only the last 4 characters.',
              },
              {
                q: 'Can another team or workspace see my uploaded documents?',
                a: 'No. Every uploaded file and knowledge base passage belongs strictly to your workspace. Other workspaces cannot search, view, or retrieve your documents.',
              },
              {
                q: 'Can I run AGBA templates with local open-weights models like Llama?',
                a: 'Yes. Every Academy template supports both hosted model providers (Google Gemini, OpenAI, Anthropic, Mistral) and local Ollama endpoints.',
              },
              {
                q: 'How do I update or add services to the AGBA Free Stack?',
                a: 'Open the Free Stack Directory and click "Manage & Add Entries (CMS)". You can add new services, edit descriptions, or refresh verification dates live without redeploying the app.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className={`rounded-xl border p-6 ${
                  isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                }`}
              >
                <h3 className="font-display text-base font-semibold">{item.q}</h3>
                <p className="mt-2 text-xs leading-relaxed opacity-85">{item.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <button
              type="button"
              onClick={onEnterStudio}
              className="rounded-lg bg-[#D9A441] px-6 py-3 text-sm font-semibold text-[#0F1226] hover:bg-[#c89332]"
            >
              Start building free
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 10: FOOTER */}
      <footer
        className={`relative overflow-hidden border-t py-14 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <AdirePattern opacity={0.05} />
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-2.5 font-display text-xl font-bold">
                <AgbaLogoMark size={28} />
                <span>AGBA</span>
              </div>
              <p className="mt-1.5 text-xs opacity-80">
                Learn AI, build visual workflows with your own keys, and ship on the verified Free Stack.
              </p>
              <p className="mt-2 text-xs font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                Built in Lagos by Trendtactics Digital
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
              <button type="button" onClick={onEnterStudio} className="hover:underline">
                Studio Workspace
              </button>
              <button
                type="button"
                onClick={() => onEnterFreeStack({ category: 'All' })}
                className="hover:underline"
              >
                Free Stack ({liveFreeStack.length})
              </button>
              <button type="button" onClick={() => onEnterAcademy('All')} className="hover:underline">
                Academy
              </button>
              <a href="#pricing" className="hover:underline">
                Pricing
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
