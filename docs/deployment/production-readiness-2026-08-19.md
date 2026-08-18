# Production readiness — 19 Aug 2026

## Decision

**NO-GO for production deployment.** The project and external development services are usable, but the final production hostname and verified transactional-email domain are not configured. No production Worker was deployed during this review.

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
- ESLint and TypeScript pass.
- Vitest: 180 files passed, 2 skipped; 619 tests passed, 4 skipped.
- Functional Playwright: 49 passed, 21 intentionally skipped (opt-in customer/media/visual cases), including a live `/icon.svg` response check.
- Next.js 16.3.0 production build passes with 48 generated pages, including `/icon.svg`.
- OpenNext Cloudflare 1.20.2 build passes on Windows with its documented WSL/Linux recommendation.
- Main Worker dry-run passes at 11,372.25 KiB raw / 2,182.82 KiB gzip; maintenance Worker dry-run passes at 1.36 KiB raw / 0.67 KiB gzip.

## Release blockers

- Verify the real sending domain in Resend (SPF/DKIM) and replace the development sender with a domain-owned `ADMIN_EMAIL_SENDER`.
- Select the production hostname, then set `NASORA_BASE_URL`, Supabase Site URL/redirect allow-list, Google OAuth origin/redirect entries, and Cloudflare Worker route consistently.
- Add production Worker secrets without printing or committing them: Supabase secret, PromptPay ID, R2 credentials/buckets, Resend key/sender, base URL, and cron secret.
- Run the complete functional browser suite and a production-like Worker preview against the final configuration.
- Complete owner visual review at desktop and mobile sizes. Mutable live catalog data must not overwrite deterministic visual baselines without explicit acceptance.
- Finish the real Admin lifecycle. Request → Admin review → ฿900 quote → customer deposit intent (฿450) passed and the dedicated member was reset cleanly; slip upload → Admin verification → job → delivery remains. The exact owner identity cannot be replaced by a disposable Admin account.
- Enable Cloudflare Web Analytics for the final hostname if launch analytics are desired.

## Deployment rule

Do not run `npm run deploy` or deploy `nasora-maintenance` until every blocker above is cleared. A passing dry-run proves the bundle is uploadable; it does not prove DNS, secrets, OAuth callbacks, email authentication, or the customer workflow in production.
