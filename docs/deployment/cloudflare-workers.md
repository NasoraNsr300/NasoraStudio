# Cloudflare Workers deployment gate

Deployment target: Cloudflare Workers through OpenNext. Do not merge or deploy this branch until the package lock conflict from the parallel UI task is resolved.

## Verified locally

- Next.js 16.3.0 and OpenNext Cloudflare 1.20.2 produce a Worker bundle.
- Node `proxy.ts` was replaced by Edge `middleware.ts` because OpenNext does not support Node middleware yet.
- Main Worker dry-run: 9,819.38 KiB raw / 1,911.86 KiB gzip. This is below the Workers Free compressed limit of 3 MiB.
- Maintenance Worker dry-run: 1.26 KiB raw / 0.63 KiB gzip.
- Worker observability is enabled.
- Public fixture media is pre-generated WebP. Runtime image conversion remains disabled to protect Free-plan CPU.

## Merge gate

1. Resolve `package.json` and `package-lock.json` together. `npm ci` currently reports an `esbuild` 0.28.1/0.28.2 mismatch in the parallel working changes.
2. Run the full test, typecheck, lint, Next build, OpenNext build, and both Wrangler dry-runs on Linux CI.
3. Merge the feature commits only after the dirty UI task is committed or moved away.

## Supabase

Authenticated CLI project found: `nasora-studio-dev` (`rmcxkrqgbggaxqptxubd`, Singapore). It is not linked to this worktree.

```bash
npx supabase link --project-ref rmcxkrqgbggaxqptxubd
npx supabase db push --dry-run
npx supabase db push
```

Review the migration list before `db push`. Run database advisors and member/Admin/anonymous RLS checks after apply.

## R2

Create two private buckets:

- payment slips: configure 30-day lifecycle expiry;
- private assets: messages, progress images, and deliveries; app cleanup controls retention.

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
- `BREVO_API_KEY`
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
