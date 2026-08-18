# Production readiness — 19 Aug 2026

## Decision

**GO for the closed temporary preview; NO-GO for a public production launch.** The application is deployed at `https://nasora-public.nasora-nsr300.workers.dev` with commissions closed. The remaining launch gate is a verified Resend domain plus final owner visual/Auth acceptance; do not treat the temporary Worker as the final production hostname.

## Verified service gates

- Wrangler 4.118.0 is authenticated to the Nasora Cloudflare account.
- Cloudflare R2 contains `nasora-payment-slips` and `nasora-private-assets`.
- `payment-slips/` expires after 30 days; incomplete multipart uploads abort after one day.
- Supabase has 32 local migrations matching 32 remote migrations; the linked database lint has no error-level finding.
- Google sign-in completed with the real Admin account. The OAuth client is named `NasoraStudio`; localhost, Vercel, and Supabase callback URLs are registered.
- The obsolete Google client secret was deleted; the replacement secret remains enabled.
- Resend API sending access works and a real development message was accepted with HTTP 200 using `onboarding@resend.dev`.
- The ordinary test member passed sign-in, Admin denial, request submission/cancellation, draft persistence, and private-avatar boundaries.
- A real owner Admin session can load `/admin` and retains the immutable Admin email plus `app_metadata.role = admin` boundary.
- The full linked-service lifecycle passed with the dedicated ordinary member: request `REQ-B3DE9BC8CC` → owner review → ฿900 quote → ฿450 deposit intent and slip → Admin verification/job creation → Google Drive delivery → ฿450 final payment and slip → Admin verification/completion → customer delivery unlock. The customer saw 900 THB paid, 0 THB balance, and `Ready to download`.
- The dedicated test member was reset immediately afterward: 1 job, 1 quote, 1 request, 2 payment slips, and 2 payment intents were deleted; the Auth user was retained and `commissions_open` was restored to `false`. Three now-unreachable R2 test objects remain covered by the configured lifecycle expiry.
- ESLint and TypeScript pass.
- Vitest: 180 files passed, 2 skipped; 619 tests passed, 4 skipped.
- Functional Playwright: 49 passed, 21 intentionally skipped (opt-in customer/media/visual cases), including a live `/icon.svg` response check.
- Next.js 16.3.0 production build passes with 48 generated pages, including `/icon.svg`.
- OpenNext Cloudflare 1.20.2 build passes on Windows with its documented WSL/Linux recommendation.
- Main Worker dry-run passes at 11,372.25 KiB raw / 2,182.82 KiB gzip; maintenance Worker dry-run passes at 1.36 KiB raw / 0.67 KiB gzip.
- The main Worker is live at `https://nasora-public.nasora-nsr300.workers.dev`; remote runtime secrets are configured, `workers_dev` is explicit, and version preview aliases are disabled.
- The maintenance Worker is deployed with no public `workers.dev` route and runs every five minutes. Its cleanup and email-dispatch endpoints both returned HTTP 200.
- The email outbox delivered 7 queued development notifications successfully after normalizing `ADMIN_EMAIL_SENDER` to an address-only value. A separate Resend configuration message was also accepted with HTTP 200.
- Supabase Auth uses the temporary Worker as Site URL and allows its exact `/auth/callback`. Google OAuth allows the temporary Worker origin while retaining the Supabase `/auth/v1/callback` redirect URI.
- Google OAuth completed on the temporary Worker and returned an authenticated owner session that could load `/admin`; the Admin dashboard still showed commissions closed.
- Email/password sign-in completed with the dedicated ordinary member, loaded `/en/member/requests`, and was redirected away from `/admin` to the public authentication flow.
- Public Worker smoke passed for `/en`, `/th`, `/en/commission`, `/en/queue`, and `/icon.svg`; the commission page remained closed.
- Cloudflare builds now run through `scripts/build-cloudflare.mjs`, which temporarily removes `.env.local` from the production build and passes only `NEXT_PUBLIC_*` values. Verification found no Supabase secret, R2/Resend/cron value, PromptPay ID, or test credential in `.open-next`.

## Release blockers

- Verify the real sending domain in Resend (SPF/DKIM) and replace the development sender with a domain-owned `ADMIN_EMAIL_SENDER`.
- Complete owner visual review at desktop and mobile sizes. Mutable live catalog data must not overwrite deterministic visual baselines without explicit acceptance.
- Enable Cloudflare Web Analytics for the final hostname if launch analytics are desired.

## Deployment rule

Keep `commissions_open=false` and do not attach or announce a final custom domain until the launch blockers above are cleared. Future Cloudflare builds must use `npm run build:cloudflare` or `npm run deploy`; do not call `opennextjs-cloudflare build` directly while `.env.local` contains runtime secrets.
