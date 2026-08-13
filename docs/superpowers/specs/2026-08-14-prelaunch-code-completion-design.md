# Prelaunch Code Completion Design

## Goal

Finish the remaining Version 1 code work before deployment: preserve a Cloudflare-compatible request boundary, remove current database lint warnings without changing payment behavior, enable Google authentication, add estimate-request drafts, complete an approved mobile/responsive pass, run the real browser lifecycle, optimize measured bottlenecks, and leave the branch ready for a clean merge. Deployment is explicitly out of scope.

## Delivery checkpoints

Work is divided into independently reviewable checkpoints:

1. **Framework and database cleanup** — verify the request boundary against both Next.js and the active Cloudflare adapter, then add a forward-only Supabase migration that removes unused PL/pgSQL declarations while preserving function contracts and transactional behavior.
2. **Google authentication** — enable the existing Google button through Supabase OAuth, preserve the current locale and return path, and reuse the current callback/session/profile synchronization flow.
3. **Estimate drafts** — store member drafts in Supabase under owner-only RLS and Guest drafts in browser `localStorage`; restore the matching service draft when the form opens and remove it after successful submission.
4. **Mobile/responsive review** — audit all public, member, authentication, estimate, and Admin pages. No visual change is implemented until Nasora approves the proposed UI changes.
5. **Browser E2E and optimization** — exercise the estimate-to-delivery lifecycle against disposable/test Supabase and R2 resources, fix discovered regressions, collect browser performance evidence, optimize measured bottlenecks, and run final merge-readiness verification.

Each checkpoint is committed separately. No production deployment, custom-domain attachment, or production data mutation is authorized.

## Framework migration

Next.js 16 prefers the `proxy.ts` convention, but OpenNext Cloudflare 1.20.2 rejects Node Proxy with `Node.js middleware is not currently supported`. The Cloudflare target therefore retains Edge `middleware.ts` with unchanged matching rules, authentication cookies, locale handling, redirects, and authorization. A future Vercel target may materialize `proxy.ts` from the same request-boundary source; business logic must not fork between deployment targets.

## Database warning cleanup

Already-applied migration files remain immutable. A new migration replaces only the affected function definitions and removes unused declarations identified by linked Supabase database lint. Function signatures, grants, revokes, `security definer` boundaries, fixed `search_path`, lock order, payment arithmetic, idempotency, and audit behavior remain unchanged.

The migration is checked with contract tests, applied to the linked non-production project only when the existing project identity is confirmed, followed by migration parity, database lint, and relevant role/RLS verification.

## Google authentication

The existing Google control becomes actionable and invokes Supabase `signInWithOAuth({ provider: "google" })`. The redirect URL points to the existing `/auth/callback` route and includes a validated relative return path plus locale. Only same-origin application paths are accepted; malformed or external return targets fall back to the locale home page.

The callback exchanges the OAuth code, refreshes the server session, synchronizes the member profile, and returns to the original page. Authentication failures reopen the existing dialog with localized feedback. Google provider credentials and redirect allowlists are operational configuration; secrets never enter tracked source files.

## Estimate-request drafts

### Member drafts

A dedicated draft table stores one current draft per authenticated member and commission service type. It contains only validated form values and timestamps. It does not contain uploaded reference file bytes, object keys, Admin quotes, or submitted request records.

RLS restricts select, insert, update, and delete to `auth.uid() = user_id`. A narrow repository/API boundary validates payload size and shape. Saving is an upsert; opening the same service restores the latest draft; successful request submission deletes that draft. Ambiguous submission failures retain it.

### Guest drafts

Guest drafts use versioned `localStorage` keys scoped by service type. Parsing is defensive: invalid, oversized, or obsolete values are discarded. Guest contact and form text therefore remain on that browser and are never written to Supabase before submission. Successful submission removes the matching local draft.

### Shared behavior

The existing Save draft button is enabled. Save and restore states use existing visual components and localized copy. Switching between Member and Guest never copies identity data across modes. Reference attachments are deliberately excluded and the restored form explains that files must be selected again. Drafts never appear in Admin estimate lists.

## Mobile/responsive review gate

The audit covers navigation/sidebar, floating account actions, public Home/Portfolio/Documents/Queue/Commission pages, detail and estimate modals, authentication, all member pages, and all Admin pages/modal editors. It checks overflow, nested scrolling, touch targets, text wrapping, image containment, keyboard visibility, dialogs, data tables, and reduced-motion behavior at representative phone and tablet widths.

Findings are returned as a page-by-page proposed change list with screenshots where useful. Implementation pauses for explicit UI approval. Approved changes preserve the established Night/Autumn visual system and desktop layouts unless a shared fix is required.

## E2E and performance

The disposable test-customer lifecycle covers authentication, draft save/restore/delete, member and Guest estimate submission, Admin review and quote, PromptPay intent and slip upload, Admin verification, job/queue creation, status updates, messaging and image access, installment/final payment, delivery, download/Drive redirect, and avatar/session synchronization. Tests must not reset or mutate production data.

Performance work follows measurement rather than speculative redesign. Browser evidence records Home and Portfolio LCP/CLS, image derivative caching, interaction responsiveness, reduced-motion particle suppression, and member/Admin route behavior. Optimizations may adjust loading priority, image sizing, caching, query shape, or code splitting, but may not change approved UI without a new approval.

## Error handling and security

- OAuth and draft routes use existing same-origin, CSRF, authentication, and strict-content-type patterns.
- Member drafts are owner-only; Guest drafts never leave the browser until submission.
- OAuth return paths cannot redirect off-site.
- Existing sole-Admin authorization remains unchanged.
- No service-role or provider secret is exposed to browser code.
- Database functions retain explicit grants/revokes and safe search paths.
- User-entered form values survive recoverable failures; destructive cleanup occurs only after confirmed success.

## Verification and completion

Every checkpoint follows test-first development and receives focused tests before the full suite. Final merge readiness requires fresh passing evidence for tests, typecheck, lint, Next production build, OpenNext build, linked migration parity, database lint, approved browser E2E, and browser performance checks. Generated files and unrelated working-tree changes are excluded from commits. The final result remains on `feature/nasora-public` for a later authorized clean merge; it is not deployed.
