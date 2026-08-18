# Nasora Full-Stack Commission Platform Design

## Status

Approved through incremental design review on 2026-08-05. This document is the design index; the detailed requirements are maintained in the root specification files linked below.

## Product

Nasora is a bilingual commission website for one artist. It combines a public portfolio and editable commission catalog with manual quoting, PromptPay slip review, a public queue, registered-customer tracking, messaging, revision accounting, partial payment, and protected delivery.

Public catalog prices are guidance only. The administrator reviews every request and creates the actual quote. Guest customers submit an initial form but conduct the rest of the transaction externally; the administrator records their history and public queue row.

## Experience

The design uses a Celestial Amber identity with Night and Autumn themes. Night includes a desktop interactive particle field and intermittent starfall; Autumn replaces the celestial event layer with falling leaves. Mobile removes pointer physics. The application uses a Floating Navbar, hidden slide-in Sidebar, authentication-aware Floating Button, no footer, and separate layouts for Home, Portfolio, and Commission. Home selects one random Hero image per visit and uses a separate auto-advancing featured carousel. Commission category tiles use image-led album covers; selecting an album reveals its services in place without changing the Commission URL. Service cards use shared bilingual actions: `ประเมินราคา` / `Request Estimate` and `ดูรายละเอียดและเรทราคา` / `View Details & Rates`, without repeating the service name. Request identity fields adapt to authentication state, and member profiles manage nickname, password, and multiple contact channels.

## Architecture

- Next.js and TypeScript
- Static-first deployment on Cloudflare Workers through OpenNext
- Supabase PostgreSQL, Auth, and Realtime with RLS
- Cloudflare R2 separated into public derivatives, private originals, and private customer files
- Browser-side WebP derivative generation
- Brevo custom SMTP for temporary-domain Auth and administrator email
- Cloudflare Web Analytics for privacy-first performance monitoring

Authenticated responses are never publicly cached. Customer assets use short-lived authorization. Public pages use static generation or ISR. CPU-heavy media processing is kept out of the Worker.

## Core workflow

1. Customer selects an open service subtype
2. Customer reads reference prices and submits the subtype form
3. Administrator manually creates the actual quote
4. Registered customer accepts the quote and current Terms
5. Customer pays the configurable deposit, initially 50%, using amount-specific PromptPay QR and uploads a slip
6. Administrator verifies the slip and the job enters the public queue
7. Customer follows statuses, messages, revisions, and partial payments in the website
8. Delivery unlocks after required payment and expires after 30 days
9. Files expire according to policy while business history remains permanent

## Scope boundary

Phase 1 includes the public website, member and guest request flows, admin CMS, manual quotes, payments, queue, messages, delivery, bilingual documents, themes, analytics, retention, and performance/security validation.

Phase 2 includes Store, Review, PDF expense summary, 2FA, Share, spam protection, and customer email notifications.

## Detailed documents

- [Project goal](../../../PROJECT_GOAL.md)
- [Feature scope](../../../FEATURE_SCOPE.md)
- [User flow](../../../USER_FLOW.md)
- [Architecture](../../../ARCHITECTURE.md)
- [Database schema](../../../DATABASE_SCHEMA.md)
- [Design system](../../../DESIGN_SYSTEM.md)
- [Migration plan](../../../MIGRATION_PLAN.md)
- [Acceptance criteria](../../../ACCEPTANCE_CRITERIA.md)

## External decisions and evidence

- Cloudflare Workers Free CPU limits require the static-first strategy
- Vercel Hobby was rejected because its terms restrict the plan to personal, non-commercial use
- R2 is selected for private/public media and short-lived access
- Supabase default SMTP is not production-ready, so custom SMTP is required even before a custom domain
- Core Web Vitals targets follow Google guidance: LCP 2.5 seconds, INP 200 ms, CLS 0.1 at the 75th percentile

Relevant research and official references:

- [Payment research](../../../research/thailand-commission-payment-2026-08-04.md)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Google Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
