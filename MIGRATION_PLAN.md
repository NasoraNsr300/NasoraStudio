# MIGRATION PLAN — Nasora

## Migration context

Nasora is a greenfield project. There is no existing application database or production user data to migrate. The migration work is therefore:

1. Establish reproducible infrastructure and schema migrations
2. Import artwork, pricing guidance, documents, and configuration supplied by the owner
3. Move from local development to a temporary public URL
4. Preserve clean migration paths for compute, domain, email, and Phase 2 features

## Stage 0 — Repository and delivery foundation

- Initialize Git repository and protected main branch when authorized
- Configure Node.js and pinned package versions with a committed lockfile
- Create development, preview, and production environment definitions
- Establish lint, type-check, unit-test, build, and migration verification commands
- Store secrets only in local environment/Cloudflare/Supabase secret stores
- Add CI that does not deploy when tests or migrations fail

Exit criteria:

- Clean install and build succeeds from an empty machine environment
- No production secret exists in the repository or public bundle

## Stage 1 — Provision free-tier infrastructure

### Supabase

- Create development and production projects
- Configure Auth URL and redirects for local, preview, and temporary production URL
- Enable email/password and Google OAuth
- Configure Brevo custom SMTP before public email/password registration
- Create database schemas and required extensions
- Confirm Data API exposure settings

### Cloudflare

- Create application Worker
- Create three R2 buckets: public media, original media, and customer files
- Configure least-privilege R2 credentials and CORS
- Enable Cloudflare Web Analytics
- Configure scheduled cleanup trigger

Exit criteria:

- Auth test email can reach a non-team test account
- Application can write/read authorized R2 test objects
- Anonymous access cannot read private objects

## Stage 2 — Schema migration workflow

- Create every migration through the Supabase CLI migration command
- Apply iteratively to local/development database
- Seed only deterministic configuration such as default statuses and initial service categories
- Enable RLS before granting exposed roles access
- Run Supabase advisors and schema tests before promoting a migration
- Apply the same ordered migration set to preview, then production
- Record migration version in deployment metadata

Migration order:

1. Identity and settings
2. Media and placements
3. Commission catalog and forms
4. Requests and quotes
5. Jobs, workflows, and queue
6. Payments, refunds, and delivery
7. Messaging and notifications
8. Documents
9. Operations, cleanup, audit, and indexes
10. RLS policies and safe public projections

Rollback rule:

- Prefer forward-fix migrations after production data exists
- A destructive rollback requires an export and verified restore target
- Columns/tables are deprecated before removal; they are not dropped in the same release that stops using them

## Stage 3 — Application rollout

### 3A Global shell and identity

- Night/Autumn themes
- Floating Navbar, Sidebar, Floating Button
- Email/password and Google Auth
- Profiles, locale, password management, and multiple member contact methods

### 3B Public content

- Home, Portfolio, Commission, Queue, Documents, About
- Contextual search
- Home Quick Info Panel
- Random per-visit Hero pool and independent featured-work carousel
- Image-led Commission album tiles
- Public media pipeline

### 3C Commission workflow

- Dynamic forms
- Member and guest requests
- Manual quotes and Terms acceptance
- PromptPay QR, slips, deposits, and partial payments
- Jobs, queue, statuses, messages, revisions, and delivery

### 3D Administrator and operations

- Admin content management
- Pricing guidance and form editing
- Queue and workflow editing
- Email notifications
- Scheduled retention and audit
- Analytics and operational warnings

Each stage is released to preview and passes its acceptance subset before merging into the production release candidate.

## Stage 4 — Content onboarding

The owner will prepare artwork after the system is ready.

### Import sequence

1. Create initial service categories and subtypes
2. Add reference prices and modifiers
3. Build each service-specific form
4. Upload original artwork
5. Generate and verify WebP variants
6. Create separate Home Hero, Home featured, Portfolio, and Commission placements
7. Add Thai and English descriptions and alternative text
8. Publish Terms, Privacy Policy, About, and linked commercial-use documents
9. Configure Discord contact
10. Configure global and subtype availability

