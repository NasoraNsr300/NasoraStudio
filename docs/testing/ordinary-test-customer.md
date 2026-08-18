# Ordinary test customer

Only `customer.test@nasora.local` may be used by the reset workflow. It is a normal
member (`app_metadata.role = member`), not an Admin bypass.

Local setup:

1. Apply pending migrations to a disposable/local Supabase project.
2. Set `TEST_CUSTOMER_PASSWORD` in `.env.local` (minimum 12 characters).
3. Run `npm run test:customer:reset`.
4. Run the authenticated browser boundary check:

   `$env:RUN_TEST_CUSTOMER_E2E='1'; npm run test:e2e -- customer-commission-lifecycle.spec.ts`

The reset command is disabled when `NODE_ENV=production`. It never prints the
password and never deletes the Auth user. R2 test objects become unreachable after
the database reset and remain covered by configured lifecycle deletion.

Verified 19 Aug 2026 against the linked non-production project:

- member email sign-in and Admin denial;
- estimate submission/cancellation while commissions were temporarily open;
- member Supabase draft restore and Guest browser draft restore;
- private avatar upload, replacement, reload synchronization, and R2 access denial;
- full owner-Admin lifecycle: request, quote, deposit slip, verification, job creation, delivery, final-payment slip, completion, and member delivery unlock;
- verified final account state before cleanup: 900 THB paid, 0 THB balance, and the delivery route visible as `Ready to download`;
- reset cleanup and return of `commissions_open` to its original closed state.

The final lifecycle reset deleted 1 job, 1 quote, 1 request, 2 payment slips,
and 2 payment intents while retaining the Auth user. Three unreachable R2 fixture
objects remain scheduled for lifecycle expiry.

The complete functional Chromium suite runs independently from visual snapshots. Visual snapshots require `RUN_VISUAL_REGRESSION=1` and an approved deterministic database/media seed; live mutable catalog data must not be compared with fixture-era baselines. The owner Admin identity is deliberately immutable, so the Admin quote/payment/delivery browser flow uses the real owner session and must end with the dedicated customer reset. Do not create a disposable Admin bypass and do not run reset against production.

Latest functional result: 49 passed, 21 skipped. Skips are the opt-in authenticated customer/media cases, mutable-data visual baselines, and routes whose linked content does not currently provide the required fixture state.
