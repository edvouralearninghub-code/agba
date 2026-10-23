# THIRD_PARTY_NOTICES.md — Dependency & Reference License Register

> Maintained continuously and verified automatically by `scripts/verify-phase0.ts`.  
> Approved License Allowlist: `Apache-2.0`, `MIT`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`.

---

## 1. Installed Runtime & Development Packages (`package.json`)

| Package | Version Range | License | Usage in AGBA |
|---|---|---|---|
| `@google/genai` | `^2.4.0` | `Apache-2.0` | Server-side Google Gemini model & embedding adapter |
| `@tailwindcss/vite` | `^4.3.3` | `MIT` | Tailwind CSS v4 Vite build plugin |
| `@vitejs/plugin-react` | `^6.1.1` | `MIT` | React compiler plugin for Vite |
| `dotenv` | `^17.2.3` | `BSD-2-Clause` | Server environment variable loader |
| `express` | `^4.21.2` | `MIT` | Backend HTTP API gateway & webhook router |
| `lucide-react` | `^0.546.0` | `ISC` | Accessible SVG icon library |
| `motion` | `^12.23.24` | `MIT` | Restrained UI transitions (respects `prefers-reduced-motion`) |
| `react` | `^19.0.1` | `MIT` | Core UI component library |
| `react-dom` | `^19.0.1` | `MIT` | DOM renderer for React |
| `vite` | `^8.3.0` | `MIT` | Frontend bundler and dev server |
| `zod` | `^3.24.0` / `^4.0.0` | `MIT` | Server-side and client-side schema validation |
| `@types/express` | `^4.17.21` | `MIT` | TypeScript definitions for Express |
| `@types/node` | `^22.14.0` | `MIT` | TypeScript definitions for Node.js |
| `@types/react` | `^19.3.0` | `MIT` | TypeScript definitions for React |
| `@types/react-dom` | `^19.3.0` | `MIT` | TypeScript definitions for React DOM |
| `autoprefixer` | `^10.4.21` | `MIT` | CSS vendor prefixing |
| `esbuild` | `^0.25.0` | `MIT` | JavaScript/TypeScript bundler |
| `tailwindcss` | `^4.3.3` | `MIT` | Utility-first CSS framework |
| `tsx` | `^4.21.0` | `MIT` | TypeScript execution engine for server and verification scripts |
| `typescript` | `^7.0.2` | `Apache-2.0` | Strict static type checker |

---

## 2. Target Platform & Reference Repository Compliance Register

| Project / Service | Repository URL | License | Compliance Rule & How Used in AGBA |
|---|---|---|---|
| **Appwrite** | `https://github.com/appwrite/appwrite` | `BSD-3-Clause` | Target backend platform (Auth, Teams, Databases, Storage, Functions). Copyright & BSD-3-Clause notice preserved. |
| **Neon / PostgreSQL + pgvector** | `https://github.com/pgvector/pgvector` | `PostgreSQL` (Permissive) | Vector similarity store with `workspace_id` isolation. |
| **Flowise (Core)** | `https://github.com/FlowiseAI/Flowise` | `Apache-2.0` | Core node execution concepts only. **`packages/server/src/enterprise` is strictly excluded and never enabled.** |
| **Strapi Community Edition** | `https://github.com/strapi/strapi` | `MIT` (Community) | Content engine for directory/docs. **All `ee/` directories are strictly excluded.** |
| **Novu** | `https://github.com/novuhq/novu` | `MIT` (Core packages) | Transactional notification workflows. Only MIT-licensed core SDK/APIs used; enterprise modules excluded. |
| **awesome-llm-apps** | `https://github.com/Shubhamsaboo/awesome-llm-apps` | `Apache-2.0` | Inspires Academy starter agent concepts (Travel Planner, Financial Coach, Data Analyst, Blog-to-Podcast). All code and prompts in AGBA are written from scratch with attribution here. |
| **Dify** | `https://github.com/langgenius/dify` | Dify Open Source License (Restricted) | **Zero code, UI, layout, or assets used.** Referenced solely to understand high-level category expectations. |
| **free-for-dev** | `https://github.com/ripienaar/free-for-dev` | Unspecified in root | **Zero text or lists copied.** AGBA Free Stack entries are independently researched, written in original prose, and dated. |
| **Medusa (Core)** | `https://github.com/medusajs/medusa` | `MIT` | Optional Phase 5 evaluation only (not used in v1). |
| **Claude SEO Suite** | `https://github.com/AgriciDaniel/claude-seo` | `MIT` | Inspires AGBA's AI SEO, Schema.org JSON-LD, Core Web Vitals, and GEO/AEO audit agent workflow and Free Stack entry. |
| **OpenWork (Core)** | `https://github.com/different-ai/openwork` | `MIT` (Core outside `ee/`) | Inspires AGBA's autonomous AI coworker & task orchestration template. **All `ee/` Enterprise Edition files are strictly excluded.** |
| **Awesome MCP Servers** | `https://github.com/punkpeye/awesome-mcp-servers` | `MIT` | Model Context Protocol (MCP) server directory and connector patterns for AGBA Studio tool bindings. |
| **Mattermost (Team Edition)** | `https://github.com/mattermost/mattermost` | `Apache-2.0` (Core / Webhooks) | Self-hosted Team Collaboration & ChatOps webhook integration. **Enterprise-licensed modules are strictly excluded.** |
| **Plausible Analytics CE** | `https://github.com/plausible/analytics` | `AGPL-3.0` (Server) / Permissive (Tracker) | Listed in AGBA Free Stack and integrated solely via external HTTP Events API / lightweight script tracker (**zero AGPL-3.0 server code linked or bundled**). |

