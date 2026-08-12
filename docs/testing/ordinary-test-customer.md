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

Full estimate-to-delivery automation remains deferred until disposable Supabase and
R2 credentials are available. Do not run this reset against production.
