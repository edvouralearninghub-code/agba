# AGBA Production Deployment Guide (Dual-Backend: Appwrite 2.6.0 + Firebase + pgvector)

> **Owner:** Akinola Olujobi, Trendtactics Digital, Lagos, Nigeria  
> **Self-Hosted Coolify Runbook:** See [`docs/DEPLOY_COOLIFY.md`](./DEPLOY_COOLIFY.md)

This guide explains how AGBA's **Dual-Backend Bridge** operates in production and how to deploy it on **Self-Hosted Coolify / Docker** (recommended for commercial production) or cloud free tiers.

---

## 1. Important Commercial Licensing Note on Vercel Hobby Plan

- **Vercel Hobby Plan is strictly non-commercial** under Vercel's Terms of Service and cannot run a persistent Express + Docker backend (`server.ts`, Appwrite, or `pgvector`).
- Therefore, `vercel.json` has been removed from the production path. For commercial SaaS hosting at **$0 infrastructure cost**, deploy AGBA + Appwrite `2.6.0` + `pgvector` on an **Oracle Cloud Always Free ARM VM (`2 OCPU, 12 GB RAM`)** or Ubuntu VPS using **Coolify** — see [`docs/DEPLOY_COOLIFY.md`](./DEPLOY_COOLIFY.md) for the complete step-by-step guide.

---

## 2. How the Dual-Backend Bridge Works (Firebase + Appwrite 2.6.0)

Per owner directive, AGBA keeps **both** backends active without conflict:
1. **Firebase Authentication & Cloud Firestore (`firebase-applet-config.json` + `firestore.rules`):**
   - Already provisioned and live in project `gen-lang-client-0795320136` (database `ai-studio-agbalearnbuildsh-a53a94be-10ea-4f1e-a1fc-d349a9bedcde`).
   - Enforces the 12 Dirty Dozen security rules at the Firestore edge.
2. **Appwrite `2.6.0` (`TablesDB` + Storage Bucket `rag_files` + Teams):**
   - Defined declaratively in [`appwrite.json`](../appwrite.json) with 9 `TablesDB` tables (`admins`, `workspaces`, `workflows`, `free_stack_entries`, `byok_keys`, `rag_documents`, `webhook_events`, `usage`, `audit_log`) and Storage bucket `rag_files`.
   - Provisioned via `npm run bootstrap:appwrite`.

### Appwrite Cloud Free Plan vs. Self-Hosted Docker Quotas
If you use **Appwrite Cloud Free Plan (`cloud.appwrite.io`)** for initial testing, note the verified monthly limits:
- **Bandwidth:** 5 GB / month
- **Storage:** 2 GB
- **Auth:** 75,000 MAU
- **Databases:** 500,000 reads / 250,000 writes
- **Compute:** 750,000 executions (100 GB-hours)

When you run `infra/appwrite/docker-compose.yml` on your own Docker host or Coolify server, those 5 GB bandwidth and 2 GB storage cloud caps are completely removed.

---

## 3. Running Locally or on Your Server with Docker

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Start the self-hosted Appwrite `2.6.0` + MariaDB + Redis + `pgvector` + Mailpit stack:
   ```bash
   docker compose -f infra/appwrite/docker-compose.yml up -d
   ```
3. Bootstrap the Appwrite `2.6.0` `TablesDB` schema and `rag_files` bucket:
   ```bash
   npm run bootstrap:appwrite
   ```
4. Start the AGBA platform container:
   ```bash
   docker compose up -d --build
   ```
5. Verify all security, Firestore rules, Appwrite `2.6.0` parity, and multi-tenant isolation checks:
   ```bash
   npm run verify:phase0
   ```
