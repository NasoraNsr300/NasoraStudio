# Task 3 Report: Manual Quote Drafting and Immutable Price Snapshot

## Status

Complete. Task 3 is implemented on `feature/nasora-public` with the planned migration timestamp `20260809190000`; no migration timestamp collision was present.

Implementation commit: `8194aee feat(admin): create versioned manual commission quotes`

## Delivered behavior

- Added an admin-only transactional quote workflow. `private.save_and_send_quote(request_id, payload)` locks the request, detects duplicate submission keys, validates the immutable snapshot, assigns the next sequential version, supersedes the prior sent quote, inserts quote items, sends the new quote, changes the request to `quoted`, and appends an audit log atomically.
- Added a guarded public RPC wrapper for PostgREST access. Direct authenticated mutation grants on `quotes` and `quote_items` are revoked.
- Preserved the existing quote and quote-item immutability triggers; no catalog reference is stored in the snapshot, so later catalog changes cannot alter a sent quote.
- Added immutable duration-range and per-request submission-key fields. Deposit satang is derived in the database from authoritative integer THB satang and the editable percentage.
- Added a strict admin route with exact `application/json`, same-origin verification, strict UUID validation for both request and idempotency IDs, app-metadata admin enforcement, schema validation, safe errors, and passthrough of the complete snapshot to the guarded RPC.
- Added the Autumn-compatible manual quote editor with localized scope and item snapshots, base/addition lines, 50% deposit and four-revision defaults, duration range, deadline, expiry, Terms document reference, authoritative THB totals, and approximate display-only USD.
- Kept Guest/member contact outside quote editor props and client state. The editor receives only request ID, localized service name, and requested deadline.
- Added latest quote projection and summary to the existing server-rendered estimate detail.

## Files

Created:

- `supabase/migrations/20260809190000_admin_estimate_workflow.sql`
- `src/app/api/admin/estimates/[requestId]/quotes/route.ts`
- `src/features/admin/estimates/components/admin-quote-editor.tsx`
- `src/features/admin/estimates/components/admin-quote-editor.module.css`
- `tests/unit/admin-quote-migration.test.ts`
- `tests/unit/admin-quote-route.test.ts`
- `tests/components/admin-quote-editor.test.tsx`

Modified:

- `src/features/admin/components/admin-section-pages.module.css`
- `src/features/admin/estimates/components/admin-estimate-detail.tsx`
- `src/features/admin/estimates/data/admin-estimate-repository.server.ts`
- `src/features/admin/estimates/domain/admin-estimate.ts`
- `tests/components/admin-estimate-detail.test.tsx`
- `tests/unit/admin-estimate-repository.test.ts`

## TDD evidence

RED runs:

1. `npm test -- --run tests/unit/admin-quote-migration.test.ts`
   - Exit 1; 4/4 tests failed because `20260809190000_admin_estimate_workflow.sql` did not exist.
2. `npm test -- --run tests/unit/admin-quote-route.test.ts`
   - Exit 1; suite failed to resolve the not-yet-created quotes route.
3. `npm test -- --run tests/components/admin-quote-editor.test.tsx`
   - Exit 1; suite failed to resolve the not-yet-created editor.
4. `npm test -- --run tests/unit/admin-estimate-repository.test.ts`
   - Exit 1; 1/7 failed because the detail projection did not select or return quotes.
5. `npm test -- --run tests/components/admin-quote-editor.test.tsx` after adding the invalid-input regression
   - Exit 1; 1/4 failed with the reproduced `RangeError: Invalid time value` and no validation alert.
6. `npm test -- --run tests/components/admin-estimate-detail.test.tsx` after adding latest-quote summary coverage
   - Exit 1; 1/1 failed because the expected latest quote summary was absent.

GREEN/focused runs:

- Migration contract: 1 file, 4/4 tests passed.
- Route contract: 1 file, 6/6 tests passed.
- Quote editor: 1 file, initially 3/3, then 4/4 including invalid-input handling.
- Estimate detail/repository plus Task 3 suites: 5 files, 21/21 tests passed before the final added regressions.
- Estimate detail summary: 1 file, 1/1 passed.

One full-suite verification run correctly caught a stale contract regex after the SQL column was qualified as `q.version`: 59 files passed, 232 tests passed, 1 contract test failed. The regex was corrected and the complete suite was rerun.

## Final verification

- `npm test -- --run --maxWorkers=2`
  - Exit 0; 60/60 test files passed, 233/233 tests passed.
- `npm run typecheck`
  - Exit 0; `tsc --noEmit` reported no errors.
- `npm run lint`
  - Exit 0; `eslint .` reported no errors or warnings.
- `npm run build`
  - Exit 0; Next.js 16.3.0 production build compiled, typechecked, generated 41 static pages, and registered the new dynamic quote route.
- `git diff --cached --check` before the implementation commit
  - Exit 0; no whitespace errors.
- Staged scope inspection before the implementation commit
  - Exactly 13 Task 3 implementation/test files were staged; unrelated dirty and untracked files remained unstaged.

## Self-review

- Security: both route and database check `app_metadata.role = admin`; the database function remains authoritative. The route rejects ambiguous forwarded headers, cross-origin requests, non-exact media types, malformed UUIDs, extra payload keys, and invalid totals before mutation.
- Privacy: private contact is rendered only by the server detail. A component boundary test asserts the client editor props do not contain the contact value.
- Consistency: the commission request row lock serializes version allocation and idempotency checks. The per-request unique submission key is a second defense against duplicates.
- Atomicity: superseding, quote/item insertions, send transition, request status, and audit log occur in one database function and roll back together on error.
- Snapshot integrity: localized scope, localized item labels/descriptions, quantities, integer satang amounts, deposit terms, revisions, duration range, deadline, expiry, and Terms version are persisted on the quote version. Existing immutability triggers remain enabled.
- UX/accessibility: fields use labels/fieldsets, error feedback uses `role="alert"`, totals update from editable line items, and mobile/Autumn styling is included without changing the admin shell.

## Concerns and follow-up

- This environment has no Docker command and no callable local Supabase CLI/runtime, so the migration was validated by contract tests and SQL review but was not applied to a live local Postgres instance. Applying/resetting the Supabase database should be the first integration check in an environment with the runtime available.
- USD uses a deliberately fixed approximate rate of 35 THB/USD and is labeled display-only. THB satang remains the only submitted and persisted amount.
- Browser visual QA was not run; component tests and the production build cover structure/behavior, but a manual admin-page pass is still useful once seeded Supabase data is available.
