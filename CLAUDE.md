# CLAUDE.md — Agent Context & Technical Standards

This file mirrors and complements `AGENTS.md` for Claude and compatible coding assistants working on AGBA.

## Core Commands

- `npm run dev` — Starts the full-stack Express + Vite server on port 3000 (`tsx server.ts`).
- `npm run build` — Compiles the production frontend bundle (`vite build`).
- `npm run lint` — Runs strict TypeScript typechecking (`tsc --noEmit`).
- `npm run verify:phase0` — Executes the Phase 0 verification suite (`tsx scripts/verify-phase0.ts`), covering:
  - Cross-tenant database & vector isolation tests
  - AES-256-GCM BYOK encryption/decryption and UI masking tests
  - SSRF private/loopback/metadata IP blocker tests
  - Paystack HMAC-SHA512 webhook signature & idempotency tests
  - WCAG AA contrast ratio check across all `--agba-*` light/dark token pairs
  - Automated license register check against `package.json` and `THIRD_PARTY_NOTICES.md`

## Code Quality Rules

- **Strict TypeScript:** Avoid `any`. If unavoidable at an external boundary, include an explicit comment explaining why.
- **Validation:** Validate all server API inputs with `zod`.
- **Multi-Tenancy:** Every workspace-scoped API handler and data store query requires an explicit, authenticated `workspace_id` verified against the caller's team membership.
- **Design Tokens:** Use the AGBA color tokens (`--agba-indigo-950`, `--agba-indigo-800`, `--agba-indigo-600`, `--agba-gold-500`, `--agba-cream-50`, `--agba-ink-900`, `--agba-success`, `--agba-warning`, `--agba-danger`) and typography (`Fraunces`, `Inter`, `JetBrains Mono`).
