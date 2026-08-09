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
