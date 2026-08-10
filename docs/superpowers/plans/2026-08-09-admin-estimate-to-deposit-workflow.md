# Admin Estimate-to-Deposit Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect submitted member and Guest estimate requests to the real admin workflow, manual quotes, PromptPay deposit verification, job creation, and public queue insertion.

**Architecture:** Keep Supabase/PostgreSQL as the source of truth and perform every administrative mutation through server-only Next.js endpoints backed by transactional database functions. The customer does not need a separate “accept quote” action: uploading the required deposit slip expresses intent. Task 5 admin verification records the verified payment only; Task 6 consumes that verified deposit in a separate atomic transaction that accepts the quote, creates the job, and inserts its queue entry.

**Tech Stack:** Next.js App Router, TypeScript, React, Supabase Auth/PostgreSQL/RLS, Cloudflare R2, Vitest, Testing Library, Zod.

## Global Constraints

- Preserve the approved admin and public UI; replace fixture data without redesigning layouts.
- Support both member and Guest requests. Guest private details may be displayed only to the authenticated Admin account (`nasora.nsr300@gmail.com`) and communication stays external in this phase; render private contact server-side and do not place it in shared client state.
- THB integer satang is authoritative. USD is display-only and must never be used for settlement calculations.
- Standard deposit is 50%, editable per quote.
- Quote values are snapshots. Later catalog price changes affect only future estimates.
- Customers may pay the remainder in flexible installments only after the deposit is verified; the minimum normal installment is 100 THB, except the final outstanding amount may be lower.
- A job enters the public queue only after its deposit slip is verified.
- Store slip objects privately in R2 and schedule deletion after 30 days; retain payment records permanently. Upload slips through a same-origin Worker gateway that rejects bodies over 5 MiB and validates image magic bytes before writing to R2; use short-lived signed URLs only for authorized Admin previews.
- Show an “Admin area” entry in the floating account menu only when the signed-in identity is `nasora.nsr300@gmail.com` and its immutable `app_metadata.role` is `admin`; `/admin` must independently enforce the same server-side authorization.
- Do not expose service-role credentials, Guest contact data, R2 object keys, or private admin notes to public or member browser clients. The authenticated Admin account (`nasora.nsr300@gmail.com`) may view Guest contact details through an admin-authorized server-rendered detail view.

---

## File Structure

- `src/features/admin/estimates/domain/admin-estimate.ts`: Zod schemas and typed admin request/quote commands.
- `src/features/admin/estimates/data/admin-estimate-repository.server.ts`: server-only request and quote reads/writes.
- `src/features/admin/estimates/components/admin-estimate-inbox.tsx`: real inbox while preserving current layout.
- `src/features/admin/estimates/components/admin-estimate-detail.tsx`: request detail and quote editor.
- `src/app/(admin)/admin/estimates/page.tsx`: server page composing the estimate feature.
- `src/app/api/admin/estimates/[requestId]/status/route.ts`: reviewing/declined status endpoint.
- `src/app/api/admin/estimates/[requestId]/quotes/route.ts`: draft/save/send quote endpoint.
- `src/features/member/data/member-quote-repository.ts`: member-owned quote and deposit-instruction reads.
- `src/app/[locale]/member/requests/[requestId]/page.tsx`: member quote/deposit screen.
- `supabase/migrations/20260809190000_admin_estimate_workflow.sql`: transactional quote functions and admin read contracts.
- `supabase/migrations/20260809200000_payment_deposit_workflow.sql`: payment intents, private slip metadata, and ledger-only verification.
- `src/features/payments/domain/payment.ts`: money, deposit, installment, and slip validation.
- `src/features/payments/data/payment-repository.ts`: member payment-intent operations.
- `src/features/payments/data/admin-payment-repository.server.ts`: admin verification operations.
- `src/features/payments/storage/r2-slip-storage.server.ts`: private R2 write/read/delete operations and short-lived Admin preview signing.
- `src/app/api/member/payments/[id]/intent/route.ts`: deposit intent creation.
- `src/app/api/member/payments/[id]/slip-upload/route.ts`: same-origin 5 MiB Worker upload gateway with image signature validation.
- `src/app/api/admin/payments/[paymentId]/verify/route.ts`: approve/reject endpoint.
- `src/features/admin/jobs/data/admin-job-repository.server.ts`: real admin job/queue reads and mutations.
- `src/features/queue/data/public-queue-repository.server.ts`: safe public queue view reads.

