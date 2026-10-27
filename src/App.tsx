import React, { useState, useEffect } from 'react';
import {
  Cpu,
  BookOpen,
  Layers,
  Settings,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogIn,
  LogOut,
} from 'lucide-react';
import { MarketingLanding } from './components/MarketingLanding.tsx';
import { AuthView } from './components/AuthView.tsx';
import { AgbaLogoMark } from './components/AgbaLogoMark.tsx';
import { StudioWorkspace } from './components/StudioWorkspace.tsx';
import { FreeStackView } from './components/FreeStackView.tsx';
import { AcademyView, SettingsAndSecurityView } from './components/AcademyAndSettingsView.tsx';
import { BillingView } from './components/BillingView.tsx';
import { PublicChatView } from './components/PublicChatView.tsx';
import { ACADEMY_TEMPLATES } from './data/academyTemplates.ts';
import { FREE_STACK_CATEGORIES } from './data/freeStackData.ts';
import { buildProgrammaticSeo, syncBrowserSeo } from './lib/seoEngine.ts';
import {
  auth,
  bridgeFirebaseUserToAppwrite,
  getStoredAgbaSession,
  onAuthStateChanged,
  signOutFirebaseUser,
  type BridgedSessionSummary,
  type User,
} from './lib/firebase.ts';
import {
  syncWorkflowViaExpress,
  syncWorkspaceViaExpress,
} from './lib/appwriteClient.ts';
import type {
  AcademyTemplate,
  FreeStackCategory,
  MaskedModelKeyRecord,
  ModelProvider,
  StudioWorkflowApp,
  Workspace,
} from './types/agba.ts';

type ActiveModule = 'studio' | 'academy' | 'freestack' | 'settings' | 'billing';

const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws_trendtactics_lagos',
    name: 'Trendtactics Digital (Lagos)',
    slug: 'trendtactics-lagos',
    planTier: 'builder',
    currency: 'NGN',
    memberRole: 'owner',
    createdAt: '2026-10-23T00:00:00.000Z',
  },
  {
    id: 'ws_savannah_labs',
    name: 'Savannah AgriTech Labs (Abuja)',
    slug: 'savannah-labs',
    planTier: 'free',
    currency: 'USD',
    memberRole: 'owner',
    createdAt: '2026-10-23T00:00:00.000Z',
  },
];

