# Prelaunch evidence — 19 Aug 2026

This ledger reconciles the broad product checklist in `ACCEPTANCE_CRITERIA.md` with evidence that is safe to repeat before launch. An unchecked item in the original checklist is not automatically a missing implementation; it means that the item has not yet been signed off in a production-like environment.

## Passed with linked non-production services

- Supabase migration parity: 32 local / 32 remote.
- Supabase database lint: no error-level findings.
- Email/password ordinary member sign-in and immutable Admin denial.
- Google OAuth Admin sign-in and `/admin` access.
- Member estimate submission/cancellation with commissions temporarily opened and restored afterward.
- Member and Guest draft restoration.
- Private avatar upload/replacement and unauthorized R2 access denial.
- Resend development delivery request accepted with HTTP 200.
- Cloudflare authentication and R2 lifecycle inspection.
- Full real lifecycle using the owner Admin and dedicated test member: request `REQ-B3DE9BC8CC` → review → ฿900 quote → ฿450 deposit intent/slip/verification → job creation → Google Drive delivery → ฿450 final payment/slip/verification → completion → customer delivery unlock with 0 THB balance.
- Successful scoped reset after the lifecycle: 1 job, 1 quote, 1 request, 2 payment slips, and 2 payment intents deleted; Auth user retained; `commissions_open=false` restored. Three orphaned R2 test objects are covered by lifecycle expiry.

## Automated code evidence

- Unit/component tests cover Admin authorization, request status transitions, quote immutability, payment intent/slip fencing and idempotency, job creation, collaboration, delivery access, RLS migration contracts, responsive layouts, accessibility, and public journeys.
- Latest Vitest result: 180 files passed, 2 skipped; 619 tests passed, 4 skipped.
- Latest functional Playwright result: 49 passed, 21 intentionally skipped; the added icon check also passes independently in `public-pages.spec.ts`.
- ESLint, TypeScript, Next.js production build, OpenNext build, and both Worker dry-runs pass.
- Functional Playwright and visual regression are intentionally separate. Visual checks require deterministic content and explicit baseline acceptance.

## Requires final-environment evidence

- Resend delivery from the verified production domain to a non-team mailbox.
- OAuth and Auth redirect behavior on the final hostname.
- Worker secrets, production route, and scheduled maintenance Worker.
- Production-like Worker preview smoke.
- Owner desktop/mobile visual approval and accessibility spot-check.

## Evidence policy

Only check a criterion in `ACCEPTANCE_CRITERIA.md` after its observable behavior passes in the target environment. Do not convert test-file existence or a successful build into product acceptance when the criterion depends on live OAuth, email, storage, DNS, or owner visual judgment.
