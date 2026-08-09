# Task 5 — PromptPay Deposit, Private R2 Slip Upload, and Admin Verification

## Status

Complete. A member can create an idempotent exact-deposit intent from the typed quote handoff, receive a server-generated PromptPay EMV payload, upload a bounded image directly to a private R2 object using a short-lived signed PUT, and submit it only after server-side HEAD metadata validation. Admins see only HEAD-validated pending slips through short-lived signed previews and can approve or reject them. Approval appends a permanent verified payment ledger; it does not create a job or queue entry.

## Files

- Created `supabase/migrations/20260809200000_payment_deposit_workflow.sql`.
- Created payment domain, member/admin repositories, route security, and R2 signing/storage modules under `src/features/payments/`.
- Created the member intent, member slip upload/confirm, and admin verification route handlers under `src/app/api/`.
- Created the connected admin review component and updated `src/app/(admin)/admin/payments/page.tsx`.
- Connected the Task 4 typed handoff in `member-request-quote-page.tsx`, including exact intent creation and slip upload/confirm, while preserving the existing quote UI and Night/Autumn styles.
- Updated `.env.example` with names/descriptions only for server-only PromptPay/R2 settings.
- Added `docs/deployment/r2-payment-slips.md` with private-bucket CORS and 30-day prefix lifecycle configuration.
- Added `tests/unit/payment-domain.test.ts`, `tests/unit/payment-migration.test.ts`, `tests/unit/payment-routes.test.ts`, and `tests/components/admin-payment-review.test.tsx`.

## TDD evidence

1. RED domain/migration: `npm test -- tests/unit/payment-domain.test.ts tests/unit/payment-migration.test.ts` failed because the payment module and reserved migration did not exist (0 domain tests loaded; 5 migration tests failed with ENOENT).
2. GREEN domain/migration: the same contracts passed after implementing integer-satang rules, exact deposit/installment/final calculations, PromptPay EMV/CRC generation, tables, RLS, grants, append-only ledger protection, and guarded RPCs.
3. RED routes: `npm test -- tests/unit/payment-routes.test.ts` failed because all three payment route modules were absent.
4. GREEN routes: route contracts passed after strict UUID/body/content-type/origin/auth checks, idempotent repository calls, private-key signing, and HEAD validation were implemented.
5. RED UI: `npm test -- tests/components/admin-payment-review.test.tsx` failed because the connected review component was absent.
6. GREEN UI: the review component passed preview, approve, and reason-required rejection tests.

## Exact verification evidence

- Focused regression: `npm test -- tests/unit/payment-domain.test.ts tests/unit/payment-migration.test.ts tests/unit/payment-routes.test.ts tests/components/admin-payment-review.test.tsx tests/components/member-quote-panel.test.tsx tests/components/estimate-request-dialog.test.tsx` — PASS, 6 files / 32 tests.
- Full suite: `npm test -- --maxWorkers=4` — PASS, 68 files / 284 tests. The bounded worker count avoids two unrelated estimate-dialog timeouts observed once under unrestricted parallel load; those tests also passed in the focused regression.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run build` — PASS; Next.js 16.3.0 compiled, typechecked, generated 41 static pages, and emitted all three dynamic payment API routes plus `/admin/payments`.
- Supabase runtime/advisor execution — unavailable because the Supabase CLI and a linked local/deployed database are not present in this worktree. Migration contract tests cover the definitions; deployment must still run the role matrix and database advisors.

## Security and behavior self-review

- All mutation routes require strict UUIDs, an exact `application/json` media type, and `Origin` equality against `request.url`; forwarded headers are ignored. Member/admin sessions are checked with `getUser()`, admin authorization uses `app_metadata`, and private database functions repeat authorization.
- Public tables have RLS enabled, explicit authenticated column grants, and no anonymous grants. Security-definer functions live in the non-exposed `private` schema, set an empty search path, check auth/role, and revoke PUBLIC/anon execution.
- Payment rows are append-only. Only verified payments count toward the balance; a single pending intent per quote plus approval-time balance revalidation prevents concurrent overpayment. The first intent must equal the quote deposit; subsequent normal installments are at least THB 100; a smaller final remainder is allowed.
- Approval writes only `payments`, verification metadata, and the intent state. No `jobs` or `queue_entries` mutation exists. Rejection leaves the intent pending so a replacement slip can be uploaded.
- R2 keys use `payment-slips/` plus `crypto.randomUUID()`. Signed PUT includes `Content-Type` and expires in 5 minutes; HEAD expires in 2 minutes; preview GET expires in 3 minutes. URLs use the S3 API domain and are treated as bearer tokens. The bucket remains private.
- Client-declared type/size are bounded before signing and compared against R2 HEAD metadata before review and again before approval. Allowed types are PNG/JPEG/WebP and the maximum is 5 MiB.
- PromptPay and R2 credentials are server-only, never logged, and configuration absence fails closed. No new dependency was added; SigV4 uses Workers-compatible Web Crypto.
- Slip rows retain metadata permanently. `uploaded_at` and `delete_after` are updated together at confirmation, with the latter exactly 30 days later; Cloudflare lifecycle configuration remains an explicit deployment step.

## Concerns / deployment handoff

- Apply the migration in a Supabase environment, run database advisors, and execute owner/other-member/Guest/anon/admin role simulation before release.
- Configure private R2 CORS and the `payment-slips/` 30-day lifecycle rule from the deployment document. Cloudflare may perform lifecycle deletion after the nominal timestamp.
- The UI exposes standards-compliant PromptPay QR payload data but does not rasterize it into a QR image; a later presentation-only enhancement may render that payload without changing the payment contract.
- Real R2 PUT/HEAD and PromptPay scanning require deployment secrets and were not exercised locally.

## Commit

`feat(payments): add PromptPay deposit and slip verification`
