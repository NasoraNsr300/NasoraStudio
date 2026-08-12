# Production Readiness Design

## Goal

Complete the six approved production-readiness workstreams without redesigning the current Nasora UI: make existing controls functional, connect public contact content to Admin settings, exercise one ordinary customer account, refresh visual baselines only after functional correctness, and finish deploy checks without publishing an incomplete build.

## Approved behavior

1. Existing controls keep their current visual treatment. The member “new estimate” action opens the commission catalog. Admin estimate search, status filtering, and ordering work in place. The Home navbar search opens Portfolio search results. Service artwork opens the existing single-image lightbox behavior.
2. Home featured artwork deep-links to Portfolio and opens the matching image. Public navbar language controls meet a 44 × 44 CSS pixel touch target without changing the navbar layout.
3. About biography/contact copy, contact email, Instagram URL, and Discord contact are stored in the one-row `site_settings` record. Admin edits them from the existing Settings page. Public About and member support links consume this data; no `.example` address remains in runtime UI.
4. Exactly one non-Admin account, `customer.test@nasora.local`, is reset through the existing guarded test gateway. Browser E2E signs in, confirms Admin denial, submits a real estimate request, sees it in the member area, and cancels it. The reset command keeps the run repeatable.
5. Visual snapshots are regenerated only after functional E2E passes. Each changed desktop/mobile image is inspected before acceptance; obsolete fixture-specific selectors are replaced with stable live-data behavior.
6. Deployment stays gated until build, Worker preview, Supabase migration checks, R2 lifecycle configuration, maintenance Worker checks, and required secret inventory pass. Missing Brevo credentials are reported as an external blocker rather than bypassed. Production deployment is not performed while a gate is unresolved.

## Architecture and data flow

- Interaction fixes stay in their owning feature components and reuse current Next.js routes/search parameters.
- A new additive Supabase migration extends `public.site_settings` and replaces the two guarded Admin RPCs with signatures containing the new fields. Public access remains column-scoped under RLS; mutation remains RPC-only and sole-Admin guarded.
- About becomes a server-rendered page receiving `PublicSiteSettings`. Member support consumes the same settings provider already used by the public shell.
- Tests follow RED → GREEN per behavior. Database contracts test grants, RLS, and RPC signatures; component tests cover projections and interactions; Playwright covers the real browser flow.
- Deployment configuration documents every runtime variable. The maintenance Worker remains separate from the web Worker and calls authenticated internal cleanup/email endpoints.

## Error handling and security

- Invalid search/filter state falls back to a safe default and never mutates data.
- Site settings validate localized text, email, and HTTPS/contact URLs at the HTTP and database boundaries.
- Test-account reset is disabled in production, locked to one exact email, and never grants Admin metadata.
- Secret/service-role values stay server-only and are never emitted in browser output or committed files.
- No snapshot update can hide a functional or accessibility failure; functional suites run first.

## Verification

- Focused Vitest suites for each checkpoint, then full unit/component suite, typecheck, lint, and production build.
- Authenticated Playwright flow with reset test customer.
- Full public E2E and visual regression suite after functional fixes.
- Supabase migration list/advisors and live safe read/write verification where credentials permit.
- OpenNext Cloudflare build/preview smoke test, Wrangler authentication check, R2 lifecycle inspection, and maintenance Worker dry-run/deploy gate report.

