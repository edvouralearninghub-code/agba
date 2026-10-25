import { FREE_STACK_ENTRIES, FREE_STACK_CATEGORIES } from '../data/freeStackData.ts';
import { ACADEMY_TEMPLATES } from '../data/academyTemplates.ts';
import type { FreeStackCategory } from '../types/agba.ts';

export const AGBA_CANONICAL_ORIGIN = 'https://agba-pi.vercel.app';
export const AGBA_GITHUB_REPO = 'https://github.com/edvouralearninghub-code/agba';

export const AGBA_DEFAULT_SEO = {
  title: 'AGBA — Learn, Build & Ship AI | Trendtactics Digital',
  description:
    'Learn AI with 12 guided agent blueprints, build visual BYOK workflows with private RAG citations, and ship on 160 verified free developer tiers in Lagos.',
  shortTitle: 'AGBA — Learn, Build & Ship AI',
  githubAboutDescription:
    'Multi-tenant AI learning (Academy), visual BYOK workflow builder with AES-256-GCM vault & pgvector RAG (Studio), and 160 verified always-free developer tiers (Free Stack). Built in Lagos by Trendtactics Digital.',
  githubTopics: [
    'ai-workflows',
    'rag',
    'byok',
    'appwrite',
    'pgvector',
    'free-for-developers',
    'multi-tenant-saas',
    'llm-agents',
    'gemini-api',
    'openai',
    'anthropic',
    'ollama',
    'typescript',
    'react',
    'express',
    'lagos',
    'nigeria',
    'african-tech',
    'owasp-asvs',
    'paystack',
  ],
};

export interface PageSeoMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  jsonLd: Record<string, unknown>;
}

/**
 * Programmatic SEO (pSEO) generator for any view, Free Stack category, or Academy track.
 */
export function buildProgrammaticSeo(params: {
  viewMode: 'marketing' | 'app' | 'public_chat' | 'status';
  activeModule?: 'studio' | 'academy' | 'freestack' | 'settings' | 'billing';
  freeStackCategory?: FreeStackCategory | 'All';
  academyTrack?: 'All' | 'Starter' | 'RAG Tutorial' | 'Advanced Multi-Agent';
}): PageSeoMetadata {
  const { viewMode, activeModule, freeStackCategory = 'All', academyTrack = 'All' } = params;

  if (viewMode === 'status') {
    return {
      title: 'System Status & Live Readiness | AGBA Platform',
      description:
        'Real-time operational health for AGBA Express Gateway, Appwrite 2.6.1 TablesDB, multi-dimension pgvector RAG, and AES-256-GCM BYOK encryption vault.',
      canonicalPath: '/status',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'AGBA System Status & Readiness Probe',
        url: `${AGBA_CANONICAL_ORIGIN}/status`,
        description:
          'Live subsystem health checks for AGBA multi-tenant AI platform (Appwrite 2.6.1, pgvector, and BYOK security vault).',
      },
    };
  }

  if (viewMode === 'app' && activeModule === 'freestack') {
    const filtered =
      freeStackCategory === 'All'
        ? FREE_STACK_ENTRIES
        : FREE_STACK_ENTRIES.filter((e) => e.category === freeStackCategory);

    const catLabel = freeStackCategory === 'All' ? 'All 10 Categories' : freeStackCategory;
    const slug =
      freeStackCategory === 'All'
        ? '/?view=app&module=freestack'
        : `/?view=app&module=freestack&category=${encodeURIComponent(freeStackCategory)}`;

    return {
      title: `${catLabel} (${filtered.length} Verified Free Tiers) | AGBA Free Stack`,
      description: `Compare ${filtered.length} independently verified always-free ${catLabel.toLowerCase()} developer tools with official pricing links, limits, and verification dates on AGBA.`,
      canonicalPath: slug,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `AGBA Free Stack — ${catLabel}`,
        description: `Verified always-free developer and AI infrastructure tiers in ${catLabel}.`,
        numberOfItems: filtered.length,
        itemListElement: filtered.slice(0, 25).map((entry, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: entry.serviceName,
          description: `${entry.freeTierSummary} Verified on ${entry.verifiedOn}.`,
          url: entry.officialPricingUrl,
        })),
      },
    };
  }

  if (viewMode === 'app' && activeModule === 'academy') {
    const filtered =
      academyTrack === 'All'
        ? ACADEMY_TEMPLATES
        : ACADEMY_TEMPLATES.filter((t) => t.track === academyTrack);

    const trackLabel = academyTrack === 'All' ? 'All AI & RAG Blueprints' : `${academyTrack} Track`;
    const slug =
      academyTrack === 'All'
        ? '/?view=app&module=academy'
        : `/?view=app&module=academy&track=${encodeURIComponent(academyTrack)}`;

    return {
      title: `${trackLabel} (${filtered.length} Agent Templates) | AGBA Academy`,
      description: `Learn AI step by step with ${filtered.length} ready-to-import ${trackLabel.toLowerCase()} workflows for Gemini, OpenAI, Anthropic, Mistral, and local Ollama.`,
      canonicalPath: slug,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `AGBA Academy — ${trackLabel}`,
        description: `Interactive AI workflow blueprints and RAG tutorials (${trackLabel}).`,
        numberOfItems: filtered.length,
        itemListElement: filtered.map((tpl, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: tpl.title,
          description: `${tpl.summary} Estimated time: ${tpl.estimatedMinutes} minutes. Recommended model: ${tpl.recommendedModel}.`,
        })),
      },
    };
  }

  if (viewMode === 'app' && activeModule === 'studio') {
    return {
      title: 'AGBA Studio — Visual BYOK AI Workflow & Private RAG Builder',
      description:
        'Build visual AI workflows with your own Gemini, OpenAI, Anthropic, Mistral, or Ollama keys. Server-side AES-256-GCM key vault and tenant-isolated pgvector citations.',
      canonicalPath: '/?view=app&module=studio',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'AGBA Studio Workspace',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'All',
        description:
          'Visual AI workflow canvas with AES-256-GCM BYOK encryption, private multi-dimension pgvector RAG, and SSRF-guarded tools.',
      },
    };
  }

  return {
    title: AGBA_DEFAULT_SEO.title,
    description: AGBA_DEFAULT_SEO.description,
    canonicalPath: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'AGBA — Learn, Build & Ship AI',
      url: AGBA_CANONICAL_ORIGIN,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'All',
      description: AGBA_DEFAULT_SEO.description,
    },
  };
}

