# Task 6 — Verified Deposit to Job and Queue Workflow

## Status

Complete locally. Approving a verified deposit now invokes a service-only gateway that atomically accepts the immutable sent quote, converts the member request, creates one job snapshot, writes the first public status-history row, inserts a queue entry ordered by `verified_at`, and appends an audit record. Replays return the original job and queue row.

## Implementation

- Added `20260809210000_deposit_to_job_workflow.sql` with `private.create_job_from_verified_deposit(payment_id)`, a service-only gateway wrapper, and a separate authenticated-admin RPC for manual Guest jobs.
- Replaced the public queue route fixture with a repository reading the five-field `public_queue` projection only: rank, display name, service, public status, and deadline.
- Replaced the Admin Jobs board fixtures with server-loaded jobs while retaining the approved four-column layout and separate “เพิ่มคิว Guest” affordance.
- Connected non-demo member job routes to owner-scoped job/history data. The repository never selects `private_note` or Guest identity/contact fields; missing/non-owned jobs return 404.
- Approval replay also invokes the idempotent job gateway, so a lost response or a transient post-verification job failure is recoverable. Rejection never invokes job creation.
- Included two safe Task 5 follow-ups: the deposit CTA is hidden whenever any canonical payment intent exists, and upload-attempt quota scans now have `(user_id, created_at desc)` indexing.

## Security and concurrency self-review

- Private mutation functions are `SECURITY DEFINER` with `search_path = ''`, revoked from every API role. Only the narrow gateway is granted to `service_role`; manual Guest creation is granted to authenticated users but repeats `private.is_admin()` authorization.
- The gateway requires the exact immutable admin identity and the same admin who verified the payment.
- Payment, intent, quote, request, workflow/status, job, and queue rows are locked before dependent writes. The unique accepted-quote job constraint and active-queue constraint backstop idempotency.
- The public view is both `security_invoker` and a security-barrier projection. It reads through one tightly granted, fixed-search-path definer function that returns no IDs, ownership, contact, category, payment, quote, or timing internals; underlying queue-table access remains revoked.
- Authenticated base grants on jobs/history are narrowed; member history omits `private_note`, and existing owner RLS excludes Guest rows (`user_id is null`).
- Permanent payment ledger remains append-only; rejection produces no verified payment row and therefore cannot reach job creation.

## TDD evidence

1. RED: focused tests failed because the migration, three repositories, member binding, approval-to-job call, CTA block, and quota index did not exist.
2. GREEN focused: 6 files / 39 tests passed for transaction contracts, repositories, member rendering, and payment route behavior.
3. Task 5 follow-up RED/GREEN: 2 expected failures became 2 files / 11 passing tests.
4. Final full suite: `npm test -- --run --maxWorkers=2` — PASS, 78 files / 339 tests in 60.34s.
5. `npm run typecheck` — PASS.
6. `npm run lint` — PASS.
7. `npm run build` — PASS; Next.js 16.3.0 compiled/typechecked, generated 41 static pages, and emitted dynamic queue/member/admin/payment routes.
8. `git diff --check` — PASS for the working tree.

## Deferred runtime verification

No local/live Supabase PostgreSQL runtime or deployment authorization was available. The migration was not applied. Real transaction rollback, concurrent replay, RLS role-matrix, database advisor, and deployed PostgREST relationship checks remain required in the target Supabase environment.

## Review remediation

- Fresh verification now performs payment approval and deposit-to-job conversion inside the same service RPC transaction. Installment/final approvals remain ledger-only; replay uses an idempotent lookup that returns the existing job and its original queue row, including archived rows.
- Standardized the quote lifecycle lock order to `commission_requests` then `quotes` in both payment verification and deposit conversion. Verified-deposit guard triggers prevent a paid quote/request from being superseded before conversion can finish or retry.
- Initial member and manual Guest queue statuses must be customer-visible. Later private workflow statuses retain the last safe public snapshot; only customer-visible statuses update or archive public queue rows.
- Corrected the authenticated `jobs` column grant for `guest_display_name`. Existing owner RLS still prevents members from selecting Guest jobs, while the admin-only policy supports the Admin Jobs repository.
- Explicitly revoked the replacement private verification function from every API role; only the service-role wrapper remains executable.

## Review-cycle TDD and verification

1. RED: seven contract/route assertions failed for replay, grants, lock order, atomic conversion, archived queue recovery, and public-status visibility. A final security assertion also failed until the replacement private verifier was explicitly revoked.
2. GREEN focused: `npm test -- --run tests/unit/deposit-to-job-migration.test.ts tests/unit/payment-routes.test.ts --maxWorkers=2` — PASS, 2 files / 38 tests.
3. Full suite: `npm test -- --run --maxWorkers=2` — PASS, 78 files / 343 tests in 60.77s.
4. `npm run typecheck` — PASS.
5. `npm run lint` — PASS.
6. `npm run build` — PASS; Next.js 16.3.0 generated 41 static pages and all dynamic routes.

## Post-deposit lifecycle remediation

- Added one private payable-quote predicate shared by payment-intent creation, pending-intent recovery, slip authorization, and slip verification. Before deposit, only the current non-expired `sent` quote can create/continue a deposit. After conversion, only `installment`/`final` intents tied to the exact member-owned job, accepted quote, request, and verified deposit remain payable; the quote's old expiry no longer invalidates those later payments.
- Preserved the existing balance calculation, exact deposit amount, 100 THB installment minimum, final-payment remainder exception, pending-intent exclusivity, upload lease/rate limits, and immutable verified-payment ledger.
- Legacy pending installment/final intents now recover and continue after their quote becomes `accepted`, while mismatched job/request/user/payment relationships close or reject the intent.
- Slip authorization and verification use the same `request -> intent -> quote` mutation lock order as intent creation, avoiding an intent/request lock inversion during concurrent payment activity.
- Queue archival is now independent from public-label visibility: a private terminal status archives the active queue row without replacing its last customer-safe label.

### Final re-review evidence

1. RED: focused migration contracts failed for accepted-quote payment continuation and hidden terminal archival.
2. GREEN focused: `npm test -- --run tests/unit/deposit-to-job-migration.test.ts tests/unit/payment-routes.test.ts tests/unit/payment-migration.test.ts --maxWorkers=2` — PASS, 3 files / 50 tests.
3. Full suite: `npm test -- --run --maxWorkers=2` — PASS, 78 files / 344 tests in 60.14s.
4. `npm run typecheck`, `npm run lint`, and `npm run build` — PASS.
