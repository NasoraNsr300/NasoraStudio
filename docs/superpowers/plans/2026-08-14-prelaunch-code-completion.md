# Prelaunch Code Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining Version 1 framework, authentication, draft, responsive, browser-E2E, and measured-performance work while leaving deployment untouched.

**Architecture:** Deliver five isolated checkpoints on `feature/nasora-public`. Preserve current desktop UI and business behavior in checkpoints 1–3, pause for explicit approval after the responsive audit, then validate the complete customer lifecycle and optimize only measured bottlenecks.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript 6, Supabase Auth/Postgres/RLS, Cloudflare R2/OpenNext, Vitest, Testing Library, and Playwright.

## Global Constraints

- Do not deploy, attach a custom domain, or mutate production data.
- Do not modify already-applied migration files; use forward-only generated migrations.
- Follow test-first RED → GREEN → refactor for every behavior change.
- Preserve sole-Admin authorization and existing payment/job transaction behavior.
- Do not alter approved desktop UI in checkpoints 1–3.
- Do not implement responsive visual changes until Nasora approves the audit proposal.
- Member drafts are owner-only in Supabase; Guest drafts stay in versioned browser storage.
- Reference attachments are excluded from drafts and must be selected again.
- Commit each checkpoint independently and exclude generated/unrelated working-tree changes.

---

### Task 1: Cloudflare request-boundary compatibility and SQL lint cleanup

**Files:**
- Preserve: `src/middleware.ts`
- Modify: `tests/unit/cloudflare-deploy-readiness.test.ts`
- Create through `supabase migration new`, then rename: `supabase/migrations/20260814120000_prelaunch_sql_warning_cleanup.sql`
- Create: `tests/unit/prelaunch-sql-warning-cleanup-migration.test.ts`
- Modify: `docs/deployment/cloudflare-workers.md`

**Interfaces:**
- Consumes: existing Supabase SSR cookie refresh behavior from `src/middleware.ts` and existing payment/quote functions.
- Produces: a documented Cloudflare compatibility exception backed by an OpenNext build; forward-only function replacements with identical signatures and grants.

- [x] **Step 1: Test the proxy convention against both build targets**

The Next production build accepted `src/proxy.ts`, while the real OpenNext Cloudflare 1.20.2 build failed with `Node.js middleware is not currently supported`. This proved the repository's existing Cloudflare readiness contract is still required.

- [x] **Step 2: Preserve Edge middleware and document the exception**

Keep `src/middleware.ts`, its current Supabase cookie/session logic, and matcher unchanged. Record that a future Vercel target can derive `proxy.ts` without forking business logic, but do not add deployment-target generation in this checkpoint.

- [x] **Step 3: Capture linked database lint evidence**

Run the linked Supabase lint command documented in `docs/deployment/cloudflare-workers.md`. Record the exact unused declarations and function signatures; do not infer from old migration files when the linked definition differs.

- [x] **Step 4: Add a failing migration contract test**

The test reads `20260814120000_prelaunch_sql_warning_cleanup.sql` and asserts each affected function is replaced with the same argument/return contract, explicit fixed `search_path`, required authorization checks, grants/revokes, and no declarations reported by linked lint. Run the focused test; expect failure because the migration is absent.

- [x] **Step 5: Generate and implement the forward migration**

Use `npx supabase migration new prelaunch_sql_warning_cleanup`, rename the generated empty file to the exact plan path, and copy the current linked function bodies while removing only proven-unused declarations. Preserve arithmetic, row locks, idempotency, transaction ordering, audit writes, `security definer`, and effective execute privileges.

- [x] **Step 6: Verify checkpoint 1**

Run focused tests, `npm run typecheck`, `npm run lint`, `npm run build`, linked migration parity, and linked database lint. Update the deployment document with fresh evidence. Commit only checkpoint files as `chore: finish framework and database cleanup`.

---

### Task 2: Google OAuth with safe return paths

**Files:**
- Modify: `src/shared/auth/auth-types.ts`
- Modify: `src/shared/auth/auth-session-provider.tsx`
- Modify: `src/shared/auth/auth-dialog.tsx`
- Modify: `src/shared/auth/return-target.ts`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `tests/components/auth-session-provider.test.tsx`
- Modify: `tests/components/auth-dialog.test.tsx`
- Modify: `tests/unit/return-target.test.ts`
- Create: `tests/unit/auth-callback-route.test.ts`
- Modify: `docs/deployment/cloudflare-workers.md`

**Interfaces:**
- Consumes: Supabase browser `auth.signInWithOAuth`, existing PKCE callback exchange, locale, and the current page path.
- Produces: `signInWithGoogle({ locale, returnTo }): Promise<AuthOperationResult>` and a same-origin callback URL `/auth/callback?locale=<locale>&next=<encoded-relative-path>`.

- [x] **Step 1: Verify current Supabase OAuth guidance**

