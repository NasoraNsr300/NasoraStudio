# Task 2 — Review Request Detail and Admin Decision

## Status

Completed. The existing `/admin/estimates?request=<requestId>` route now loads an authenticated admin-only estimate detail view. Submitted requests can move to `reviewing`; submitted or reviewing requests can be declined only with a reason.

Status mutations are guarded by `public.admin_transition_commission_request`. The function checks the admin claim, locks the request row, accepts only `submitted -> reviewing|declined` and `reviewing -> declined`, records the audit event in the same transaction, and removes direct `authenticated` updates from `commission_requests`.

## Files

- `src/app/(admin)/admin/estimates/page.tsx`
- `src/app/api/admin/estimates/[requestId]/status/route.ts`
- `src/features/admin/components/admin-section-pages.tsx`
- `src/features/admin/components/admin-section-pages.module.css`
- `src/features/admin/estimates/components/admin-estimate-detail.tsx`
- `src/features/admin/estimates/components/admin-estimate-inbox.tsx`
- `src/features/admin/estimates/data/admin-estimate-repository.server.ts`
- `src/features/admin/estimates/domain/admin-estimate.ts`
- `supabase/migrations/20260809120000_admin_estimate_status_workflow.sql`
- `tests/components/admin-estimate-detail.test.tsx`
- `tests/unit/admin-estimate-repository.test.ts`
- `tests/unit/admin-estimate-status-migration.test.ts`
- `tests/unit/admin-estimate-status-route.test.ts`

## Commits

- `fc2de42 feat(admin): add estimate review and decline workflow`
- `b065017 fix(admin): harden estimate detail workflow`

## TDD evidence

- RED: `npm test -- --run tests/unit/admin-estimate-status-route.test.ts tests/components/admin-estimate-detail.test.tsx tests/unit/admin-estimate-status-migration.test.ts` failed as expected because the route, detail component, and migration did not exist.
- RED: `npm test -- --run tests/unit/admin-estimate-repository.test.ts` failed as expected when the answer ordering was deliberately reversed, proving the new detail repository assertion catches an ordering regression.
- GREEN: `npm test -- --run tests/unit/admin-estimate-repository.test.ts tests/unit/admin-estimate-status-route.test.ts tests/unit/admin-estimate-status-migration.test.ts tests/components/admin-estimate-detail.test.tsx tests/components/admin-estimate-inbox.test.tsx` — 5 files, 22 tests passed.

## Verification

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `git diff --check` — passed.
- `npm test` — 53 files / 209 tests passed; 2 unrelated failures remain in the pre-existing modified `tests/components/estimate-request-dialog.test.tsx` (one 5s timeout and one `acceptedLegal` validation mismatch). Task 2 focused tests pass.

## Self-review

- Server route validates JSON and status input with Zod, returns safe 400/401/403/409 responses, and never emits database/service-role details.
- The migration is the sole granted status-mutation path for authenticated callers; it locks first, validates before updating, redacts contact snapshots from audit state, and writes status plus audit record atomically.
- The admin detail preserves the approved theme and displays the requested identity marker, private contact, submitted brief, usage, budget, deadline, extras, and saved answers. Decline submission is blocked until a reason is entered.
- Existing inbox deep-link behavior remains available as the route selector; its previous read-only fallback remains for callers that do not supply a detail model.

## Concerns

- The full suite has two unrelated failures in user-dirty estimate-request dialog files; they were not changed or staged by Task 2.
- This task intentionally revokes direct `authenticated` updates to `commission_requests`; future workflow changes must use a similarly guarded RPC rather than browser-side writes.

## Review-fix follow-up

- Private contact rendering is now entirely in the server-rendered `AdminEstimateDetail`. `AdminEstimateStatusControls` is the only client component below it and receives only `requestId` and `status`; the client inbox receives request summaries only.
- The status route now requires a canonical UUID, `application/json`, and a strict same-origin `Origin` match. It handles one unambiguous `x-forwarded-host`/`x-forwarded-proto` pair for reverse proxies and rejects missing, comma-separated, or mismatched values.
- The page ignores malformed `?request=` values rather than querying detail data or raising a server error. Status tones are shared from one presentation map, and the decline textarea uses `--admin-input` plus an Autumn override.

### Follow-up tests and commands

- RED: focused review-fix tests failed before implementation: private detail was a Client Component, client inbox accepted a detail prop, malformed deep links queried the repository, the route accepted malformed/cross-origin/non-JSON requests, and status controls did not exist.
- GREEN: `npm test -- --run tests/unit/admin-estimate-repository.test.ts tests/unit/admin-estimate-status-route.test.ts tests/unit/admin-estimate-status-migration.test.ts tests/unit/admin-estimate-page.test.tsx tests/unit/admin-estimate-private-boundary.test.ts tests/components/admin-estimate-detail.test.tsx tests/components/admin-estimate-status-controls.test.tsx tests/components/admin-estimate-inbox.test.tsx` — 8 files, 30 tests passed.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `git diff --check` — passed.
- `npm test -- --maxWorkers=2` — 57 files, 219 tests passed (82.03s); raw failure summary: none.

### Migration verification limitation

- Non-destructive environment probe found Supabase CLI `2.113.0` but no `docker` or `psql` executable. No local database was started, reset, or modified. The migration was verified through its existing contract tests; runtime SQL execution requires a provisioned Postgres/Supabase environment.