/**
 * Synchronizes document title, meta description, OpenGraph tags, canonical link,
 * and dynamic JSON-LD structured data in the browser DOM.
 */
export function syncBrowserSeo(meta: PageSeoMetadata): void {
  if (typeof document === 'undefined') return;

  document.title = meta.title;

  const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('meta[name="description"]', 'name', 'description', meta.description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);

  const canonicalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${meta.canonicalPath}`
      : `${AGBA_CANONICAL_ORIGIN}${meta.canonicalPath}`;

  setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);

  let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  let dynamicScript = document.getElementById('agba-dynamic-jsonld') as HTMLScriptElement | null;
  if (!dynamicScript) {
    dynamicScript = document.createElement('script');
    dynamicScript.id = 'agba-dynamic-jsonld';
    dynamicScript.type = 'application/ld+json';
    document.head.appendChild(dynamicScript);
  }
  dynamicScript.textContent = JSON.stringify(meta.jsonLd);
}

/**
 * Generates /sitemap.xml covering core routes + programmatic Free Stack category URLs + Academy track URLs.
 */
export function generateSitemapXml(baseUrl = AGBA_CANONICAL_ORIGIN): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const today = new Date().toISOString().split('T')[0];

  const urls: { loc: string; priority: string; changefreq: string }[] = [
    { loc: `${cleanBase}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${cleanBase}/status`, priority: '0.7', changefreq: 'hourly' },
    { loc: `${cleanBase}/llms.txt`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${cleanBase}/llms-full.txt`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${cleanBase}/?view=app&amp;module=studio`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${cleanBase}/?view=app&amp;module=academy`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${cleanBase}/?view=app&amp;module=freestack`, priority: '0.9', changefreq: 'daily' },
  ];

  for (const category of FREE_STACK_CATEGORIES) {
    urls.push({
      loc: `${cleanBase}/?view=app&amp;module=freestack&amp;category=${encodeURIComponent(category)}`,
      priority: '0.8',
      changefreq: 'weekly',
    });
  }

  for (const track of ['Starter', 'RAG Tutorial', 'Advanced Multi-Agent']) {
    urls.push({
      loc: `${cleanBase}/?view=app&amp;module=academy&amp;track=${encodeURIComponent(track)}`,
      priority: '0.8',
      changefreq: 'weekly',
    });
  }

  const entriesXml = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entriesXml}
</urlset>`;
}