Read the current Supabase changelog and official Google Auth/SSR PKCE documentation. Confirm redirect allowlist requirements and callback exchange behavior before writing production code.

- [x] **Step 2: Add failing provider and return-target tests**

Tests require the provider to call `signInWithOAuth({ provider: "google", options: { redirectTo } })`, the dialog button to be enabled with pending/error feedback, and return validation to accept same-origin locale routes while rejecting protocols, protocol-relative URLs, foreign origins, and locale mismatches. Run the four focused test files; expect the missing method/disabled button failures.

- [x] **Step 3: Implement OAuth without changing the dialog layout**

Extend `AuthClientLike` and `AuthSessionValue`, build the callback URL from `window.location.origin`, locale, and a validated relative path, invoke OAuth from the existing Google button, disable it only while pending, and localize failures through the existing error presentation. Remove the unavailable badge without changing spacing or styling structure.

- [x] **Step 4: Harden the callback**

Generalize the return-target helper to approved application-local paths, keep member fallbacks for guards, exchange the code exactly once, and redirect callback errors to the locale home authentication dialog. Add route tests for success, missing code, exchange error, unsafe targets, and locale preservation.

- [x] **Step 5: Verify checkpoint 2**

Run focused auth tests, full auth/security tests, typecheck, lint, and build. Confirm required Google provider/redirect configuration without committing secrets. Commit as `feat(auth): enable Google sign in`.

---

### Task 3: Member and Guest estimate drafts

**Files:**
- Create through `supabase migration new`, then rename: `supabase/migrations/20260814130000_member_estimate_drafts.sql`
- Create: `tests/unit/member-estimate-drafts-migration.test.ts`
- Create: `src/features/commission/domain/estimate-draft.ts`
- Create: `tests/unit/estimate-draft.test.ts`
- Create: `src/features/commission/data/estimate-draft-repository.ts`
- Create: `tests/unit/estimate-draft-repository.test.ts`
- Modify: `src/features/commission/components/estimate-request-dialog.tsx`
- Modify: `tests/components/estimate-request-dialog.test.tsx`

**Interfaces:**
- Consumes: service type slug, authenticated user identity, validated form fields, existing submit result, Supabase browser client, and `localStorage`.
- Produces: `EstimateDraftValues`, `createMemberEstimateDraftRepository(client)`, `createGuestEstimateDraftRepository(storage)`, and `draftKey(serviceTypeSlug)`.

- [x] **Step 1: Add failing schema and RLS contract tests**

Require a `public.estimate_request_drafts` table keyed uniquely by `(user_id, service_type_slug)`, timestamps, bounded JSON payload, RLS ownership predicates using `auth.uid()`, explicit authenticated grants, no anon table grant, and updated-at behavior. Run the focused migration test; expect failure.

- [x] **Step 2: Generate and implement the draft migration**

Use `npx supabase migration new member_estimate_drafts`, rename it to the exact plan path, create the table/index/trigger/policies/grants, and keep Admin/service-role access outside the browser repository. Verify the SQL contract test.

- [x] **Step 3: Add failing domain and repository tests**

Define the persisted draft as version `1` with usage type, budget mode/range, requested deadline, description, mood/style, counts, Guest identity only for Guest local storage, and saved timestamp. Tests reject obsolete versions, unknown fields, oversized text, invalid dates/counts/budgets, and payloads above the chosen JSON size cap. Repository tests cover member upsert/load/delete and defensive local-storage load/save/delete scoped by service slug.

- [x] **Step 4: Implement isolated draft domain/repositories**

Use Zod parsing at every persistence boundary. Member operations filter by the authenticated RLS row and service slug. Guest keys use `nasora:estimate-draft:v1:<service-slug>`; malformed values are removed. Do not persist submission keys, accepted-legal state, request codes, or file objects.

- [x] **Step 5: Add failing dialog behavior tests**

Cover member restore, Guest restore, mode isolation, explicit save feedback, save failure retaining fields, excluding references, clearing only after confirmed submit success, retaining after ambiguous failure, and explaining that attachments must be selected again. Run the dialog tests; expect the disabled Save button and missing restore behavior to fail.

- [x] **Step 6: Connect the existing dialog UI**

Enable the existing Save button, hydrate once per resolved mode/service identity, map controlled fields through the domain parser, show localized saved/restored/error feedback in the existing feedback area, and delete the matching draft after successful submission. Preserve current Desktop DOM structure and CSS.

- [x] **Step 7: Verify checkpoint 3**

Run all draft/commission tests, typecheck, lint, build, linked migration apply/parity, database lint, and member/Guest RLS checks. Commit as `feat(commissions): persist estimate drafts`.

---

### Task 4: Responsive audit and approval gate

**Files:**
- Create: `docs/testing/2026-08-14-responsive-audit.md`
- Modify only after approval: page/component CSS files named in the approved audit
- Modify only after approval: `tests/components/responsive-media.test.tsx`
- Modify only after approval: `tests/e2e/visual-regression.spec.ts`
- Update only after approval: affected snapshots under `tests/e2e/visual-regression.spec.ts-snapshots/`