---

### Task 1: Real Admin Estimate Inbox

**Files:**
- Create: `src/features/admin/estimates/domain/admin-estimate.ts`
- Create: `src/features/admin/estimates/data/admin-estimate-repository.server.ts`
- Create: `src/features/admin/estimates/components/admin-estimate-inbox.tsx`
- Modify: `src/app/(admin)/admin/estimates/page.tsx`
- Test: `tests/unit/admin-estimate-repository.test.ts`
- Test: `tests/components/admin-estimate-inbox.test.tsx`

**Interfaces:**
- Produces: `listAdminEstimateRequests(filters): Promise<AdminEstimateSummary[]>`
- Produces: `AdminEstimateSummary` with request ID/code, customer display name, requester type, service snapshot, budget, submitted time, and status.

- [ ] **Step 1: Write failing repository tests** verifying status filtering, newest-first ordering, member/Guest display names, and no Guest contact in summary rows.
- [ ] **Step 2: Run** `npm test -- --run tests/unit/admin-estimate-repository.test.ts` and confirm failure because the repository does not exist.
- [ ] **Step 3: Implement the server repository** using the authenticated Supabase server client, reject non-admin sessions, select only inbox columns, and parse rows with Zod.
- [ ] **Step 4: Write failing component tests** for loading real rows, empty state, status badge, and opening a request.
- [ ] **Step 5: Replace the fixture `clients` list** with `AdminEstimateInbox` while retaining the approved table, metrics, spacing, and CSS classes.
- [ ] **Step 6: Run** `npm test -- --run tests/unit/admin-estimate-repository.test.ts tests/components/admin-estimate-inbox.test.tsx` and expect PASS.
- [ ] **Step 7: Commit** `feat(admin): connect estimate inbox to submitted requests`.

### Task 2: Review Request Detail and Admin Decision

**Files:**
- Create: `src/features/admin/estimates/components/admin-estimate-detail.tsx`
- Create: `src/app/api/admin/estimates/[requestId]/status/route.ts`
- Modify: `src/features/admin/estimates/data/admin-estimate-repository.server.ts`
- Test: `tests/unit/admin-estimate-status-route.test.ts`
- Test: `tests/components/admin-estimate-detail.test.tsx`

**Interfaces:**
- Consumes: `AdminEstimateSummary` and request IDs from Task 1.
- Produces: `getAdminEstimateRequest(requestId): Promise<AdminEstimateDetail>`.
- Produces: `POST /api/admin/estimates/:requestId/status` accepting `{ status: "reviewing" | "declined", reason?: string }`.

- [ ] **Step 1: Write failing route tests** for admin authorization, invalid transition rejection, required decline reason, and successful audit logging.
- [ ] **Step 2: Run** `npm test -- --run tests/unit/admin-estimate-status-route.test.ts` and confirm RED.
- [ ] **Step 3: Add a transactional database command** that locks the request row, permits `submitted -> reviewing|declined` and `reviewing -> declined`, stamps lifecycle fields, and appends an `audit_logs` record.
- [ ] **Step 4: Implement the server route** with Zod input parsing, authenticated admin enforcement, safe 400/401/403/409 responses, and no service-role output.
- [ ] **Step 5: Build the detail view** showing the exact submitted brief, member/Guest identity marker, private contact for admin only, usage, budget, deadline, extras, and request answers.
- [ ] **Step 6: Add Review and Decline actions** without changing the existing admin theme; declining requires a reason confirmation.
- [ ] **Step 7: Run focused tests** and expect detail rendering and transitions to pass.
- [ ] **Step 8: Commit** `feat(admin): add estimate review and decline workflow`.

### Task 3: Manual Quote Drafting and Immutable Price Snapshot

**Files:**
- Create: `supabase/migrations/20260809190000_admin_estimate_workflow.sql`
- Modify: `src/features/admin/estimates/domain/admin-estimate.ts`
- Modify: `src/features/admin/estimates/data/admin-estimate-repository.server.ts`
- Modify: `src/features/admin/estimates/components/admin-estimate-detail.tsx`
- Create: `src/app/api/admin/estimates/[requestId]/quotes/route.ts`
- Test: `tests/unit/admin-quote-migration.test.ts`
- Test: `tests/unit/admin-quote-route.test.ts`
- Test: `tests/components/admin-quote-editor.test.tsx`