function maskKeyForClient(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 6) return '••••';
  const last4 = trimmed.slice(-4);
  const prefixMatch = trimmed.match(/^(sk-ant-|sk-|AIza|gsk_|mistral-)/);
  const prefix = prefixMatch ? prefixMatch[1] : trimmed.slice(0, 3) + '-';
  return `${prefix}••••••••${last4}`;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'marketing' | 'auth' | 'app' | 'public_chat'>(
    'marketing'
  );
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [activeModule, setActiveModule] = useState<ActiveModule>('studio');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Deep-link states for sub-menus
  const [freeStackCategory, setFreeStackCategory] = useState<FreeStackCategory | 'All'>('All');
  const [freeStackOpenCms, setFreeStackOpenCms] = useState<boolean>(false);
  const [academyTrack, setAcademyTrack] = useState<
    'All' | 'Starter' | 'RAG Tutorial' | 'Advanced Multi-Agent'
  >('All');
  const [expandedMenu, setExpandedMenu] = useState<ActiveModule | null>('freestack');

  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('ws_trendtactics_lagos');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [agbaSession, setAgbaSession] = useState<BridgedSessionSummary | null>(() =>
    getStoredAgbaSession()
  );
  const [authReady, setAuthReady] = useState<boolean>(false);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/status') {
        setViewMode('app');
        setActiveModule('settings');
      } else if (path === '/signin' || path === '/login') {
        setAuthMode('signin');
        setViewMode('auth');
      } else if (path === '/signup' || path === '/register') {
        setAuthMode('signup');
        setViewMode('auth');
      } else {
        const params = new URLSearchParams(window.location.search);
        const qView = params.get('view');
        const qModule = params.get('module') as ActiveModule | null;
        const qCategory = params.get('category') as FreeStackCategory | null;
        const qTrack = params.get('track') as
          | 'All'
          | 'Starter'
          | 'RAG Tutorial'
          | 'Advanced Multi-Agent'
          | null;

        if (qView === 'app') {
          setViewMode('app');
        } else if (qView === 'auth' || qView === 'signin') {
          setAuthMode('signin');
          setViewMode('auth');
        } else if (qView === 'signup') {
          setAuthMode('signup');
          setViewMode('auth');
        }
        if (
          qModule &&
          ['studio', 'academy', 'freestack', 'settings', 'billing'].includes(qModule)
        ) {
          setActiveModule(qModule);
          setExpandedMenu(qModule);
        }
        if (qCategory && (FREE_STACK_CATEGORIES as readonly string[]).includes(qCategory)) {
          setFreeStackCategory(qCategory);
        }
        if (
          qTrack &&
          ['All', 'Starter', 'RAG Tutorial', 'Advanced Multi-Agent'].includes(qTrack)
        ) {
          setAcademyTrack(qTrack);
        }
      }
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const isStatusRoute =
      typeof window !== 'undefined' &&
      window.location.pathname === '/status' &&
      viewMode === 'app' &&
      activeModule === 'settings';

    const seoMeta = buildProgrammaticSeo({
      viewMode: isStatusRoute ? 'status' : viewMode === 'auth' ? 'marketing' : viewMode,
      activeModule,
      freeStackCategory,
      academyTrack,
    });
    syncBrowserSeo(seoMeta);
  }, [viewMode, activeModule, freeStackCategory, academyTrack]);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    // Bridge Firebase identity token to an Appwrite 2.6.1 session via /api/auth/bridge-session
    void bridgeFirebaseUserToAppwrite(firebaseUser);
    void syncWorkspaceViaExpress(activeWorkspace);
  }, [authReady, firebaseUser, activeWorkspace]);

  const [modelKeys, setModelKeys] = useState<MaskedModelKeyRecord[]>([]);

  const defaultTemplate = ACADEMY_TEMPLATES[0];
  const [currentWorkflow, setCurrentWorkflow] = useState<StudioWorkflowApp>({
    id: 'app_sme_rag_01',
    workspace_id: activeWorkspace.id,
    name: defaultTemplate.title,
    description: defaultTemplate.summary,
    category: 'RAG',
    allowedTools: [...defaultTemplate.allowedTools, 'calculator', 'http_request'],
    nodes: defaultTemplate.nodes,
    edges: defaultTemplate.edges,
    updatedAt: new Date().toISOString(),
  });

  const handleImportTemplate = (tpl: AcademyTemplate) => {
    const nextWf: StudioWorkflowApp = {
      id: `app_${tpl.id}_${Date.now().toString(36)}`,
      workspace_id: activeWorkspace.id,
      name: tpl.title,
      description: tpl.summary,
      category:
        tpl.track === 'RAG Tutorial'
          ? 'RAG'
          : tpl.track === 'Advanced Multi-Agent'
            ? 'Multi-Agent'
            : 'Starter',
      allowedTools: [...tpl.allowedTools],
      nodes: tpl.nodes.map((n) => ({ ...n, config: { ...n.config } })),
      edges: tpl.edges.map((e) => ({ ...e })),
      updatedAt: new Date().toISOString(),
    };
    setCurrentWorkflow(nextWf);
    void syncWorkflowViaExpress(activeWorkspace.id, nextWf);
    setViewMode('app');
    setActiveModule('studio');
    setExpandedMenu('studio');
  };

  const handleAddMaskedKey = (provider: ModelProvider, label: string, rawKey: string) => {
    const newRec: MaskedModelKeyRecord = {
      id: `key_${Date.now().toString(36)}`,
      workspace_id: activeWorkspace.id,
      provider,
      label,
      maskedKey: maskKeyForClient(rawKey),
      createdAt: new Date().toISOString(),
      createdBy: 'usr_akinola_01',
    };
    setModelKeys((prev) => [newRec, ...prev]);
  };

  const handleCurrencyChange = (currency: 'NGN' | 'USD') => {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === activeWorkspace.id ? { ...w, currency } : w))
    );
  };

  if (viewMode === 'auth') {
    return (
      <AuthView
        initialMode={authMode}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onBackToHome={() => setViewMode('marketing')}
        onAuthSuccess={(session) => {
          setAgbaSession(session);
          if (session.workspaceName && session.workspaceName.trim().length >= 2) {
            const slug = session.workspaceName
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-');
            const newWs: Workspace = {
              id: `ws_${slug}_${Date.now().toString(36).slice(-4)}`,
              name: session.workspaceName.trim(),
              slug,
              planTier: 'free',
              currency: 'NGN',
              memberRole: 'owner',
              createdAt: new Date().toISOString(),
            };
            setWorkspaces((prev) => [newWs, ...prev]);
            setActiveWorkspaceId(newWs.id);
          }
          setViewMode('app');
          setActiveModule('studio');
          setExpandedMenu('studio');
        }}
      />
    );
  }

  if (viewMode === 'marketing') {
    return (
      <MarketingLanding
        onEnterStudio={() => {
          setViewMode('app');
          setActiveModule('studio');
          setExpandedMenu('studio');
        }}
        onEnterFreeStack={(opts) => {
          setFreeStackCategory(opts?.category ?? 'All');
          setFreeStackOpenCms(Boolean(opts?.openCms));
          setViewMode('app');
          setActiveModule('freestack');
          setExpandedMenu('freestack');
        }}
        onEnterAcademy={(track) => {
          setAcademyTrack(track ?? 'All');
          setViewMode('app');
          setActiveModule('academy');
          setExpandedMenu('academy');
        }}
        onEnterBilling={() => {
          setViewMode('app');
          setActiveModule('billing');
          setExpandedMenu('billing');
        }}
        onEnterSettings={() => {
          setViewMode('app');
          setActiveModule('settings');
          setExpandedMenu('settings');
        }}
        onEnterAuth={(mode) => {
          setAuthMode(mode ?? 'signin');
          setViewMode('auth');
        }}
        onEnterPublicChat={() => {
          setViewMode('public_chat');
        }}
        onOpenTemplateInStudio={handleImportTemplate}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />
    );
  }

  if (viewMode === 'public_chat') {
    return (
      <div className="h-screen w-full overflow-hidden">
        <PublicChatView
          workspace={activeWorkspace}
          workflow={currentWorkflow}
          onBackToStudio={() => {
            setViewMode('app');
            setActiveModule('studio');
          }}
          isDark={isDark}
        />
      </div>
    );
  }

  const navItems: {
    id: ActiveModule;
    label: string;
    icon: React.ReactNode;
    subItems: { label: string; onClick: () => void }[];
  }[] = [
    {
      id: 'studio',
      label: 'Studio',
      icon: <Cpu className="h-4 w-4 shrink-0" />,
      subItems: [
        {
          label: 'Workflow Canvas',
          onClick: () => setActiveModule('studio'),
        },
        {
          label: 'Public Chat & Embed',
          onClick: () => setViewMode('public_chat'),
        },
      ],
    },
    {
      id: 'academy',
      label: 'Academy',
      icon: <BookOpen className="h-4 w-4 shrink-0" />,
      subItems: [
        {
          label: 'All Templates',
          onClick: () => {
            setAcademyTrack('All');
            setActiveModule('academy');
          },
        },
        {
          label: 'Starter Agents',
          onClick: () => {
            setAcademyTrack('Starter');
            setActiveModule('academy');
          },
        },
        {
          label: 'Document Q&A (RAG)',
          onClick: () => {
            setAcademyTrack('RAG Tutorial');
            setActiveModule('academy');
          },
        },
        {
          label: 'Multi-Agent Flows',
          onClick: () => {
            setAcademyTrack('Advanced Multi-Agent');
            setActiveModule('academy');
          },
        },
      ],
    },
    {
      id: 'freestack',
      label: 'Free Stack',
      icon: <Layers className="h-4 w-4 shrink-0" />,
      subItems: [
        {
          label: 'All Free Services',
          onClick: () => {
            setFreeStackCategory('All');
            setFreeStackOpenCms(false);
            setActiveModule('freestack');
          },
        },
        {
          label: 'Cloud & Compute',
          onClick: () => {
            setFreeStackCategory('Cloud & Compute');
            setFreeStackOpenCms(false);
            setActiveModule('freestack');
          },
        },
        {
          label: 'Databases & Vectors',
          onClick: () => {
            setFreeStackCategory('Databases & Vector Stores');
            setFreeStackOpenCms(false);
            setActiveModule('freestack');
          },
        },
        {
          label: 'AI & Model APIs',
          onClick: () => {
            setFreeStackCategory('AI & Model APIs');
            setFreeStackOpenCms(false);
            setActiveModule('freestack');
          },
        },
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4 shrink-0" />,
      subItems: [
        {
          label: 'Model API Keys (BYOK)',
          onClick: () => setActiveModule('settings'),
        },
        {
          label: 'Team Workspaces',
          onClick: () => setActiveModule('settings'),
        },
      ],
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: <CreditCard className="h-4 w-4 shrink-0" />,
      subItems: [
        {
          label: 'Plans & Quotas',
          onClick: () => setActiveModule('billing'),
        },
        {
          label: 'Currency (NGN / USD)',
          onClick: () => setActiveModule('billing'),
        },
      ],
    },
  ];

  return (
    <div
      className={`flex h-screen w-full overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#0E1030] text-[#FAF6EC]' : 'bg-[#FAF6EC] text-[#0F1226]'
      }`}
    >
      {/* Fixed Left Sidebar: 216px expanded, 64px collapsed */}
      <aside
        aria-label="AGBA Application Navigation"
        className={`hidden md:flex flex-col justify-between border-r transition-all duration-150 shrink-0 ${
          sidebarCollapsed ? 'w-[64px]' : 'w-[216px]'
        } ${isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'}`}
      >
        <div className="no-scrollbar overflow-y-auto">
          <div className="flex h-14 items-center justify-between border-b border-current/10 px-4">
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setViewMode('marketing')}
                className="group inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight hover:opacity-90"
              >
                <AgbaLogoMark size={26} />
                <span>AGBA</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="rounded p-1.5 opacity-75 hover:bg-current/5 hover:opacity-100"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="mt-4 space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              const isExpanded = expandedMenu === item.id && !sidebarCollapsed;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule(item.id);
                      setExpandedMenu((prev) => (prev === item.id ? null : item.id));
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#D9A441] font-semibold text-[#0F1226]'
                        : 'opacity-80 hover:bg-current/5 hover:opacity-100'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      {item.icon}
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="ml-1 opacity-70">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </button>

                  {isExpanded && item.subItems.length > 0 && (
                    <div className="mt-1 mb-2 ml-6 space-y-1 border-l border-current/15 pl-3">
                      {item.subItems.map((sub) => (
                        <button
                          key={sub.label}
                          type="button"
                          onClick={sub.onClick}
                          className="block w-full rounded px-2 py-1.5 text-left text-xs opacity-80 transition-colors hover:bg-current/5 hover:opacity-100"
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-current/10 p-3">
          <button
            type="button"
            onClick={() => setViewMode('marketing')}
            title="Return to Home Page"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium opacity-75 hover:bg-current/5 hover:opacity-100"
          >
            <Globe className="h-4 w-4 shrink-0 text-[#D9A441]" />
            {!sidebarCollapsed && <span className="truncate">Home &amp; Overview</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={`flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 ${
            isDark ? 'border-white/10 bg-[#0E1030]' : 'border-[#0F1226]/10 bg-[#FAF6EC]'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle mobile navigation"
              className="rounded p-1.5 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2">
              <label htmlFor="workspace-switcher" className="sr-only">
                Active Workspace
              </label>
              <select
                id="workspace-switcher"
                value={activeWorkspace.id}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                className={`max-w-[180px] sm:max-w-xs truncate rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                  isDark
                    ? 'border-white/15 bg-[#1B1F5E] text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                }`}
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>

              <span
                aria-label="Server-Verified Workspace Team Role"
                title="Role is derived strictly on the server from your Appwrite Team + Firebase Workspace membership (never from client headers)."
                className="hidden sm:inline-flex items-center gap-1.5 text-xs opacity-75"
              >
                <span>·</span>
                <span>Role: {activeWorkspace.memberRole.toUpperCase()}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden lg:block">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (
                    e.target.value.toLowerCase().includes('free') ||
                    e.target.value.toLowerCase().includes('cms')
                  ) {
                    setActiveModule('freestack');
                  } else if (e.target.value.toLowerCase().includes('key')) {
                    setActiveModule('settings');
                  }
                }}
                placeholder="Search Studio, Free Stack, or Keys..."
                aria-label="Global workspace search"
                className={`w-52 rounded-lg border py-1.5 pr-3 pl-8 text-xs ${
                  isDark
                    ? 'border-white/15 bg-[#1B1F5E]/40 text-[#FAF6EC]'
                    : 'border-[#0F1226]/15 bg-white text-[#0F1226]'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-current/15 px-2.5 py-1.5 text-xs font-medium hover:bg-current/5"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-[#D9A441]" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="hidden xl:inline">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 border-l border-current/10 pl-3 text-xs">
              {firebaseUser || agbaSession ? (
                <>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2E8B57] font-mono text-xs font-bold text-[#FAF6EC]">
                    {(
                      firebaseUser?.displayName ||
                      agbaSession?.displayName ||
                      firebaseUser?.email ||
                      agbaSession?.email ||
                      'AG'
                    )
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold">
                      {firebaseUser?.displayName ||
                        agbaSession?.displayName ||
                        'AGBA Builder'}
                    </div>
                    <div className="text-[11px] opacity-70">
                      {firebaseUser?.email || agbaSession?.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAgbaSession(null);
                      void signOutFirebaseUser();
                    }}
                    title="Sign Out"
                    className="ml-1 inline-flex items-center gap-1 rounded-lg border border-current/15 px-2 py-1 text-[11px] font-medium hover:bg-current/5"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setViewMode('auth');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#D9A441] px-3 py-1.5 text-xs font-semibold text-[#0F1226] hover:bg-[#c89332]"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation"
            className={`border-b p-3 md:hidden ${
              isDark ? 'border-white/10 bg-[#1B1F5E]' : 'border-[#0F1226]/10 bg-white'
            }`}
          >
            <div className="space-y-2">
              {navItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-current/10 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                      activeModule === item.id ? 'bg-[#D9A441] text-[#0F1226]' : ''
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 pl-6">
                    {item.subItems.map((sub) => (
                      <button
                        key={sub.label}
                        type="button"
                        onClick={() => {
                          sub.onClick();
                          setMobileMenuOpen(false);
                        }}
                        className="rounded border border-current/15 px-2 py-1 text-[11px] opacity-85"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setViewMode('marketing');
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-current/15 px-3 py-2 text-xs font-medium"
              >
                <Globe className="h-4 w-4 text-[#D9A441]" />
                <span>Home &amp; Overview</span>
              </button>
            </div>
          </nav>
        )}

        <div className="no-scrollbar flex-1 overflow-y-auto">
          {activeModule === 'studio' && (
            <StudioWorkspace
              activeWorkspace={activeWorkspace}
              workflow={currentWorkflow}
              onUpdateWorkflow={setCurrentWorkflow}
              onSelectTemplate={handleImportTemplate}
              onOpenPublicChat={() => setViewMode('public_chat')}
              isDark={isDark}
            />
          )}
          {activeModule === 'academy' && (
            <AcademyView
              onImportTemplate={handleImportTemplate}
              initialTrack={academyTrack}
              isDark={isDark}
            />
          )}
          {activeModule === 'freestack' && (
            <FreeStackView
              activeWorkspace={activeWorkspace}
              isDark={isDark}
              initialCategory={freeStackCategory}
              initialOpenCms={freeStackOpenCms}
              onOpenStudioWithService={(serviceName, category) => {
                const newNodeId = `node_${Date.now().toString(36)}`;
                const lastNode = currentWorkflow.nodes[currentWorkflow.nodes.length - 1];
                const updatedWf: StudioWorkflowApp = {
                  ...currentWorkflow,
                  nodes: [
                    ...currentWorkflow.nodes,
                    {
                      id: newNodeId,
                      kind: 'agent_tool',
                      title: `${serviceName} Connector`,
                      subtitle: `In-Platform ${category} integration`,
                      x: lastNode ? Math.min(lastNode.x + 220, 860) : 120,
                      y: 120,
                      config: {
                        toolId: 'http_request',
                      },
                    },
                  ],
                  edges: lastNode
                    ? [
                        ...currentWorkflow.edges,
                        {
                          id: `edge_${Date.now().toString(36)}`,
                          source: lastNode.id,
                          target: newNodeId,
                          label: 'flow',
                        },
                      ]
                    : currentWorkflow.edges,
                  updatedAt: new Date().toISOString(),
                };
                setCurrentWorkflow(updatedWf);
                setActiveModule('studio');
                setExpandedMenu('studio');
              }}
            />
          )}
          {activeModule === 'settings' && (
            <SettingsAndSecurityView
              activeWorkspace={activeWorkspace}
              modelKeys={modelKeys}
              onAddMaskedKey={handleAddMaskedKey}
              onWorkspaceCreated={(newWs) => {
                setWorkspaces((prev) => [...prev, newWs]);
                setActiveWorkspaceId(newWs.id);
                void syncWorkspaceViaExpress(newWs);
              }}
              onNavigateModule={(mod) => {
                setActiveModule(mod);
                setExpandedMenu(mod);
              }}
              isDark={isDark}
            />
          )}
          {activeModule === 'billing' && (
            <BillingView
              activeWorkspace={activeWorkspace}
              onChangeCurrency={handleCurrencyChange}
              isDark={isDark}
            />
          )}
        </div>
      </div>
    </div>
  );
}