**Interfaces:**
- Consumes: current live pages, existing 390×844 snapshots, Desktop layouts, reduced-motion behavior, and browser screenshots.
- Produces: page-by-page findings with viewport, reproduction, proposed adjustment, and approval status; then approved responsive CSS only.

- [x] **Step 1: Audit without altering UI**

Run public, auth, estimate modal, member, and Admin pages at 390×844, 768×1024, and the Desktop baseline. Check horizontal overflow, nested scrolling, sticky/fixed regions, dialogs, tables, images, touch targets, virtual keyboard space, sidebar behavior, and reduced motion. Save screenshots only where a finding needs visual evidence.

- [x] **Step 2: Present proposed UI changes and pause**

Write the audit with exact selectors/components and recommended visual effect. Ask Nasora for approval. Do not edit UI CSS, JSX layout, or snapshots before approval.

- [x] **Step 3: Add failing responsive assertions after approval**

For each approved finding, add the narrowest component/CSS contract or Playwright visual/behavior test that demonstrates the problem. Run focused tests and observe the expected failures.

- [x] **Step 4: Implement only approved adjustments**

Change only files named in the approved audit. Preserve Night/Autumn styling and Desktop geometry. Re-run phone, tablet, Desktop, keyboard, and reduced-motion checks.

- [x] **Step 5: Verify checkpoint 4**

Run responsive/component tests, approved visual snapshots, accessibility checks, typecheck, lint, and build. Commit audit and approved fixes as `fix(ui): complete responsive layouts`.

---

### Task 5: Full lifecycle E2E, measured optimization, and clean merge readiness

**Files:**
- Modify: `tests/e2e/customer-commission-lifecycle.spec.ts`
- Modify as required by observed bugs: focused source/test files only
- Modify: `docs/testing/ordinary-test-customer.md`
- Modify: `docs/performance/2026-08-12-optimization-report.md`
- Modify: `docs/deployment/cloudflare-workers.md`

**Interfaces:**
- Consumes: disposable ordinary test customer, linked non-production Supabase, test R2 buckets, real application routes, and approved responsive UI.
- Produces: repeatable estimate-to-delivery E2E evidence, browser performance evidence, targeted optimizations, and a clean branch ready for later merge.

- [x] **Step 1: Confirm safe test environment**

Verify project identity is non-production, reset guard is enabled only for the dedicated test user, R2 test objects use lifecycle cleanup, commissions can be opened for the test, and no production URL/key is present. Stop rather than run destructive reset if any identity check fails.

- [ ] **Step 2: Extend the lifecycle test test-first**

Cover Google/email authentication boundary as available, member draft restore/delete, Guest local draft, estimate submission, Admin review/quote, PromptPay intent, slip upload/verification, job/queue creation, status progression, messages/images, installment/final payment, delivery download/Drive redirect, and avatar/session synchronization. For each newly exposed bug, add or retain the failing focused regression before changing production code.

Implemented browser coverage for email authentication/Admin denial, Member and Guest drafts, estimate submit/cancel, and avatar/session synchronization. Admin quote-to-delivery browser coverage remains blocked by the sole-Admin credential boundary; existing unit/integration coverage is retained rather than adding an Admin bypass.

- [ ] **Step 3: Run and repair the real workflow**

Execute the guarded reset and Playwright lifecycle against disposable resources. Fix only reproduced defects using focused RED → GREEN cycles. Repeat until the full workflow is deterministic and cleanup succeeds.

- [x] **Step 4: Measure before optimizing**

Record Home/Portfolio LCP and CLS, image derivative cache headers, relevant interaction latency, route payload behavior, and reduced-motion particle suppression at phone and Desktop baselines. Add a regression test or explicit measurable acceptance threshold before each optimization.

- [x] **Step 5: Implement measured optimizations**

Adjust only proven bottlenecks in image priority/sizing, cache headers, query shape, code splitting, or animation scheduling. Do not redesign UI. Re-measure the same flows and record before/after evidence.

- [ ] **Step 6: Run final merge-readiness gate**

Run full Vitest, typecheck, lint, Next build, OpenNext build, complete Playwright suites, Wrangler dry-runs, linked migration parity, database lint/advisors, RLS/role checks, `git diff --check`, and clean status review. Restore generated `next-env.d.ts` if it is the only build artifact. Update readiness docs with exact results.

All local gates, OpenNext, both Wrangler dry-runs, performance checks, and functional Playwright passed. A fresh linked Supabase CLI parity/lint rerun is blocked by `SUPABASE_DB_PASSWORD` authentication and must be repeated after the credential is refreshed.

- [ ] **Step 7: Commit without deploying or merging**

Commit E2E/optimization/readiness changes as `perf: finish prelaunch verification`. Leave `feature/nasora-public` ready for a later explicitly authorized clean merge. Do not run deploy, push, merge, or production migration commands.
