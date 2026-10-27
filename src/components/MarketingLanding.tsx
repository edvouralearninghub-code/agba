import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Lock,
  Play,
  Pause,
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
  onEnterSettings?: () => void;
  onEnterAuth?: (mode?: 'signin' | 'signup') => void;
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
  onEnterSettings,
  onEnterAuth,
  onEnterPublicChat,
  onOpenTemplateInStudio,
  isDark,
  onToggleTheme,
}) => {
  const [pricingCurrency, setPricingCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [previewRunning, setPreviewRunning] = useState<boolean>(true);
  const [activeJourneyStep, setActiveJourneyStep] = useState<0 | 1 | 2>(0);
  const [activePreviewNode, setActivePreviewNode] = useState<number>(1);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<
    'All' | 'Studio & AI' | 'Security & Privacy' | 'Publishing & Stack'
  >('All');
  const [liveFreeStack, setLiveFreeStack] = useState<FreeStackEntry[]>(FREE_STACK_ENTRIES);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [heroPrompt, setHeroPrompt] = useState<string>('');

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

  // Cycle active node in the live Studio infographic when previewRunning is true
  useEffect(() => {
    if (!previewRunning) return;
    const timer = setInterval(() => {
      setActivePreviewNode((prev) => (prev + 1) % 3);
    }, 2200);
    return () => clearInterval(timer);
  }, [previewRunning]);

  // Compute category distribution for the Free Stack visual bar infographic
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of liveFreeStack) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, count]) => ({
        category: cat as FreeStackCategory,
        count,
        pct: Math.round((count / Math.max(1, liveFreeStack.length)) * 100),
      }));
  }, [liveFreeStack]);

  const journeySteps = [
    {
      num: '01',
      verb: 'Learn',
      module: 'AGBA Academy',
      headline: 'Pick a working AI agent template',
      summary: `Choose from ${ACADEMY_TEMPLATES.length} ready-to-run workflows (Document Q&A, CSV Analyst, Support Triage, Podcast Producer) and inspect every step.`,
      ctaLabel: 'Browse Academy Templates',
      action: () => onEnterAcademy('All'),
      metric: `${ACADEMY_TEMPLATES.length} Templates`,
    },
    {
      num: '02',
      verb: 'Build',
      module: 'AGBA Studio',
      headline: 'Connect your keys & private files',
      summary:
        'Attach your own Gemini, OpenAI, Claude, Mistral, or local Ollama keys, drop in PDFs/DOCX files, and test cited answers on the visual canvas.',
      ctaLabel: 'Open Visual Studio',
      action: () => onEnterStudio(),
      metric: '5 Model Providers',
    },
    {
      num: '03',
      verb: 'Ship',
      module: 'Free Stack & Publish',
      headline: 'Publish a shareable link or REST API',
      summary: `Launch your assistant as a public chat page or webhook backed by ${liveFreeStack.length} verified always-free cloud, database, and DevOps tiers.`,
      ctaLabel: 'Explore Free Stack',
      action: () => onEnterFreeStack({ category: 'All' }),
      metric: `${liveFreeStack.length} Free Services`,
    },
  ];

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
    {
      id: 'settings',
      label: 'Workspace',
      href: '#settings',
      items: [
        {
          title: 'Connect Your AI Key',
          desc: 'Connect your own Gemini, OpenAI, Claude, Mistral, or local Ollama model.',
          action: () => (onEnterSettings ? onEnterSettings() : onEnterStudio()),
        },
        {
          title: 'Team Workspaces',
          desc: 'Create or switch project workspaces for your team or clients.',
          action: () => (onEnterSettings ? onEnterSettings() : onEnterStudio()),
        },
      ],
    },
  ];

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#0E1030] text-[#FAF6EC]' : 'bg-[#FAF6EC] text-[#0F1226]'
      }`}
    >
      {/* Top Navigation Bar */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          isDark
            ? 'border-white/10 bg-[#0E1030]/95'
            : 'border-[#0F1226]/10 bg-[#FAF6EC]/95'
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 md:gap-8 md:py-4">
          <a
            href="#top"
            className="group inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 sm:gap-2.5 sm:text-xl"
          >
            <AgbaLogoMark size={28} />
            <span>AGBA</span>
          </a>

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

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 p-2 sm:px-2.5 sm:py-2 text-xs font-medium hover:bg-current/5 whitespace-nowrap shrink-0"
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
              onClick={() => (onEnterAuth ? onEnterAuth('signin') : onEnterStudio())}
              className="inline-flex items-center rounded-lg border border-current/20 px-3 py-2 text-xs font-semibold transition-colors hover:bg-current/5 whitespace-nowrap shrink-0"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => (onEnterAuth ? onEnterAuth('signup') : onEnterStudio())}
              className="rounded-lg bg-[#D9A441] px-2.5 py-2 sm:px-4 text-xs font-semibold text-[#0F1226] transition-colors duration-150 hover:bg-[#c89332] whitespace-nowrap shrink-0"
            >
              <span className="sm:hidden">Sign Up</span>
              <span className="hidden sm:inline">Start building free</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Toggle mobile menu"
              className="inline-flex items-center justify-center rounded-lg border border-current/15 p-2 md:hidden shrink-0"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div
            className={`border-t px-4 py-4 md:hidden ${
              isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
            }`}
          >
            <div className="space-y-4">
              {navigationMenus.map((menu) => (
                <div key={menu.id} className="space-y-1.5">
                  <div className="text-xs font-semibold opacity-65">{menu.label}</div>
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

      {/* SECTION 1: CINEMATIC HERO + INTERACTIVE 3-STEP "LEARN -> BUILD -> SHIP" LAUNCHER */}
      <section
        id="top"
        className={`relative overflow-hidden border-b py-20 md:py-28 lg:py-32 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <AdirePattern opacity={0.05} />
        <AgbaHeroBackdrop isDark={isDark} />

        <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="max-w-3xl"
          >
            <p className="text-xs font-medium opacity-80">
              Full-Stack AI App Builder &amp; Cloud Workspace · Built by Trendtactics Digital
            </p>
            <h1
              className="font-display mt-4 text-[36px] leading-[1.12] font-bold tracking-tight sm:text-[46px] lg:text-[56px]"
              style={{ textWrap: 'balance' }}
            >
              Create, train, and publish your AI assistant in 60 seconds.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed opacity-90 sm:text-lg">
              Upload your PDFs or docs, connect your Gemini/OpenAI/Claude key, test your AI workflow live, and ship a shareable chat link or REST API—all in one workspace.
            </p>

            {/* Interactive Action-First Prompt Launcher (Spaced down for generous breathing room) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = heroPrompt.trim().toLowerCase();
                const matched =
                  ACADEMY_TEMPLATES.find(
                    (t) =>
                      q &&
                      (t.title.toLowerCase().includes(q) ||
                        t.summary.toLowerCase().includes(q))
                  ) || ACADEMY_TEMPLATES[0];
                if (q && matched) {
                  onOpenTemplateInStudio({
                    ...matched,
                    title: heroPrompt.trim().slice(0, 64),
                  });
                } else {
                  onEnterStudio();
                }
              }}
              className={`mt-10 sm:mt-12 md:mt-14 rounded-2xl border p-4 sm:p-5 shadow-lg backdrop-blur-md ${
                isDark
                  ? 'border-white/20 bg-[#1B1F5E]/85'
                  : 'border-[#0F1226]/20 bg-white/95'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={heroPrompt}
                  onChange={(e) => setHeroPrompt(e.target.value)}
                  placeholder="What do you want to build? e.g. 'Customer support bot trained on my company PDF' or 'Website SEO auditor'..."
                  className={`flex-1 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#0E1030]/90 text-[#FAF6EC] placeholder:text-[#FAF6EC]/50'
                      : 'bg-[#FAF6EC] text-[#0F1226] placeholder:text-[#0F1226]/50'
                  }`}
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D9A441] px-6 py-3 text-xs sm:text-sm font-semibold text-[#0F1226] transition-colors duration-150 hover:bg-[#c89332] whitespace-nowrap shrink-0"
                >
                  <span>Build &amp; Run App</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* 4 Instant 1-Click Task Starters */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 px-1 text-[11px]">
                <span className="opacity-65 mr-1">Or start with 1 click:</span>
                {[
                  { label: 'Chat with a PDF / Document', tplIdx: 0 },
                  { label: 'Customer Support Triage Bot', tplIdx: 1 },
                  { label: 'Financial & CSV Analyst', tplIdx: 2 },
                  { label: 'Browse 225 Free Cloud Tools', isFreeStack: true },
                ].map((quick) => (
                  <button
                    key={quick.label}
                    type="button"
                    onClick={() => {
                      if (quick.isFreeStack) {
                        onEnterFreeStack({ category: 'All' });
                      } else {
                        const tpl = ACADEMY_TEMPLATES[quick.tplIdx ?? 0] || ACADEMY_TEMPLATES[0];
                        onOpenTemplateInStudio(tpl);
                      }
                    }}
                    className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${
                      isDark
                        ? 'border-white/15 bg-[#0E1030]/60 hover:border-[#D9A441] hover:text-[#D9A441]'
                        : 'border-[#0F1226]/15 bg-[#FAF6EC]/80 hover:border-[#3B3FA8] hover:text-[#3B3FA8]'
                    }`}
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
            </form>
          </motion.div>

          {/* Interactive 3-Step Journey Infographic Strip (Spaced down for breathing room) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="mt-16 sm:mt-20 md:mt-24 grid gap-6 md:grid-cols-3"
          >
            {journeySteps.map((step, idx) => {
              const isSelected = activeJourneyStep === idx;
              return (
                <div
                  key={step.num}
                  onMouseEnter={() => setActiveJourneyStep(idx as 0 | 1 | 2)}
                  onClick={() => setActiveJourneyStep(idx as 0 | 1 | 2)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveJourneyStep(idx as 0 | 1 | 2);
                    }
                  }}
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-6 backdrop-blur-md transition-all duration-200 ${
                    isSelected
                      ? isDark
                        ? 'border-[#D9A441] bg-[#1B1F5E]/80 shadow-lg'
                        : 'border-[#3B3FA8] bg-white/95 shadow-lg'
                      : isDark
                        ? 'border-white/15 bg-[#0E1030]/75 hover:border-white/30'
                        : 'border-[#0F1226]/15 bg-white/75 hover:border-[#0F1226]/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#3B3FA8] dark:text-[#D9A441]">
                        STEP {step.num} · {step.verb.toUpperCase()}
                      </span>
                      <span className="font-mono text-[11px] opacity-75">{step.metric}</span>
                    </div>
                    <h2 className="font-display mt-2 text-lg font-bold">{step.headline}</h2>
                    <p className="mt-1.5 text-xs leading-relaxed opacity-85">{step.summary}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-current/10 pt-3">
                    <span className="text-[11px] opacity-70">{step.module}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        step.action();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
                    >
                      <span>{step.ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: VISUAL ARCHITECTURE INFOGRAPHIC (Replaces Wordy "Challenge" Text Blocks) */}
      <section id="pillars" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-semibold opacity-70">01. Visual Architecture Infographic</div>
            <h2
              className="font-display mt-1.5 text-2xl font-bold sm:text-[32px]"
              style={{ textWrap: 'balance' }}
            >
              Five scattered subscriptions unified into one sovereign pipeline.
            </h2>
          </div>
          <button
            type="button"
            onClick={onEnterStudio}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
          >
            <span>Open live Studio pipeline</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Animated Convergence Infographic */}
        <div
          className={`mt-8 rounded-2xl border p-6 sm:p-8 ${
            isDark ? 'border-white/15 bg-[#1B1F5E]/25' : 'border-[#0F1226]/15 bg-white'
          }`}
        >
          <div className="grid items-center gap-6 lg:grid-cols-12">
            {/* Left Column: 4 Inputs (Templates, BYOK Keys, Private Docs, Safe Tools) */}
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
              {[
                {
                  code: '01',
                  label: 'Academy Starter Agents',
                  detail: `${ACADEMY_TEMPLATES.length} inspectable templates · Hosted & Ollama`,
                  icon: <BookOpen className="h-4 w-4 text-[#D9A441]" />,
                },
                {
                  code: '02',
                  label: 'AES-256-GCM BYOK Vault',
                  detail: 'Gemini · OpenAI · Claude · Mistral · Local Llama',
                  icon: <Lock className="h-4 w-4 text-[#2E8B57]" />,
                },
                {
                  code: '03',
                  label: 'Multi-Dimension pgvector RLS',
                  detail: '768 / 1024 / 1536 vectors · Tenant isolated',
                  icon: <Database className="h-4 w-4 text-[#3B3FA8] dark:text-[#D9A441]" />,
                },
                {
                  code: '04',
                  label: 'Allowlisted Agent Tools',
                  detail: 'Calculator · Web Search · SSRF-Filtered Webhooks',
                  icon: <Wrench className="h-4 w-4 text-[#C9821B]" />,
                },
              ].map((node, i) => (
                <motion.div
                  key={node.code}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                  className={`flex items-center justify-between rounded-xl border p-3.5 ${
                    isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{node.icon}</div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{node.label}</div>
                      <div className="truncate font-mono text-[11px] opacity-75">{node.detail}</div>
                    </div>
                  </div>
                  <span className="ml-2 font-mono text-[11px] opacity-55">{node.code}</span>
                </motion.div>
              ))}
            </div>

            {/* Center Animated SVG Conduit */}
            <div className="flex flex-col items-center justify-center lg:col-span-2">
              <svg
                className="h-16 w-40 rotate-90 lg:h-48 lg:w-full lg:rotate-0"
                viewBox="0 0 120 160"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M 4 24 C 60 24, 60 80, 112 80"
                  stroke="#D9A441"
                  strokeWidth="1.75"
                  strokeOpacity="0.65"
                  className="agba-flow-active"
                />
                <path
                  d="M 4 60 C 60 60, 60 80, 112 80"
                  stroke="#3B3FA8"
                  strokeWidth="1.75"
                  strokeOpacity="0.7"
                  className="agba-flow-active"
                />
                <path
                  d="M 4 100 C 60 100, 60 80, 112 80"
                  stroke="#2E8B57"
                  strokeWidth="1.75"
                  strokeOpacity="0.7"
                  className="agba-flow-active"
                />
                <path
                  d="M 4 136 C 60 136, 60 80, 112 80"
                  stroke="#D9A441"
                  strokeWidth="1.75"
                  strokeOpacity="0.65"
                  className="agba-flow-active"
                />
                <circle cx="112" cy="80" r="5" fill="#D9A441" />
              </svg>
            </div>

            {/* Right Column: Unified AGBA Core & Outputs */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className={`rounded-2xl border p-5 lg:col-span-5 ${
                isDark ? 'border-[#D9A441]/60 bg-[#0E1030]' : 'border-[#3B3FA8] bg-[#FAF6EC]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 font-display text-base font-bold">
                  <AgbaLogoMark size={24} />
                  <span>AGBA Unified Workspace</span>
                </div>
                <span className="font-mono text-[11px] text-[#2E8B57] dark:text-[#D9A441]">
                  Live Cloud Ready
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-white'
                  }`}
                >
                  <div className="font-mono text-lg font-bold text-[#3B3FA8] dark:text-[#D9A441]">
                    {ACADEMY_TEMPLATES.length}
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-80">Starter Agents</div>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-white'
                  }`}
                >
                  <div className="font-mono text-lg font-bold text-[#3B3FA8] dark:text-[#D9A441]">
                    0%
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-80">Token Markup</div>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-white'
                  }`}
                >
                  <div className="font-mono text-lg font-bold text-[#3B3FA8] dark:text-[#D9A441]">
                    {liveFreeStack.length}
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-80">Free-Tier Tools</div>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-current/10 pt-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="opacity-80">Public Shareable Chat URL</span>
                  <span className="font-mono text-[11px] text-[#2E8B57] dark:text-[#D9A441]">
                    /chat/:workspace/:appId
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="opacity-80">Production REST Webhook</span>
                  <span className="font-mono text-[11px] text-[#2E8B57] dark:text-[#D9A441]">
                    POST /api/v1/workspaces/:id
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 3: INTERACTIVE STUDIO ANIMATED FLOW PREVIEW */}
      <section
        id="studio-preview"
        className={`border-y py-16 md:py-20 ${
          isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white/60'
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-semibold opacity-70">02. Interactive Studio Motion</div>
              <h2 className="font-display mt-1.5 text-2xl font-bold sm:text-[32px]">
                Watch a cited RAG workflow execute step by step.
              </h2>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewRunning((r) => !r)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3.5 py-2 text-xs font-medium hover:bg-current/5 whitespace-nowrap shrink-0"
              >
                {previewRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{previewRunning ? 'Pause Animation' : 'Play Animation'}</span>
              </button>
              <button
                type="button"
                onClick={onEnterStudio}
                className="rounded-lg bg-[#D9A441] px-4 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] whitespace-nowrap shrink-0"
              >
                Launch Full Studio
              </button>
            </div>
          </div>

          <div
            className={`overflow-hidden rounded-2xl border ${
              isDark ? 'border-white/15 bg-[#0E1030]' : 'border-[#0F1226]/15 bg-white'
            }`}
          >
            <div
              className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs ${
                isDark ? 'border-white/10 bg-[#1B1F5E]/40' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <span>SME Policy &amp; Compliance Assistant</span>
                <span aria-hidden="true">·</span>
                <span className="opacity-75">Trendtactics Digital Workspace</span>
              </div>
              <div className="font-mono text-[11px] opacity-75">
                Active Stage: 0{activePreviewNode + 1} / 03
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-12">
              <div className="flex flex-col justify-center lg:col-span-8">
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                  {[
                    {
                      step: '01',
                      title: 'Document Ingestion',
                      sub: 'PDF / DOCX parsed & chunked',
                      metric: '10 MB max · zlib',
                      icon: <Database className="h-4 w-4 text-[#D9A441]" />,
                    },
                    {
                      step: '02',
                      title: 'pgvector Retrieval',
                      sub: 'Top-K cosine match with RLS',
                      metric: 'cosine: 0.94',
                      icon: <ShieldCheck className="h-4 w-4 text-[#2E8B57]" />,
                    },
                    {
                      step: '03',
                      title: 'Cited Synthesis',
                      sub: 'Grounded answer + filename',
                      metric: '180 ms',
                      icon: <Cpu className="h-4 w-4 text-[#3B3FA8] dark:text-[#D9A441]" />,
                    },
                  ].map((n, idx) => {
                    const isCurrent = previewRunning && activePreviewNode === idx;
                    return (
                      <React.Fragment key={n.step}>
                        <motion.div
                          animate={{
                            scale: isCurrent ? 1.02 : 1,
                          }}
                          transition={{ duration: 0.25 }}
                          onClick={() => setActivePreviewNode(idx)}
                          className={`flex-1 cursor-pointer rounded-xl border p-4 transition-colors ${
                            isCurrent ? 'agba-node-executing border-[#D9A441]' : ''
                          } ${
                            isDark
                              ? 'border-white/15 bg-[#1B1F5E]/35'
                              : 'border-[#0F1226]/15 bg-[#FAF6EC]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-semibold">STEP {n.step}</span>
                            {n.icon}
                          </div>
                          <div className="font-display mt-2 text-sm font-semibold">{n.title}</div>
                          <div className="mt-0.5 text-[11px] opacity-75">{n.sub}</div>
                          <div className="mt-2.5 border-t border-current/10 pt-2 font-mono text-[10px] text-[#3B3FA8] dark:text-[#D9A441]">
                            {n.metric}
                          </div>
                        </motion.div>
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
                    );
                  })}
                </div>
              </div>

              <div
                className={`flex flex-col justify-between rounded-xl border p-4 text-xs lg:col-span-4 ${
                  isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between font-semibold">
                    <span>Verified Cited Output</span>
                    <span className="font-mono text-[10px] text-[#2E8B57] dark:text-[#D9A441]">
                      100% Grounded
                    </span>
                  </div>
                  <p className="mt-2 leading-relaxed opacity-85">
                    &ldquo;Merchant settlements are verified with HMAC-SHA512 and recorded in NGN
                    kobo or USD cents with idempotent replay protection.&rdquo;
                  </p>
                </div>
                <div className="mt-3 border-t border-current/10 pt-2 font-mono text-[11px] opacity-75">
                  Citation: [Lagos_SME_Settlement_Guide.pdf]
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: ACADEMY TEMPLATES (Compact Scannable Cards) */}
      <section id="academy" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-xs font-semibold opacity-70">03. AGBA Academy</div>
            <h2 className="font-display mt-1.5 text-2xl font-bold sm:text-[32px]">
              Start from {ACADEMY_TEMPLATES.length} working agents, not a blank screen.
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onEnterAcademy('All')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
          >
            <span>View all {ACADEMY_TEMPLATES.length} templates</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACADEMY_TEMPLATES.slice(0, 4).map((tpl, idx) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              className={`flex flex-col justify-between rounded-xl border p-5 ${
                isDark ? 'border-white/10 bg-[#1B1F5E]/30' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs opacity-70">
                  <span className="font-mono">
                    0{idx + 1} · {tpl.track}
                  </span>
                  <span className="font-mono tabular-nums">{tpl.nodes.length} nodes</span>
                </div>
                <h3 className="font-display mt-2 text-base font-semibold leading-snug">
                  {tpl.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed opacity-80">
                  {tpl.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenTemplateInStudio(tpl)}
                className="mt-4 inline-flex items-center gap-1.5 border-t border-current/10 pt-3 text-xs font-semibold text-[#3B3FA8] hover:underline dark:text-[#D9A441]"
              >
                <span>Load in Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 5: FREE STACK INFOGRAPHIC + LIVE DIRECTORY SLICE */}
      <section
        id="free-stack"
        className={`border-t py-16 md:py-20 ${
          isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white/60'
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div
            className={`rounded-2xl border p-6 sm:p-8 ${
              isDark ? 'border-white/15 bg-[#0E1030]' : 'border-[#0F1226]/15 bg-white'
            }`}
          >
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
                  <span>04. AGBA Free Stack Infographic</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                    {liveFreeStack.length} Verified Always-Free Services
                  </span>
                </div>
                <h2 className="font-display mt-1.5 text-2xl font-bold sm:text-[32px]">
                  Ship with infrastructure that costs nothing to start.
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onEnterFreeStack({ category: 'All' })}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#D9A441] px-5 py-2.5 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332] whitespace-nowrap"
                >
                  <span>Browse All {liveFreeStack.length} Services</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Visual Category Distribution Bars (Click Any Bar to Filter Directory!) */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoryStats.map((stat) => (
                <button
                  key={stat.category}
                  type="button"
                  onClick={() => onEnterFreeStack({ category: stat.category })}
                  className={`group rounded-xl border p-3.5 text-left transition-colors ${
                    isDark
                      ? 'border-white/10 bg-[#1B1F5E]/35 hover:border-[#D9A441]/60'
                      : 'border-[#0F1226]/10 bg-[#FAF6EC] hover:border-[#3B3FA8]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="truncate">{stat.category}</span>
                    <span className="font-mono tabular-nums text-[#3B3FA8] dark:text-[#D9A441]">
                      {stat.count} tools
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-current/10">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.max(18, stat.pct * 2.5)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full bg-[#D9A441]"
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Compact 4-Row Verified Preview Table */}
            <div className="mt-6 overflow-x-auto border-t border-current/10 pt-5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-current/10 opacity-70">
                    <th className="py-2 pr-3">Service</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Free Tier Summary</th>
                    <th className="py-2 pl-3 text-right">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/10">
                  {liveFreeStack.slice(0, 4).map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">
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
                      <td className="px-3 py-2.5 whitespace-nowrap opacity-75">{entry.category}</td>
                      <td className="px-3 py-2.5 opacity-90">{entry.freeTierSummary}</td>
                      <td className="py-2.5 pl-3 text-right font-mono tabular-nums whitespace-nowrap opacity-75">
                        {entry.verifiedOn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: TRANSPARENT PRICING & VERIFIABLE PROOF */}
      <section id="pricing" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-semibold opacity-70">05. Transparent Pricing</div>
            <h2 className="font-display mt-1.5 text-2xl font-bold sm:text-[32px]">
              Pay only for workspace scale. Zero markup on your API keys.
            </h2>
          </div>

          <div
            className={`inline-flex rounded-lg border p-1 self-start ${
              isDark ? 'border-white/15 bg-[#1B1F5E]/40' : 'border-[#0F1226]/15 bg-white'
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

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            {
              tier: 'Free',
              subtitle: 'Solo builders & students',
              price: `${pricingCurrency} [PRICE_TBD] / mo`,
              features: [
                '1 workspace · 3 Studio workflows',
                'BYOK (Gemini, OpenAI, Claude, Mistral, Ollama)',
                '50 MB private RAG document storage',
                'Full Free Stack & Academy access',
              ],
            },
            {
              tier: 'Builder',
              subtitle: 'Founders & growing SMEs',
              price: `${pricingCurrency} [PRICE_TBD] / mo`,
              features: [
                'Up to 5 team members (RBAC)',
                '25 Studio apps + Public Chat & REST API',
                '2 GB pgvector storage · NGN/USD billing',
                'Automated quota & webhook alerts',
              ],
            },
            {
              tier: 'Team',
              subtitle: 'Agencies & multi-workspace teams',
              price: `${pricingCurrency} [PRICE_TBD] / mo`,
              features: [
                'Multi-workspace agency isolation',
                '10 GB vector knowledge base & audit logs',
                'Custom allowlisted tools & rate limits',
                'Priority SMS, email & in-app alerts',
              ],
            },
          ].map((plan, idx) => (
            <div
              key={plan.tier}
              className={`flex flex-col justify-between rounded-xl border p-6 ${
                idx === 1
                  ? isDark
                    ? 'border-[#D9A441] bg-[#1B1F5E]/40'
                    : 'border-[#3B3FA8] bg-white'
                  : isDark
                    ? 'border-white/10 bg-[#1B1F5E]/20'
                    : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <div>
                <div className="text-xs opacity-75">{plan.subtitle}</div>
                <h3 className="font-display mt-1 text-2xl font-bold">{plan.tier}</h3>
                <div className="mt-3 border-y border-current/10 py-2.5 font-mono text-base font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                  {plan.price}
                </div>
                <ul className="mt-3.5 space-y-2 text-xs leading-relaxed">
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
                className={`mt-5 w-full rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
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

        {/* Compact Verifiable Proof Strip (Governance Rule: Zero Fake Proof) */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'Sign-Up to Deployed Assistant',
              metric: '[PROOF: real metric needed]',
            },
            {
              label: 'SME & Student Builders Onboarded',
              metric: '[PROOF: real metric needed]',
            },
            {
              label: 'Named Customer Case Study',
              metric: '[PROOF: real metric needed]',
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
                isDark ? 'border-white/10 bg-[#1B1F5E]/25' : 'border-[#0F1226]/10 bg-white'
              }`}
            >
              <span className="opacity-80">{item.label}</span>
              <span className="font-mono font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
                {item.metric}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 7: REDESIGNED 2-COLUMN CATEGORIZED FAQ */}
      <section
        id="faq"
        className={`border-t py-16 md:py-24 ${
          isDark ? 'border-white/10 bg-[#1B1F5E]/20' : 'border-[#0F1226]/10 bg-white/60'
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left Column: Editorial Header, Category Filter & Direct Help Card */}
            <div className="space-y-6 lg:col-span-5">
              <div>
                <div className="text-xs font-semibold opacity-70">06. Quick Answers</div>
                <h2 className="font-display mt-1.5 text-2xl font-bold sm:text-[32px] leading-tight">
                  Frequently Asked Questions
                </h2>
                <p className="mt-3 text-sm leading-relaxed opacity-80">
                  Clear answers on how AGBA Studio protects your API keys, isolates your private
                  documents, and helps you launch production AI assistants without markup.
                </p>
              </div>

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {(
                  ['All', 'Studio & AI', 'Security & Privacy', 'Publishing & Stack'] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setFaqCategory(cat);
                      setOpenFaqIdx(0);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      faqCategory === cat
                        ? 'bg-[#3B3FA8] text-[#FAF6EC]'
                        : isDark
                          ? 'border border-white/15 bg-[#0E1030] opacity-75 hover:opacity-100'
                          : 'border border-[#0F1226]/15 bg-white opacity-75 hover:opacity-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Direct Action Callout */}
              <div
                className={`rounded-2xl border p-5 text-xs ${
                  isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
                }`}
              >
                <div className="font-display text-sm font-bold">
                  Ready to test your own documents or API keys?
                </div>
                <p className="mt-1.5 leading-relaxed opacity-80">
                  Create a free workspace in seconds or test our live public assistant directly in
                  your browser.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => (onEnterAuth ? onEnterAuth('signup') : onEnterStudio())}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3.5 py-2 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332]"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onEnterPublicChat}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-3.5 py-2 text-xs font-semibold hover:bg-current/5"
                  >
                    <span>Try Live Chat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Numbered Accordion List */}
            <div className="space-y-3 lg:col-span-7">
              {[
                {
                  category: 'Security & Privacy' as const,
                  q: 'How are my Bring-Your-Own-Key (BYOK) model API keys protected?',
                  a: 'Your API keys are encrypted at rest with AES-256-GCM on the server and decrypted only in memory for the milliseconds a workflow executes. Raw keys never return to the browser and always appear masked (showing only the last 4 characters) in your workspace settings.',
                },
                {
                  category: 'Security & Privacy' as const,
                  q: 'Can another team or workspace see my uploaded documents?',
                  a: 'No. Every uploaded PDF, Word document, and text passage is strictly scoped to your unique workspace_id with database-level Row-Level Security (RLS) and team access controls. Another workspace can never query or view your files.',
                },
                {
                  category: 'Studio & AI' as const,
                  q: 'Can I run AGBA Studio with local open-weights models like Llama as well as cloud APIs?',
                  a: 'Yes. Every Studio workflow and Academy template supports Google Gemini, OpenAI, Anthropic Claude, and Mistral AI in the cloud, as well as self-hosted local models through Ollama (such as Llama 3.2 and Mistral).',
                },
                {
                  category: 'Studio & AI' as const,
                  q: 'What are the 6 Service Studios inside AGBA Studio?',
                  a: 'AGBA Studio organizes your capabilities into 6 focused Service Studios: Knowledge Base (RAG & Citations), AI Model & Prompt, Finance & Unit Economics Calculator, External API & Webhooks, Web Search & SEO Audit, and Email & Team Notifications.',
                },
                {
                  category: 'Publishing & Stack' as const,
                  q: 'How do I share my AI assistant with customers or embed it on my website?',
                  a: 'Click "Publish & API" at the top of AGBA Studio to get your instant Public Chat URL, a ready-to-paste website <iframe> widget, and an authenticated REST API endpoint you can call from any mobile or web backend.',
                },
                {
                  category: 'Publishing & Stack' as const,
                  q: 'How do I use the AGBA Free Stack to launch without high cloud bills?',
                  a: 'Open the Free Stack Directory to browse verified always-free cloud, database, authentication, and hosting tiers—each linked directly to the official provider pricing page so you can pair your AI assistant with zero-cost infrastructure.',
                },
              ]
                .filter((item) => faqCategory === 'All' || item.category === faqCategory)
                .map((item, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div
                      key={item.q}
                      className={`rounded-2xl border transition-colors ${
                        isOpen
                          ? isDark
                            ? 'border-[#D9A441]/60 bg-[#0E1030]'
                            : 'border-[#3B3FA8]/50 bg-white'
                          : isDark
                            ? 'border-white/10 bg-[#0E1030]/70 hover:border-white/20'
                            : 'border-[#0F1226]/10 bg-[#FAF6EC] hover:border-[#0F1226]/20'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] opacity-65">
                            <span className="font-mono font-semibold">0{idx + 1}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.category}</span>
                          </div>
                          <div className="text-sm font-semibold leading-snug sm:text-base">
                            {item.q}
                          </div>
                        </div>
                        <ChevronDown
                          className={`mt-1 h-4 w-4 shrink-0 transition-transform duration-150 ${
                            isOpen ? 'rotate-180 text-[#D9A441]' : 'opacity-65'
                          }`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="border-t border-current/10 px-5 py-4 text-xs sm:text-sm leading-relaxed opacity-85">
                              {item.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: FOOTER */}
      <footer
        className={`relative overflow-hidden border-t py-12 ${
          isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
        }`}
      >
        <AdirePattern opacity={0.05} />
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-2.5 font-display text-xl font-bold">
                <AgbaLogoMark size={28} />
                <span>AGBA</span>
              </div>
              <p className="mt-1 text-xs opacity-80">
                Learn AI, build visual workflows with your own keys, and ship on the verified Free Stack.
              </p>
              <p className="mt-1.5 text-xs font-semibold text-[#3B3FA8] dark:text-[#D9A441]">
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
