# Vercel secondary deployment

Cloudflare Workers is the primary target. Vercel is a secondary build of the same branch and must use a separate deployment project, not a forked UI.

## Build settings

- Framework preset: Next.js
- Install: `npm ci`
- Build: `npm run build`
- Root directory: repository root

Copy the application variables listed in `cloudflare-workers.md`. R2 variables continue to use the Cloudflare R2 S3 API. Never commit secret values. Configure both Vercel Preview and Production callback URLs in Supabase Auth before testing Google login.

The current Edge `middleware.ts` is intentionally compatible with both Vercel and OpenNext Cloudflare. Do not rename it to Next.js 16 Node `proxy.ts` until OpenNext Cloudflare supports that runtime.

Before an authorized Vercel deployment, run full tests, `npm run build`, and a Preview smoke test. This prelaunch task does not deploy.
