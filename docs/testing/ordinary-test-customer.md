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

Verified 14 Aug 2026 against the linked non-production project:

- member email sign-in and Admin denial;
- estimate submission/cancellation while commissions were temporarily open;
- member Supabase draft restore and Guest browser draft restore;
- private avatar upload, replacement, reload synchronization, and R2 access denial;
- reset cleanup and return of `commissions_open` to its original closed state.

The complete functional Chromium suite passes independently from visual snapshots. Visual snapshots require `RUN_VISUAL_REGRESSION=1` and an approved deterministic database/media seed; live mutable catalog data must not be compared with fixture-era baselines. Admin quote/payment/delivery browser automation still needs a disposable Admin browser credential; sole-Admin authorization is not bypassed for E2E. Do not run reset against production.

Latest functional result: 53 passed, 16 skipped. Skips are the opt-in mutable-data visual baselines plus routes whose linked content does not currently provide the required fixture state.
