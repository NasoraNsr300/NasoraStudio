# Nasora Studio

Web application for Nasora Studio's public portfolio, commission requests, member workflow, and sole-owner Admin workspace.

## Stack

- Next.js 16 / React 19 / TypeScript
- Supabase Auth and Postgres with RLS
- Cloudflare Workers through OpenNext
- Cloudflare R2 for private assets and payment slips
- Resend for transactional email
- Vitest and Playwright

## Local setup

Requirements: Node.js 22 or newer, npm, and Git.

```powershell
git clone https://github.com/NasoraNsr300/NasoraStudio.git
cd NasoraStudio
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Fill `.env.local` with the linked development services. Never commit this file. Public browser configuration uses the Supabase publishable key; `SUPABASE_SECRET_KEY`, R2 credentials, Resend credentials, PromptPay ID, and test passwords are server-only.

The local site runs at `http://localhost:3000`. Public routes use `/th` and `/en`; the protected owner workspace is `/admin`.

## Validation

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

The ordinary-customer lifecycle is intentionally opt-in because it changes the linked non-production database. Reset only the dedicated member before and after the run:

```powershell
npm run test:customer:reset
$env:RUN_TEST_CUSTOMER_E2E='1'
npm run test:e2e -- customer-commission-lifecycle.spec.ts
npm run test:customer:reset
```

See [ordinary-test-customer.md](docs/testing/ordinary-test-customer.md) for the safety boundary and [production-readiness-2026-08-19.md](docs/deployment/production-readiness-2026-08-19.md) for the current release gates.

## Database migrations

Migrations live in `supabase/migrations`. Discover the installed CLI commands with `supabase --help`; do not hand-invent migration timestamps. Before release, verify local/remote migration parity and run the linked database lint.

## Cloudflare release boundary

`npm run preview` builds and previews the Worker. `npm run deploy` changes the live Cloudflare account and must only run after the production hostname, Worker secrets, OAuth redirects, email sender domain, current build, and browser smoke checks are all accepted.

The maintenance Worker uses `wrangler.maintenance.jsonc`. Payment slips in `nasora-payment-slips/payment-slips/` are covered by a 30-day R2 lifecycle rule; private application assets remain governed by application cleanup and retention rules.
