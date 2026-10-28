import React from 'react';
import {
  Database,
  Globe,
  Mail,
  Cpu,
  Calculator,
  Search,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  ShieldCheck,
  BookOpen,
  Code2,
} from 'lucide-react';

interface AboutViewProps {
  onOpenStudioTab: (tabId: string) => void;
  onOpenAcademy: () => void;
  onOpenFreeStack: () => void;
  isDark: boolean;
}

export const AboutView: React.FC<AboutViewProps> = ({
  onOpenStudioTab,
  onOpenAcademy,
  onOpenFreeStack,
  isDark,
}) => {
  const cardBg = isDark
    ? 'bg-[#171612] border-[#2A261F] text-[#F5EFE4]'
    : 'bg-white border-[#E2D9C5] text-[#14120E]';
  const mutedBg = isDark
    ? 'bg-[#1D1B16] border-[#2A261F]'
    : 'bg-[#FAF6EE] border-[#E2D9C5]';
  const subText = isDark ? 'text-[#B8B0A0]' : 'text-[#5C5446]';

  const studioCapabilities = [
    {
      id: 'svc-webbuilder',
      badge: '01 · Website & App Builder',
      title: 'Build Live Websites, Landing Pages & Web Apps',
      replaces: 'Like Vercel v0, Bolt.new, or Lovable',
      icon: <Code2 className="h-5 w-5 text-indigo-500" />,
      summary:
        'Describe the website, storefront, or SaaS portal you want in plain English. AGBA generates the complete HTML5 + Tailwind CSS + JavaScript app, gives you a live interactive preview, lets you edit the code, and hosts it on a shareable URL (/apps/your-workspace/your-app) connected to your workspace database.',
      ctaLabel: 'Open Website & App Builder',
    },
    {
      id: 'svc-database',
      badge: '02 · Supabase-Style Backend',
      title: 'Create Database Tables, Rows & Instant REST APIs',
      replaces: 'Like Supabase Table Editor, Appwrite TablesDB, or Airtable',
      icon: <Database className="h-5 w-5 text-emerald-600" />,
      summary:
        'Create custom database tables (e.g. customers, orders, products, leads), define columns, add or delete rows visually, and get instant live REST API endpoints (GET / POST / DELETE /api/baas/:workspace/:table) that your websites and mobile apps can call immediately.',
      ctaLabel: 'Open Database & API Studio',
    },
    {
      id: 'svc-notify',
      badge: '03 · Outbound & Inbound Email Engine',
      title: 'Send Broadcast/Transactional Emails & Receive Inbound Mail',
      replaces: 'Like Resend, Brevo, SendGrid, Postmark & Novu',
      icon: <Mail className="h-5 w-5 text-amber-600" />,
      summary:
        'Send single transactional emails or bulk broadcasts across multiple recipients using Resend, Brevo, SendGrid, Postmark, or the built-in AGBA Relay. Also includes a Universal Inbound Email Webhook receiver with an Inbox viewer and automatic AI auto-replies.',
      ctaLabel: 'Open Email & Inbox Studio',
    },
    {
      id: 'svc-rag',
      badge: '04 · Document Q&A (RAG)',
      title: 'Turn Company PDFs & Word Docs into a Cited AI Chatbot',
      replaces: 'Like Dify, Chatbase, or Flowise',
      icon: <BookOpen className="h-5 w-5 text-blue-600" />,
      summary:
        'Upload your PDFs, DOCX files, or policy notes. AGBA chunks and indexes them strictly inside your private workspace so you can ask questions and publish a customer-facing chat link with source citations.',
      ctaLabel: 'Open Document Q&A Studio',
    },
    {
      id: 'svc-llm',
      badge: '05 · Multi-Model AI Playground',
      title: 'Test Prompts Across Gemini, OpenAI, Claude, Mistral & Ollama',
      replaces: 'Like OpenAI Playground or OpenRouter Workbench',
      icon: <Cpu className="h-5 w-5 text-purple-600" />,
      summary:
        'Configure system instructions, temperature, and user prompts across 5 model providers using your own AES-256-GCM encrypted API keys (BYOK) or local Ollama models.',
      ctaLabel: 'Open AI Prompt Playground',
    },
    {
      id: 'svc-calc',
      badge: '06 · Finance & Unit Economics',
      title: 'Calculate NGN/USD Margins, Paystack Fees & Cash Runway',
      replaces: 'Like Baremetrics / Pry Startup Financial Modeling',
      icon: <Calculator className="h-5 w-5 text-teal-600" />,
      summary:
        'Model your customer pricing in Naira (₦) or USD ($), automatically compute Paystack settlement fees (1.5% + ₦100 capped at ₦2,000), break-even customers, and get AI CFO recommendations.',
      ctaLabel: 'Open Finance Calculator',
    },
    {
      id: 'svc-http',
      badge: '07 · API & Webhook Inspector',
      title: 'Test External REST APIs & Webhooks Safely',
      replaces: 'Like Postman or Hoppscotch',
      icon: <Terminal className="h-5 w-5 text-rose-600" />,
      summary:
        'Send live GET and POST requests to external APIs, inspect HTTP status codes, latency, and JSON responses, protected by AGBA’s server-side SSRF firewall.',
      ctaLabel: 'Open API & Webhook Tester',
    },
    {
      id: 'svc-search',
      badge: '08 · Website & SEO Auditor',
      title: 'Audit Any Website for SEO, OpenGraph & AI Search (GEO/AEO)',
      replaces: 'Like Ahrefs Site Audit or Lighthouse SEO',
      icon: <Search className="h-5 w-5 text-cyan-600" />,
      summary:
        'Enter any URL and target keyword to get a 0–100 SEO score, checking <title>, meta descriptions, HTTPS canonicals, OpenGraph cards, and Schema.org JSON-LD.',
      ctaLabel: 'Open Website & SEO Auditor',
    },
  ];

  const comparisonRows = [
    {
      category: 'AI Website & App Builder',
      famousProducts: 'Vercel v0, Bolt.new, Lovable',
      howAgbaHandlesIt:
        'Built-in Website & App Builder Studio generates complete HTML5 + Tailwind + JS web apps, hosts them live at /apps/:workspace/:slug, and wires forms directly to your AGBA database.',
    },
    {
      category: 'Backend-as-a-Service (BaaS) & Database Tables',
      famousProducts: 'Supabase, Appwrite, Firebase, Airtable',
      howAgbaHandlesIt:
        'Built-in Database & REST API Studio lets you create custom tables, insert/delete rows visually, and call live REST endpoints (/api/baas/:workspace/:table) from any frontend.',
    },
    {
      category: 'Outbound & Inbound Email Infrastructure',
      famousProducts: 'Resend, SendGrid, Brevo, Postmark, Novu',
      howAgbaHandlesIt:
        'Built-in Email & Inbox Studio supports single emails, bulk broadcasts across multiple recipients, and an Inbound Email Webhook Inbox with AI auto-replies.',
    },
    {
      category: 'AI Document Chatbots & Workflows (RAG)',
      famousProducts: 'Dify, Chatbase, Flowise, Langflow',
      howAgbaHandlesIt:
        'Built-in Document Q&A Studio indexes PDFs/DOCX files per workspace with cosine-similarity citations and publishes shareable chat links.',
    },
    {
      category: 'Verified Free Cloud & DevOps Directory',
      famousProducts: 'free-for.dev, ProductHunt DevTools',
      howAgbaHandlesIt:
        'AGBA Free Stack curates 160 independently verified always-free developer tiers across 10 categories with official pricing links.',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-10">
      {/* Hero Banner */}
      <div className={`rounded-2xl border p-6 sm:p-10 ${cardBg}`}>
        <div className="inline-flex items-center gap-2 rounded-md border border-[#C89D3C]/40 bg-[#C89D3C]/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-[#C89D3C]">
          <ShieldCheck className="h-3.5 w-3.5" />
          Plain-English Product Guide · Built in Lagos by Trendtactics Digital
        </div>
        <h1 className="mt-4 font-serif text-3xl sm:text-4xl font-bold tracking-tight">
          What is AGBA — in Plain Layman’s English?
        </h1>
        <p className={`mt-4 text-base sm:text-lg leading-relaxed max-w-4xl ${subText}`}>
          <strong>AGBA</strong> (from the Yoruba word <em>àgbà</em> — the respected elder and guide, linked to{' '}
          <em>agbára</em> — capability and strength) is an <strong>All-in-One Builder &amp; Backend Workspace</strong> for founders, businesses, and developers. Instead of paying for 5 separate tools and stitching them together, AGBA gives you <strong>one dashboard</strong> where you can:
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`rounded-xl border p-4 ${mutedBg}`}>
            <div className="text-xs font-mono font-bold uppercase text-[#C89D3C]">1. Build Websites &amp; Apps</div>
            <p className="mt-1 text-xs leading-relaxed">
              Generate working websites, landing pages, and web apps with live preview, source code editor, and instant hosting.
            </p>
          </div>
          <div className={`rounded-xl border p-4 ${mutedBg}`}>
            <div className="text-xs font-mono font-bold uppercase text-emerald-600">2. Run a Supabase-Style Backend</div>
            <p className="mt-1 text-xs leading-relaxed">
              Create database tables (<code>customers</code>, <code>orders</code>), add rows visually, and use instant REST APIs.
            </p>
          </div>
          <div className={`rounded-xl border p-4 ${mutedBg}`}>
            <div className="text-xs font-mono font-bold uppercase text-amber-600">3. Send &amp; Receive Emails</div>
            <p className="mt-1 text-xs leading-relaxed">
              Send single or bulk broadcast emails via Resend/Brevo/SendGrid and receive inbound customer emails with AI auto-replies.
            </p>
          </div>
          <div className={`rounded-xl border p-4 ${mutedBg}`}>
            <div className="text-xs font-mono font-bold uppercase text-indigo-500">4. Train AI on Your PDFs</div>
            <p className="mt-1 text-xs leading-relaxed">
              Upload company PDFs or handbooks and publish a smart Q&amp;A chatbot or API trained strictly on your documents.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: All 8 Functional Studios */}
      <div className="space-y-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#C89D3C]">
            01 · Practical Workbenches
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
            Everything You Can Do Inside AGBA Studio Right Now
          </h2>
          <p className={`text-sm mt-1 ${subText}`}>
            Click any card below to open that workbench directly inside AGBA Studio and use it immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studioCapabilities.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition hover:border-[#C89D3C] ${cardBg}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#C89D3C]/15 text-[#C89D3C] font-semibold">
                    {item.badge}
                  </span>
                  <span className={`text-[11px] font-mono ${subText}`}>{item.replaces}</span>
                </div>
                <div className="flex items-start gap-3 mt-3">
                  <div className={`p-2.5 rounded-xl border ${mutedBg}`}>{item.icon}</div>
                  <div>
                    <h3 className="font-serif text-lg font-bold leading-snug">{item.title}</h3>
                    <p className={`mt-1.5 text-xs leading-relaxed ${subText}`}>{item.summary}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2D9C5]/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenStudioTab(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D3557] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1D3557]/90 transition"
                >
                  {item.ctaLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: What Other Products Does AGBA Represent / Compare With? */}
      <div className={`rounded-2xl border p-6 sm:p-8 ${cardBg}`}>
        <div className="text-xs font-mono uppercase tracking-wider text-[#C89D3C]">
          02 · Market Positioning &amp; Alternatives
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
          What Other Products Can You Compare AGBA With?
        </h2>
        <p className={`text-sm mt-1 mb-6 ${subText}`}>
          If someone asks <em>"What is AGBA an alternative to?"</em>, here is the exact breakdown of the global tools AGBA combines into one Nigerian-friendly platform:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-[#2A261F]' : 'border-[#E2D9C5]'}`}>
                <th className="py-3 pr-4 font-semibold">Product Category</th>
                <th className="py-3 px-4 font-semibold">Global Alternatives It Represents</th>
                <th className="py-3 pl-4 font-semibold">How AGBA Delivers It</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D9C5]/30">
              {comparisonRows.map((row) => (
                <tr key={row.category}>
                  <td className="py-3.5 pr-4 font-semibold align-top">{row.category}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#C89D3C] align-top">
                    {row.famousProducts}
                  </td>
                  <td className={`py-3.5 pl-4 text-xs leading-relaxed align-top ${subText}`}>
                    {row.howAgbaHandlesIt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Honest Boundaries — What AGBA Can Do Out-of-the-Box vs What Needs an External Key */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-2xl border p-6 ${cardBg}`}>
          <div className="flex items-center gap-2 text-emerald-600 font-mono text-xs uppercase tracking-wider font-bold">
            <CheckCircle2 className="h-4 w-4" />
            Works 100% Out-of-the-Box Right Now
          </div>
          <h3 className="font-serif text-xl font-bold mt-2">
            What You Can Do Immediately Without Extra Setup
          </h3>
          <ul className={`mt-4 space-y-3 text-xs sm:text-sm ${subText}`}>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Generate &amp; Host Websites/Apps:</strong> Describe any website or portal, preview it live, edit the HTML/Tailwind code, download the file, or open its live hosted URL (<code>/apps/:workspace/:slug</code>).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Create Custom Database Tables &amp; REST APIs:</strong> Create tables, add columns and rows visually, and read/write data from your apps via <code>/api/baas/:workspace/:table</code>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Upload PDFs/DOCX &amp; Ask Cited Questions:</strong> Upload your documents, run semantic Q&amp;A searches, and test answers immediately.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Test APIs, Audit SEO &amp; Model NGN/USD Finance:</strong> Run live HTTP/Webhook checks, score website SEO metadata, and calculate Paystack unit economics.
              </span>
            </li>
          </ul>
        </div>

        <div className={`rounded-2xl border p-6 ${cardBg}`}>
          <div className="flex items-center gap-2 text-amber-600 font-mono text-xs uppercase tracking-wider font-bold">
            <AlertTriangle className="h-4 w-4" />
            Honest Boundaries &amp; External Provider Keys
          </div>
          <h3 className="font-serif text-xl font-bold mt-2">
            What Requires Connecting Your Own Free Provider Key
          </h3>
          <ul className={`mt-4 space-y-3 text-xs sm:text-sm ${subText}`}>
            <li className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Delivering Emails to External Gmail/Yahoo Inboxes:</strong> By default, AGBA records all outbound &amp; broadcast emails in your Workspace Outbox Ledger. To physically land in external Gmail/Outlook inboxes across the internet, paste a free <strong>Resend, Brevo, or SendGrid API Key</strong> in the Email Studio’s Provider Settings.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Receiving Real-World Inbound Domain Emails:</strong> You can simulate inbound emails in 1 click inside the Studio or point your domain’s <strong>Resend Inbound / SendGrid Parse / Mailgun</strong> webhook URL to <code>/api/inbound/email/:workspaceId</code>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Public Visitor Chat Links (BYOK Security Rule):</strong> To protect you from surprise bills, public shareable chat links require saving your own Gemini, OpenAI, Claude, or Mistral API key in Settings.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Native iOS/Android App Store Binaries (<code>.ipa</code> / <code>.apk</code>):</strong> AGBA builds responsive Web Apps &amp; PWAs that work on mobile browsers, not native Apple/Google Play compiled binaries.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Quick Action Bar */}
      <div className={`rounded-2xl border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${mutedBg}`}>
        <div>
          <h3 className="font-serif text-lg font-bold">Ready to build your first website, database table, or email campaign?</h3>
          <p className={`text-xs mt-0.5 ${subText}`}>
            Jump straight into any Studio workbench or explore the 160 verified free developer services.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onOpenStudioTab('svc-webbuilder')}
            className="rounded-xl bg-[#C89D3C] px-4 py-2.5 text-xs font-semibold text-[#14120E] hover:opacity-95 transition"
          >
            Build a Website / App
          </button>
          <button
            type="button"
            onClick={() => onOpenStudioTab('svc-database')}
            className="rounded-xl bg-[#1D3557] px-4 py-2.5 text-xs font-semibold text-white hover:opacity-95 transition"
          >
            Open Supabase Table Studio
          </button>
          <button
            type="button"
            onClick={onOpenFreeStack}
            className={`rounded-xl border px-4 py-2.5 text-xs font-semibold ${cardBg}`}
          >
            Browse 160 Free Services
          </button>
        </div>
      </div>
    </div>
  );
};