Content validation:

- No missing required English or Thai content on published items
- Every published service has a form and at least one reference price or explicit contact instruction
- Every public image has valid dimensions and alternative text
- No original or private customer asset is exposed by a public URL

## Stage 5 — Prelaunch rehearsal

Run complete workflows using test accounts:

- Registered email/password customer
- Registered Google customer
- Guest request
- Administrator quote and slip review
- Deposit, partial payment below/above minimum, and final balance
- Rejected slip and retry
- Revision count and excess revision charge
- Queue creation and manual ordering override
- R2 delivery and Google Drive delivery
- 30-day expiry simulated with test timestamps
- Account deletion request and profile anonymization

Perform:

- RLS negative tests
- Accessibility checks
- Desktop/mobile visual regression
- Lighthouse and real-device performance tests
- Worker CPU profiling on dynamic routes
- Database export and restore drill

## Stage 6 — Temporary URL launch

- Deploy production build to Cloudflare temporary URL
- Use Brevo SMTP with a verified sender configuration
- Keep customer email notifications disabled except required Auth flows
- Enable administrator email notifications
- Enable Web Analytics
- Start with commission availability closed
- Complete final production smoke test
- Open selected service subtypes from admin
- Monitor errors, CPU time, email delivery, storage, and database usage daily during the first week

The absence of a custom domain does not block launch. Domain purchase is reconsidered after approximately 6–10 interested customers.

## Backup and recovery

Because Supabase Free does not provide downloadable managed backups:

- Schedule logical database exports to a protected local or external backup target
- Encrypt backups containing personal data
- Retain at least the most recent successful export and one prior known-good export
- Verify restore into a non-production project before launch and periodically afterward
- Store R2 object inventory metadata so database/object mismatches can be audited

Recovery priorities:

1. Identity linkage and profiles
2. Requests, quotes, jobs, queue, and status history
3. Payments, slips, refunds, and audit records
4. Documents and catalog content
5. Public media derivatives, which can be recreated from originals

## Retention migration

The cleanup job is deployed in report-only mode first:

1. Identify assets that would expire
2. Confirm the selection in admin logs
3. Enable hiding expired links
4. Enable R2 deletion after successful rehearsal
5. Keep slips and permanent business records excluded

This prevents a retention bug from deleting valid customer files during initial rollout.

## Cloudflare CPU fallback

Trigger: repeated production `Exceeded CPU Time Limits` errors after optimization, or an authenticated route consistently approaches the Free limit.

Plan:

1. Confirm the route and profile CPU usage
2. Move more public routes to static/ISR and reduce server bundle work
3. Move isolated privileged tasks to Supabase Edge Functions
4. If still necessary, deploy Next.js compute to another commercial-compatible provider
5. Keep Supabase and R2 endpoints unchanged
6. Update DNS only after a custom domain exists; before then switch the published temporary URL

No database transformation is required for this compute migration.

## Custom domain migration

When a domain is purchased:

- Attach domain to Cloudflare deployment
- Add production Auth redirect URLs
- Configure R2 public media custom domain if selected
- Authenticate dedicated email subdomain with SPF, DKIM, and DMARC
- Update canonical URLs and sitemap
- Redirect temporary URLs when the platform permits
- Verify Google OAuth redirect configuration

## Phase 2 migration safety

Store, Review, PDF, 2FA, Share, anti-spam, and customer email notifications are added through new modules and forward-only schema migrations. Phase 1 job and payment tables are extended through stable references rather than repurposed into store-order tables.

## Completion criteria

Migration is complete when:

- Production schema matches the committed migration list
- Content onboarding checklist passes
- Full registered and guest rehearsals pass
- Backup restore is demonstrated
- Retention runs safely in report-only and enabled modes
- Temporary URL launch passes `ACCEPTANCE_CRITERIA.md`
- Rollback and compute fallback steps are documented and executable