**Interfaces:**
- Produces: `AdminQuoteDraftInput` containing localized scope, item lines, total satang, deposit percent, free revisions, duration range, proposed deadline, expiry, and Terms document reference.
- Produces: an admin-only `private.save_and_send_quote(request_id, payload)` transaction.

- [ ] **Step 1: Write migration contract tests** requiring sequential quote versions, item totals equal quote total, immutable sent quotes, and automatic superseding of earlier sent versions.
- [ ] **Step 2: Run** `npm test -- --run tests/unit/admin-quote-migration.test.ts` and confirm RED.
- [ ] **Step 3: Implement `private.save_and_send_quote`** to lock the request, calculate the next version, validate item totals and deposit, create quote/items, mark it `sent`, update the request to `quoted`, supersede the prior sent quote, and append audit logs atomically.
- [ ] **Step 4: Implement the quote editor** with editable line items for base work and additions, default 50% deposit, default 4 revisions, duration, deadline, and final THB total. Show USD only as an approximate display.
- [ ] **Step 5: Add route tests** proving only admin can save/send and that duplicate submissions are idempotent.
- [ ] **Step 6: Run focused tests** and expect PASS.
- [ ] **Step 7: Commit** `feat(admin): create versioned manual commission quotes`.

### Task 4: Customer Quote and Deposit Instructions

**Files:**
- Create: `src/features/member/data/member-quote-repository.ts`
- Create: `src/features/member/components/member-quote-panel.tsx`
- Create: `src/app/[locale]/member/requests/[requestId]/page.tsx`
- Modify: `src/features/member/components/member-requests-page.tsx`
- Test: `tests/unit/member-quote-repository.test.ts`
- Test: `tests/components/member-quote-panel.test.tsx`

**Interfaces:**
- Consumes: sent quote and item snapshots from Task 3.
- Produces: member-owned quote view with `totalSatang`, `depositSatang`, `outstandingSatang`, scope, items, deadline, expiry, and payment call-to-action.

- [ ] **Step 1: Write failing ownership tests** ensuring members can read only quotes belonging to their own request and Guest quotes remain unavailable publicly.
- [ ] **Step 2: Implement the member quote repository** through existing RLS, returning only the latest sent quote and its item snapshots.
- [ ] **Step 3: Write component tests** for price breakdown, 50% default deposit, expired quote, replaced quote, and no separate Accept button.
- [ ] **Step 4: Implement the quote panel** inside the existing member area. Its primary action is “ชำระมัดจำ / Pay deposit”; paying the deposit serves as acceptance.
- [ ] **Step 5: Keep Guest delivery external** in this phase: admin may copy a private quote summary/link, but no Guest token portal is introduced.
- [ ] **Step 6: Run focused tests** and expect PASS.
- [ ] **Step 7: Commit** `feat(member): show sent quote and deposit instructions`.

### Task 5: PromptPay Deposit, Private R2 Slip Upload, and Admin Verification

**Files:**
- Create: `supabase/migrations/20260809200000_payment_deposit_workflow.sql`
- Create: `src/features/payments/domain/payment.ts`
- Create: `src/features/payments/data/payment-repository.ts`
- Create: `src/features/payments/data/admin-payment-repository.server.ts`
- Create: `src/features/payments/storage/r2-slip-storage.server.ts`
- Create: `src/app/api/member/payments/[id]/intent/route.ts`
- Create: `src/app/api/member/payments/[id]/slip-upload/route.ts`
- Create: `src/app/api/admin/payments/[paymentId]/verify/route.ts`
- Modify: `src/app/(admin)/admin/payments/page.tsx`
- Test: `tests/unit/payment-migration.test.ts`
- Test: `tests/unit/payment-domain.test.ts`
- Test: `tests/unit/payment-routes.test.ts`
- Test: `tests/components/admin-payment-review.test.tsx`

**Interfaces:**
- Produces tables `payment_intents`, `payments`, and `payment_slips` with permanent ledger rows and expiring private object metadata.
- Produces: deposit PromptPay payload/QR data, a bounded Worker slip upload gateway, short-lived signed Admin preview URLs, and admin approve/reject commands.

