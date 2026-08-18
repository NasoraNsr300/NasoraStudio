# Production readiness — 19 Aug 2026

## Decision

**NO-GO for production deployment.** The project and external development services are usable, but the temporary Worker hostname is not deployed or registered with the authentication providers, and the transactional-email domain is not verified. No production Worker was deployed during this review.

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
- Local runtime configuration is complete and points `APP_BASE_URL` / `NASORA_BASE_URL` to `nasora-public.nasora-nsr300.workers.dev`; Cloudflare confirms that the `nasora-public` Worker does not exist yet, so no remote Worker secrets or public route have been created.

## Release blockers

- Verify the real sending domain in Resend (SPF/DKIM) and replace the development sender with a domain-owned `ADMIN_EMAIL_SENDER`.
- Confirm `nasora-public.nasora-nsr300.workers.dev` as the temporary launch hostname, then add it to the Supabase Site URL/redirect allow-list and Google OAuth origin/redirect entries before the first deployment.
- Create the main Worker and add its production secrets without printing or committing them: Supabase secret, PromptPay ID, R2 credentials/buckets, Resend key/sender, base URL, and cron secret. The required values are present locally, but the remote Worker does not yet exist.
- Run the complete functional browser suite and a production-like Worker preview against the final configuration.
- Complete owner visual review at desktop and mobile sizes. Mutable live catalog data must not overwrite deterministic visual baselines without explicit acceptance.
- Enable Cloudflare Web Analytics for the final hostname if launch analytics are desired.

## Deployment rule

Do not run `npm run deploy` or deploy `nasora-maintenance` until every blocker above is cleared. A passing dry-run proves the bundle is uploadable; it does not prove DNS, secrets, OAuth callbacks, email authentication, or the customer workflow in production.
