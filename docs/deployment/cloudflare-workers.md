# Cloudflare Workers deployment gate

Deployment target: Cloudflare Workers through OpenNext. Production deployment remains blocked until every gate in this document passes.

## Verified locally

- Next.js 16.3.0 and OpenNext Cloudflare 1.20.2 produce a Worker bundle.
- Edge `middleware.ts` remains intentional: Next.js 16.3 accepts Node `proxy.ts`, but OpenNext Cloudflare 1.20.2 rejects it with `Node.js middleware is not currently supported`. Re-test before removing this compatibility exception.
- Main Worker dry-run (14 Aug 2026): 11,500.04 KiB raw / 2,199.04 KiB gzip.
- Maintenance Worker dry-run (13 Aug 2026): 1.36 KiB raw / 0.67 KiB gzip.
- Worker observability is enabled.
- Public fixture media is pre-generated WebP. Runtime image conversion remains disabled to protect Free-plan CPU.

## Merge gate

1. Run the full test, typecheck, lint, Next build, OpenNext build, Browser E2E suite, and both Wrangler dry-runs.
2. Confirm all visual baselines on desktop and mobile. Do not accept a broken layout as a new baseline.
3. Configure every required Worker secret. `RESEND_API_KEY` and `ADMIN_EMAIL_SENDER` must be present before enabling administrator email dispatch.
4. Merge only after the working tree contains no unresolved runtime or visual changes.

## Supabase

Authenticated CLI project found: `nasora-studio-dev` (`rmcxkrqgbggaxqptxubd`, Singapore). The worktree is linked and all 31 local migrations match the remote migration history as of 14 Aug 2026.

```bash
npx supabase link --project-ref rmcxkrqgbggaxqptxubd
npx supabase db push --dry-run
npx supabase db push
```

Review the migration list before `db push`. Run database advisors and member/Admin/anonymous RLS checks after apply.

`supabase db lint --linked --level warning --fail-on error` exits successfully with zero findings after migration `20260814120000_prelaunch_sql_warning_cleanup`.

Next.js 16 deprecates `middleware.ts`, but its replacement `proxy.ts` is Node-only. OpenNext Cloudflare 1.20.2 rejects Node Proxy. Keep the current Edge middleware until the Cloudflare adapter supports Node Proxy; the deprecation warning is expected and the Cloudflare build/dry-run remains authoritative.

### Google authentication

The application uses Supabase PKCE OAuth through `/auth/callback` and preserves only validated same-locale application paths. Before browser verification or deployment:

- enable the Google provider in the Supabase Auth dashboard;
- configure the Google Web OAuth Client ID and Client Secret in Supabase (never commit them);
- add the Supabase project Auth callback URL to Google Authorized redirect URIs;
- keep `http://localhost:3000/auth/callback` in the development redirect allowlist;
- add each future Cloudflare or Vercel `/auth/callback` URL to Supabase Redirect URLs before enabling that target.

## R2

Create two private buckets:

- payment slips: configure 30-day lifecycle expiry;
- private assets: messages, progress images, and deliveries; app cleanup controls retention.

Verified 13 Aug 2026: the payment bucket has an enabled `payment-slips/` 30-day expiry rule. The private-assets bucket keeps only the default incomplete multipart cleanup because the application owns per-record retention and cleanup.

Main Worker secrets/variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `PROMPTPAY_ID`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PAYMENT_SLIPS_BUCKET`
- `R2_PRIVATE_ASSETS_BUCKET`
- `RESEND_API_KEY`
- `ADMIN_EMAIL_SENDER`
- `CRON_SECRET`

Do not commit secret values.

## Deploy order

```bash
npm ci
npm test -- --run --maxWorkers=2
npm run typecheck
npm run lint
npx opennextjs-cloudflare build
npx wrangler deploy --dry-run
npm run deploy
```

After the main Worker URL exists, configure maintenance Worker secrets:

- `CRON_SECRET`: identical to the main Worker;
- `NASORA_BASE_URL`: HTTPS origin of the main Worker, with no path.

Then deploy:

```bash
npx wrangler deploy --config wrangler.maintenance.jsonc --dry-run
npx wrangler deploy --config wrangler.maintenance.jsonc
```

Enable Cloudflare Web Analytics in the dashboard. Smoke-test Thai/English public pages, authentication, estimate submission, quote, PromptPay upload, Admin verification, messages, progress, delivery, email dispatch, and scheduled cleanup before attaching a custom domain.
