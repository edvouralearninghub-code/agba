# CONTRIBUTING.md — Engineering & Contribution Guidelines

Thank you for contributing to **AGBA** (Trendtactics Digital, Lagos, Nigeria).

## 1. Before You Begin

1. Read `SECURITY.md`, `ARCHITECTURE.md`, `DECISIONS.md`, and `THIRD_PARTY_NOTICES.md`.
2. Ensure Node.js 22+ is installed.
3. Copy `.env.example` to `.env` and never commit real credentials.

## 2. Development Workflow

- **Start development server:** `npm run dev`
- **Typecheck:** `npm run lint`
- **Run Phase 0 verification & security suite:** `npm run verify:phase0`
- **Production build:** `npm run build`

## 3. Coding Standards

- **TypeScript Strictness:** Do not use `any` unless accompanied by an inline justification comment explaining why a external type requires it.
- **Security by Default:**
  - All API routes must validate input using `zod`.
  - All database and vector operations must require and filter by `workspace_id`.
  - Never log or return unmasked API keys.
- **Accessibility & Design Tokens:**
  - All UI surfaces must support Light (`#FAF6EC`) and Dark (`#0E1030`) themes and pass WCAG AA contrast (`4.5:1` body text, `3.0:1` large text).
  - Respect `prefers-reduced-motion`.
  - Test every screen down to `360px` mobile viewport width.
- **Licensing:**
  - Only permissive open-source dependencies (`MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`) may be added.
  - Update `THIRD_PARTY_NOTICES.md` and run `npm run verify:phase0` whenever `package.json` changes.

## 4. Commit Messages & Pull Requests

Use Conventional Commits:
- `feat(studio): add allowlisted calculator tool node`
- `fix(security): block IPv6 link-local range in SSRF validator`
- `docs(decisions): record Appwrite VectorsDB evaluation`
