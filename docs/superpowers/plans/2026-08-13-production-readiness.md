# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the six approved interaction, live-content, customer E2E, visual-regression, and deployment-readiness workstreams while preserving the approved UI.

**Architecture:** Keep each behavior inside its current feature boundary, extend the existing one-row Site Settings contract for public contact content, and exercise the existing Supabase/R2/Cloudflare gateways rather than adding parallel systems. Functional tests gate visual snapshots, and all checks gate deployment.

**Tech Stack:** Next.js 16.3, React 19, TypeScript 6, Supabase Postgres/Auth, Cloudflare Workers/R2, Vitest/Testing Library, Playwright, OpenNext.

## Global Constraints

- Preserve the current approved visual layout; only necessary interaction and 44 px touch-target styling is allowed.
- Use the existing linked worktree and make checkpoint commits.
- Exactly one ordinary test customer is allowed: `customer.test@nasora.local`.
- Do not expose Supabase secrets, R2 credentials, CRON secrets, Brevo keys, or the test password.
- Do not deploy the production Worker while any build, migration, storage, email, or E2E gate is unresolved.
- Every feature or bug fix follows RED → GREEN → refactor.

---

### Task 1: Complete existing interactions

**Files:**
- Modify: `src/features/member/components/member-requests-page.tsx`
- Modify: `src/features/admin/estimates/components/admin-estimate-inbox.tsx`
- Modify: `src/features/commission/components/service-detail-dialog.tsx`
- Modify: `src/shared/components/public-shell/floating-navbar.tsx`
- Modify: `src/shared/components/public-shell/public-shell.module.css`
- Test: `tests/components/member-requests-page.test.tsx`
- Test: `tests/components/admin-estimate-inbox.test.tsx`
- Test: `tests/components/service-detail-dialog.test.tsx`
- Test: `tests/components/public-shell.test.tsx`

**Interfaces:**
- Produces working route navigation, in-place Admin filtering/sorting, accessible image preview, and Home-to-Portfolio search.

- [ ] Write failing component tests for each inert action and the 44 px language control.
- [ ] Run the focused tests and confirm failures are caused by missing behavior.
- [ ] Implement the smallest behavior using current routes, search parameters, and dialog patterns.
- [ ] Run focused tests and the existing public/member/admin component suites.
- [ ] Commit the interaction checkpoint.

### Task 2: Make Home featured deep links open Portfolio lightbox

**Files:**
- Modify: `src/app/[locale]/portfolio/page.tsx`
- Modify: `src/features/portfolio/components/portfolio-search.tsx`
- Test: `tests/components/portfolio-search.test.tsx`
- Test: `tests/e2e/public-pages.spec.ts`

**Interfaces:**
- Consumes `work` from the URL and passes it unchanged to `PortfolioGallery.initialWork`.

- [ ] Add a failing route/component test showing `?work=<id>` selects the item.
- [ ] Run the focused test and capture the expected failure.
- [ ] Forward server/client search parameters through the existing `PortfolioSearch` boundary.
- [ ] Run the focused test and Home → Portfolio Playwright scenario.
- [ ] Commit the deep-link checkpoint.

### Task 3: Persist About and contact settings

**Files:**
- Create via `npx supabase migration new public_about_contact_settings`: `supabase/migrations/<generated>_public_about_contact_settings.sql`
- Modify: `src/features/site-settings/domain/site-settings.ts`
- Modify: `src/features/site-settings/data/public-site-settings-repository.server.ts`
- Modify: `src/features/site-settings/data/admin-site-settings-repository.server.ts`
- Modify: `src/features/site-settings/components/admin-site-settings-form.tsx`
- Modify: `src/features/about/components/about-page.tsx`
- Modify: `src/app/[locale]/about/page.tsx`
- Modify: `src/features/member/components/member-sidebar.tsx`
- Modify: `.env.example`
- Test: `src/features/site-settings/__tests__/site-settings-domain.test.ts`
- Test: `src/features/site-settings/__tests__/site-settings-migration-contract.test.ts`
- Test: `tests/components/admin-site-settings-form.test.tsx`
- Test: `tests/components/about-page.test.tsx`
- Test: `tests/components/member-sidebar.test.tsx`