- [ ] **Step 1: Write failing domain tests** for exact deposit calculation, later installments, minimum 100 THB, final remainder below 100 THB, overpayment rejection, and integer satang rules.
- [ ] **Step 2: Write failing migration tests** for one pending deposit intent per quote, append-only verified payments, private slip metadata, and idempotent verification.
- [ ] **Step 3: Implement payment tables and RLS** so members access only their own intents while admin can review all; no anonymous payment or slip access.
- [ ] **Step 4: Generate PromptPay QR data server-side** from the configured PromptPay identifier and exact deposit amount; return payload data without logging the identifier.
- [ ] **Step 5: Implement the Worker upload gateway** permitting PNG/JPEG/WebP only, rejecting declared or streamed bodies above 5 MiB, validating magic bytes before the private R2 write, using a database-generated unpredictable key, allowing one active slip per intent, and recording `delete_after = uploaded_at + interval '30 days'`. Signed URLs are reserved for short-lived Admin previews.
- [ ] **Step 6: Connect the approved admin Payments UI** to pending slips with temporary signed preview URLs and Approve/Reject actions.
- [ ] **Step 7: Verify rejection keeps the payment intent open** for a replacement slip, while approval permanently records amount, verifier, and timestamp.
- [ ] **Step 8: Run focused tests** and expect PASS.
- [ ] **Step 9: Commit** `feat(payments): add PromptPay deposit and slip verification`.

### Task 6: Atomic Job Creation and Queue Entry After Verified Deposit

**Files:**
- Create: `supabase/migrations/20260809210000_deposit_to_job_workflow.sql`
- Create: `src/features/admin/jobs/data/admin-job-repository.server.ts`
- Create: `src/features/queue/data/public-queue-repository.server.ts`
- Modify: `src/app/(admin)/admin/jobs/page.tsx`
- Modify: `src/features/queue/components/queue-page.tsx`
- Modify: `src/features/member/components/member-job-page.tsx`
- Test: `tests/unit/deposit-to-job-migration.test.ts`
- Test: `tests/unit/admin-job-repository.test.ts`
- Test: `tests/components/queue-table.test.tsx`
- Test: `tests/components/member-job-page.test.tsx`

**Interfaces:**
- Consumes: verified deposit, sent quote, request, default workflow/status.
- Produces: `private.create_job_from_verified_deposit(payment_id)` returning `{ job_id, queue_entry_id }` exactly once.

- [ ] **Step 1: Write failing transaction tests** proving that verified deposit, accepted quote, converted request, job, first status history row, queue entry, and audit log either all commit or all roll back.
- [ ] **Step 2: Add idempotency tests** proving a repeated verification cannot create a second job or queue entry.
- [ ] **Step 3: Implement the transactional function** to require an already verified deposit, set `quotes.status = 'accepted'`, set `commission_requests.status = 'converted'`, create the job from immutable snapshots, set `deposit_verified_at`, add initial status history, and order the queue by verification time.
- [ ] **Step 4: Replace admin job fixtures** with real jobs, while preserving manual Guest job creation as a separate admin-only action.
- [ ] **Step 5: Replace public queue fixtures** with the safe public queue view containing only rank, display name, service, public status, and deadline.
- [ ] **Step 6: Connect member job history** to the created job without exposing admin notes or Guest data.
- [ ] **Step 7: Run** `npm test -- --run --maxWorkers=2`, `npm run typecheck`, `npm run lint`, and `npm run build`; all must pass.
- [ ] **Step 8: Commit** `feat(workflow): create jobs and queue entries after deposit`.

---

## Acceptance Flow

1. A member or Guest submits an estimate request.
2. Admin sees it in the real inbox and marks it reviewing or declined.
3. Admin creates a versioned manual quote with final price and deposit.
4. A member sees the quote; a Guest receives the quote through the external contact channel.
5. The customer pays the deposit by PromptPay and uploads a slip; admin approves or rejects it.
6. Task 5 approval records the verified payment only; Task 6 atomically consumes it to create the job and public queue entry. Rejection creates neither.

## Final Verification

- Run `npm test -- --run --maxWorkers=2` and require all suites to pass.
- Run `npm run typecheck`, `npm run lint`, and `npm run build` with exit code 0.
- Test one member request and one Guest request end-to-end against local Supabase.
- Confirm another member cannot read the first member's request, quote, payment, or job.
- Confirm anonymous users can read the safe queue but not Guest contacts, quotes, slips, or payment rows.
- Confirm a verified deposit produces exactly one job and one queue entry.
- Confirm an R2 slip preview URL expires and its database metadata retains the 30-day cleanup date.
