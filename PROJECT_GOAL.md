# PROJECT GOAL — Nasora

## Document control

- Product: Nasora Commission Platform
- Version: 1.0
- Status: Approved design baseline
- Date: 2026-08-05
- Owner and administrator: Nasora

## Vision

Nasora will be a fast, bilingual full-stack website through which one artist can present work, receive commission requests, quote each job individually, collect and verify PromptPay payments, manage a public work queue, communicate with registered customers, and deliver completed work.

The experience must feel like Nasora rather than a copy of the reference website. Its identity combines a celestial night theme with an autumn daytime theme, polished motion, clear pricing guidance, and a workflow that reduces repetitive administration.

## Problem to solve

The artist currently needs a single source of truth for work samples, commission information, customer requests, quotes, payment evidence, queue position, revisions, status history, and delivery. Customers also need a clear way to understand the available services and submit enough information for the artist to quote accurately.

Reference prices are not checkout prices. Each commission differs in complexity, so the artist must issue the final quote after reviewing the request.

## Primary users

### Public visitor

Browses featured work, portfolio, commission albums, reference pricing, queue, documents, and contact information.

### Registered customer

Uses email/password or Google sign-in. Can submit requests, receive and accept quotes, accept the current Terms, pay a deposit, upload slips, make partial payments, exchange text and images, follow job status, request revisions, and access delivery files.

### Guest customer

Submits the initial service-specific request form without an account. All later discussion and payment happen outside the website. The administrator records the guest quote, payment, and queue information manually. A guest can see the public queue row but cannot access private job details.

### Administrator

One owner account manages the entire service catalog, media, content, forms, quotes, payment verification, jobs, queue, messages, documents, settings, and retention actions.

## Phase 1 objectives

1. Present Nasora's work through a responsive, fast public website
2. Support a service hierarchy that can grow without code changes
3. Let every service subtype have its own editable request form and availability status
4. Keep published prices as guidance while allowing the administrator to set the final quote
5. Support registered and guest request flows without exposing private information
6. Track the full lifecycle from request through delivery and permanent history
7. Support a 50% default deposit, manually verified PromptPay slips, and customer-selected partial payments after deposit
8. Give registered customers an in-site communication and notification experience
9. Give the administrator complete control through one private dashboard
10. Meet measurable performance, accessibility, privacy, and security requirements

## Success indicators

- A first-time visitor can find a service, understand its reference price, and submit the correct form without assistance
- The administrator can add a new commission category, subtype, pricing guidance, form, and portfolio content without deploying code
- A registered request can progress from submission to delivery without using an external tracking tool
- A guest job can be represented accurately in the same queue and admin history without creating a guest portal
- Changing Home, Portfolio, or Commission layouts does not unintentionally change another page
- All accepted payments and job status changes are auditable
- Public pages meet the Core Web Vitals targets defined in `ACCEPTANCE_CRITERIA.md`
- Expected initial volume of fewer than 50 commission requests per month fits within the selected free tiers

## Constraints

- Start on free tiers and upgrade only when real usage justifies it
- Use a temporary deployment URL initially
- Consider purchasing a custom domain after approximately 6–10 interested customers
- Use Supabase for PostgreSQL, Auth, and Realtime
- Use Cloudflare R2 for media and private files
- Deploy a Next.js application to Vercel
- No footer
- Desktop-first design with a complete responsive mobile experience
- One administrator in Phase 1

## Product principles

- Reference, then quote: catalog prices inform; the artist decides the actual price
- Separate page layouts: Home, Portfolio, and Commission must not share composite layouts
- Share primitives, not page structure: buttons and inputs may be shared; page grids and content arrangements remain feature-owned
- Preserve history: business records remain permanent even after associated private files expire
- Private by default: customer files and details are never publicly addressable
- Progressive cost: start small, monitor limits, and retain clear migration paths
- Fast by design: optimize media before upload and avoid unnecessary server compute

## Phase 1 non-goals

- Multi-artist marketplace
- Multiple administrator roles
- Automatic payment gateway confirmation
- Guest portal or guest private tracking link
- Automatic price calculation from the public catalog
- Interactive 3D model viewer
- LINE notifications
- Formal tax invoice generation
- Store, reviews, PDF expense summary, 2FA, sharing, customer email notifications, and spam protection

## Phase 2 direction

Phase 2 may add a digital item store, verified-customer reviews, expense summary PDFs, administrator 2FA, sharing, anti-spam measures, customer email notifications, and other improvements validated after Phase 1 usage.

