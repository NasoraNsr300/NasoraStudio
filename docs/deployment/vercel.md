# Vercel deployment

Vercel is the application's only runtime and scheduler. Cloudflare R2 remains private object storage, accessed from Vercel Functions through its S3-compatible API.

## Commercial plan gate

Nasora advertises paid commission services and processes payments, so a public Vercel deployment must use Vercel Pro or Enterprise. Vercel Hobby is restricted to personal, non-commercial use. The five-minute cron schedules in `vercel.json` also require Pro or Enterprise; Hobby allows at most one invocation per day.

## Repository configuration

`vercel.json` pins the Next.js framework preset, `npm ci`, the guarded Vercel build, Singapore (`sin1`) functions, and two protected five-minute cron jobs:

- `/api/internal/email-outbox/dispatch`
- `/api/internal/cleanup/dispatch`

Vercel invokes cron routes with `GET` and automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured.

`npm run build` requires every runtime variable before building. It temporarily hides `.env.local`, passes only `NEXT_PUBLIC_*` values to `next build`, restores the local file even on failure, and prevents local runtime/test values from being copied into build output.

## Required Vercel environment variables

Configure all of these for both Preview and Production. Mark every server-only value as Sensitive in Vercel:

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
- `ADMIN_EMAIL_SENDER` — address only, without a display name or angle brackets
- `CRON_SECRET` — random value of at least 16 characters

Do not add `TEST_CUSTOMER_EMAIL`, `TEST_CUSTOMER_PASSWORD`, or `RUN_TEST_CUSTOMER_E2E` to Vercel. R2 continues to use Cloudflare's S3-compatible API from Vercel Functions.

Environment changes affect only new deployments. Redeploy after adding, rotating, or correcting a value.

## Authentication URLs

The stable candidate URL is `https://nasorastudio.vercel.app`.

- Supabase already allows `https://nasorastudio.vercel.app/auth/callback`.
- Google OAuth keeps `https://rmcxkrqgbggaxqptxubd.supabase.co/auth/v1/callback` as its redirect URI; the application callback must not replace it.
- Before testing changing Vercel Preview URLs, add the narrow Supabase pattern `https://*-<team-or-account-slug>.vercel.app/**`, replacing the placeholder with the actual Vercel slug. Keep the exact callback for Production.
- Set Supabase Site URL to the Vercel production URL and add the exact Vercel `/auth/callback` URL to its Redirect URLs.

The application derives `/auth/callback` from `window.location.origin`, so the same code supports the stable Vercel alias and allowed Preview deployments.

## CLI workflow

The CLI is pinned in scripts but intentionally not installed as a project dependency because its current transitive dependency audit is substantially noisier than the application dependency tree.

```bash
npm run vercel:link
npm run vercel:pull
npm run build
npm run vercel:build
```

`vercel:link` creates `.vercel/`, which is ignored by Git. `vercel:pull` downloads Preview project settings locally; never commit generated environment files.

To create deployments after environment and plan review:

```bash
npx --yes vercel@59.1.4
npx --yes vercel@59.1.4 --prod
```

Do not run the production command merely to test configuration. Use a Preview deployment first.

## Preview and production checklist

1. Confirm the Vercel account is Pro or Enterprise and link the GitHub repository/project.
2. Rotate credentials listed in the production-readiness gate, then configure fresh values in Vercel Preview and Production.
3. Add the exact/narrow Supabase redirects before an OAuth test.
4. Run lint, typecheck, unit tests, `npm run build`, and `npm run vercel:build`.
5. Deploy Preview and smoke-test Thai/English pages, Google and email/password Auth, member/Admin boundaries, R2 upload/download, PromptPay intent/slip, Resend, and both protected maintenance routes.
6. Deploy Production only after owner desktop/mobile approval. Keep `commissions_open=false` throughout the release.
7. Verify Vercel Cron logs and confirm no external scheduler polls the protected routes.
8. Set Supabase Site URL and public links to the Vercel production URL.

The application uses the Next.js 16 `proxy.ts` convention for Supabase session refresh and request-path propagation.
