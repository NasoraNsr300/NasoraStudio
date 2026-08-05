# Nasora Full-Stack Delivery Roadmap

> **For agentic workers:** Execute each linked implementation plan in order. A stage is complete only when its automated checks pass and its review checkpoint is accepted.

**Goal:** Deliver the approved Nasora commission platform as four independently testable vertical stages.

## Stage 1 — Foundation and public desktop preview

Detailed plan: `2026-08-05-nasora-foundation-public.md`

Produces the Next.js/Cloudflare project, design tokens, global shell, themes, Home, Portfolio, Commission Albums, service details, Queue, Document Center, About/Contact, responsive behavior, public media pipeline, and visual tests using typed fixture data behind repository interfaces.

## Stage 2 — Authentication, profiles, and estimate requests

Produces Supabase local/project configuration, migrations and RLS for identity/content/request tables, email/password and Google authentication, the authentication-aware Floating Button, member profiles, multiple contact methods, password management, subtype form builder runtime, member/Guest form modes, reference uploads, and administrator request notifications.

## Stage 3 — Quotes, PromptPay, jobs, and member workspace

Produces manual quote creation and acceptance, versioned Terms acceptance, PromptPay QR generation, slip uploads and manual verification, deposit rules, partial payments, public queue projection, service-specific workflows, permanent job history, messages with images, revision accounting, notifications, and the private member job workspace.

## Stage 4 — Administration, delivery, retention, and launch

Produces the one-user admin dashboard and CMS, pricing/category/form/document/status editors, Guest queue management, R2 and Google Drive delivery records, 30-day expiry behavior, cleanup notifications and audit logs, bilingual content completion, Cloudflare Web Analytics, performance/security/accessibility validation, backup rehearsal, and temporary-URL deployment.

## Stage gates

Every stage must satisfy all of the following before the next begins:

- Unit, component, integration, and applicable Playwright tests pass
- `npm run lint`, `npm run typecheck`, and `npm run build` pass
- Cloudflare preview starts without unsupported runtime APIs
- No authenticated response is cached publicly
- User reviews the visible behavior at the stage checkpoint
- Requirements remain traceable to `ACCEPTANCE_CRITERIA.md`

## Phase 2 boundary

Store, verified-customer Review, PDF expense summary, administrator 2FA, Share, enhanced anti-spam, and customer email notifications are not part of these four Phase 1 stages.