/**
 * Generates /llms.txt (Generative Engine Optimization — GEO standard for ChatGPT, Perplexity, Claude, Gemini).
 */
export function generateLlmsTxt(baseUrl = AGBA_CANONICAL_ORIGIN): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const categoryBreakdown = FREE_STACK_CATEGORIES.map((cat) => {
    const count = FREE_STACK_ENTRIES.filter((e) => e.category === cat).length;
    return `- **${cat}** (${count} verified free tiers): ${cleanBase}/?view=app&module=freestack&category=${encodeURIComponent(cat)}`;
  }).join('\n');

  const templateBreakdown = ACADEMY_TEMPLATES.map(
    (tpl) =>
      `- **${tpl.title}** (${tpl.track}, ${tpl.estimatedMinutes} min, ${tpl.recommendedModel}): ${tpl.summary}`
  ).join('\n');

  return `# AGBA — Learn, Build & Ship AI

> AGBA (from the Yoruba word *àgbà* — respected elder and custodian of wisdom) is a multi-tenant AI learning, visual BYOK workflow studio, and verified always-free developer stack platform built in Lagos, Nigeria by Akinola Olujobi (Trendtactics Digital).

- Canonical Web App: ${cleanBase}
- GitHub Repository: ${AGBA_GITHUB_REPO}
- System Readiness & Status: ${cleanBase}/status
- Full Generative Knowledge Graph: ${cleanBase}/llms-full.txt

## Core Platform Pillars (AEO Summary)

1. **Learn (AGBA Academy):** ${ACADEMY_TEMPLATES.length} interactive AI & RAG workflow templates with step-by-step instructions. Supports Google Gemini, OpenAI, Anthropic (claude-sonnet-4-5), Mistral, and local open-weights models via Ollama.
2. **Build (AGBA Studio):** Three-pane visual AI workflow builder with Bring-Your-Own-Key (BYOK) model adapters, server-side AES-256-GCM key encryption (keys never leave the server or appear in browser responses except masked last 4 chars), strict workspace_id tenant isolation on Appwrite 2.6.1 TablesDB, and multi-dimension pgvector retrieval (768, 1024, 1536).
3. **Ship (AGBA Free Stack):** ${FREE_STACK_ENTRIES.length} independently verified always-free cloud, database, vector, auth, and AI developer tiers across ${FREE_STACK_CATEGORIES.length} categories, each linked to official vendor pricing docs with a recorded verification timestamp.

## Programmatic Free Stack Categories (${FREE_STACK_ENTRIES.length} Verified Services)

${categoryBreakdown}

## AGBA Academy Guided Agent Blueprints (${ACADEMY_TEMPLATES.length} Templates)

${templateBreakdown}

## Security & Governance Facts

- **Owner & Creator:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria.
- **Tenant Isolation:** Every database table and vector query is scoped by server-verified \`workspace_id\` and Appwrite 2.6.1 Team RBAC (\`owner\`, \`admin\`, \`member\`, \`viewer\`).
- **BYOK Encryption:** Envelope encryption using AES-256-GCM with 96-bit IV and 128-bit authentication tag.
- **SSRF & Tool Sandboxing:** Server-side outbound URL filter blocks RFC1918 private networks, loopback, link-local, and cloud metadata IPs (\`169.254.169.254\`).
`;
}

/**
 * Generates /llms-full.txt containing the complete programmatic directory of all 160 Free Stack services and 12 Academy templates.
 */
export function generateLlmsFullTxt(baseUrl = AGBA_CANONICAL_ORIGIN): string {
  const header = generateLlmsTxt(baseUrl);
  const fullFreeStack = FREE_STACK_CATEGORIES.map((cat) => {
    const items = FREE_STACK_ENTRIES.filter((e) => e.category === cat);
    const lines = items
      .map(
        (item) =>
          `  - **${item.serviceName}** (${item.officialPricingUrl}) — ${item.freeTierSummary} | Verified: ${item.verifiedOn}`
      )
      .join('\n');
    return `### ${cat} (${items.length} entries)\n${lines}`;
  }).join('\n\n');

  return `${header}\n---\n\n## Complete AGBA Free Stack Directory (${FREE_STACK_ENTRIES.length} Verified Entries)\n\n${fullFreeStack}\n`;
}