**Interfaces:**
- Extends `PublicSiteSettings`/`AdminSiteSettings` with localized About copy plus safe contact email and Instagram URL.
- Extends `admin_save_site_settings` with validated arguments while retaining sole-Admin authorization and column-scoped public reads.

- [ ] Add failing domain, migration-contract, repository, Admin form, About, and member support tests.
- [ ] Run focused tests and confirm schema/projection/UI failures.
- [ ] Generate the migration with Supabase CLI and implement additive columns, constraints, grants, RLS-safe reads, and guarded RPCs.
- [ ] Update repositories, Admin Settings inputs, About route, and member support link.
- [ ] Run focused tests, Supabase migration listing, and safe live verification if available.
- [ ] Commit the Site Settings checkpoint.

### Task 4: Exercise one ordinary customer through Browser E2E

**Files:**
- Modify: `tests/e2e/customer-commission-lifecycle.spec.ts`
- Modify: `tests/e2e/fixtures/test-customer.ts`
- Modify: `scripts/reset-test-customer.mjs`
- Modify: `docs/testing/ordinary-test-customer.md`
- Modify locally only: `.env.local`

**Interfaces:**
- Produces a repeatable sign-in → Admin denial → estimate submit → member list → cancel flow for only `customer.test@nasora.local`.

- [ ] Add the browser scenario and prove it skips/fails before local credentials/account reset.
- [ ] Generate a local-only strong password, add E2E flags to ignored `.env.local`, and run `npm run test:customer:reset`.
- [ ] Execute the customer Playwright scenario and fix only evidenced integration defects using RED → GREEN tests.
- [ ] Reset the account again and rerun to prove repeatability.
- [ ] Commit tests/docs without committing credentials.

### Task 5: Reconcile visual regression baselines

**Files:**
- Modify: `tests/e2e/visual-regression.spec.ts`
- Modify: `tests/e2e/visual-regression.spec.ts-snapshots/*.png`

**Interfaces:**
- Produces current desktop/mobile baselines from live stable content after all functional scenarios pass.

- [ ] Run functional public E2E first; stop if any nonvisual scenario fails.
- [ ] Run visual regression without update and inspect every actual/diff artifact.
- [ ] Replace obsolete fixture-specific selectors with stable live-data selectors.
- [ ] Update snapshots, inspect representative desktop/mobile images, then rerun without update.
- [ ] Commit the visual baseline checkpoint.

### Task 6: Close deployment and performance gates

**Files:**
- Modify: `.env.example`
- Modify: `docs/deployment/cloudflare-workers.md`
- Modify: `docs/performance/2026-08-12-optimization-report.md`
- Modify if required by evidence: `wrangler.jsonc`
- Modify if required by evidence: `wrangler.maintenance.jsonc`

**Interfaces:**
- Produces a complete secret inventory, verified R2 30-day lifecycle/maintenance path, OpenNext build/preview result, and explicit go/no-go deployment report.

- [ ] Verify Node/npm, Wrangler authentication, Supabase migration parity/advisors, and all required environment variable names without printing values.
- [ ] Verify or configure the private R2 bucket lifecycle and maintenance Worker schedule using Wrangler-discovered commands.
- [ ] Run full Vitest, typecheck, lint, Next/OpenNext build, Playwright functional/visual suites, and local Worker preview smoke test.
- [ ] Measure key page performance in the browser and document observed results without fabricated metrics.
- [ ] If Brevo or another external credential is missing, leave production deployment blocked and document the exact key needed; otherwise deploy and smoke-test the Worker URL.
- [ ] Review the complete diff, confirm no mock runtime paths or secrets remain, and commit the deployment-readiness report.

