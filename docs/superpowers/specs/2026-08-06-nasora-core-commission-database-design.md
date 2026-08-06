# Nasora Core Commission Database Design

## Objective

Create the durable Supabase/PostgreSQL foundation for commission requests, manual quotes, jobs, the public queue, and permanent work history. This design implements roadmap item 3 only. Payment slips, messaging, delivery files, and email delivery remain separate follow-up migrations for items 6–8.

## Design choice

Use normalized business tables with immutable snapshots and append-only history. Public reference prices never become authoritative job prices. The administrator manually creates a quote after reviewing a request, and an accepted quote becomes the starting financial and scope snapshot for a job.

Money is stored as integer satang. Business records use UUID primary keys and UTC `timestamptz`. Status values use constrained text enums where they describe a bounded lifecycle. Every exposed table has RLS enabled and explicit Data API grants.

## Tables

### `commission_requests`

Stores one submitted brief from either a member or Guest.

- `requester_type`: `member` or `guest`
- `user_id`: required for a member and null for Guest
- Guest alias and private contact snapshot
- Member contact snapshot independent from later profile edits
- Category and subtype snapshot fields so the request remains readable before the dynamic catalog is implemented
- Personal or commercial usage
- Budget range, requested deadline, description, mood, and extra counts
- Status: `submitted`, `reviewing`, `quoted`, `declined`, `cancelled`, `converted`, or `closed`
- Submission, closing, and archive timestamps

Customers may read their own member requests. Direct anonymous writes are not granted; item 4 will submit Guest requests through a validated server endpoint.

### `request_answers`

Stores extensible answers that do not belong in the stable request columns. Each row has a stable field key, typed JSONB value, and display-order snapshot. This allows item 4 to introduce editable form templates without rewriting the core request table.

Member answers inherit ownership through the parent request. Submitted answers are read-only to customers.

### `quotes`

Stores versioned manual quotes for a request.

- Increasing version unique within a request
- Status: `draft`, `sent`, `accepted`, `declined`, `expired`, `closed`, or `superseded`
- Scope snapshot, total satang, deposit percent and satang, free revisions, estimated duration, proposed deadline, expiry, and Terms reference
- Lifecycle timestamps and administrator actor IDs

Quote amounts are immutable after the quote leaves `draft`. A new version supersedes an earlier quote. Catalog price edits therefore affect only future requests.

### `quote_items`

Stores itemized price lines with label and description snapshots, quantity, unit amount, line total, item type, and display order. A constraint verifies that quantities are positive and amounts are valid integer satang values.

### `status_workflows` and `status_definitions`

Define reusable or subtype-specific work stages. Initial definitions support waiting, sketching, coloring, review, delivery, completion, and cancellation. Definitions contain separate private and public Thai/English labels so public queue text never exposes internal notes.

Used workflow rows are archived rather than deleted.

### `jobs`

Represents work created from an accepted quote or manually created for a Guest.

- Optional request and accepted-quote references
- Member owner or Guest alias/contact snapshot
- Category and subtype snapshots
- Current workflow and status
- Original quote total plus current total in satang
- Deposit percent and reserved verification timestamp fields used later by payment processing
- Deadline, work-start, completion, cancellation, and archive timestamps
- Default free revisions

Ownership constraints require exactly one customer identity path: member or Guest. Item 5 will be the only normal route that creates or changes Guest jobs.

### `job_charge_adjustments`

Appends scope changes after acceptance. Each row stores a signed satang amount, category, localized reason, actor, and timestamp. Adjustments never overwrite the accepted quote. Current job total is changed only through a guarded database function that writes the adjustment and audit entry in one transaction.

### `job_status_history`

Append-only timeline of every status transition, including the previous and next status, public note, private note, actor, and timestamp. Normal application roles cannot update or delete history.

### `queue_entries`

Stores one active public projection per job.

- Public display-name, service, status, and deadline snapshots
- Default ordering timestamp, initially the verified-deposit time
- Optional manual rank and override reason
- Visibility and lifecycle timestamps

Anonymous and authenticated users read only a security-invoker public view containing safe queue fields. Guest contact details, request IDs, quote IDs, and private job data are excluded.

### `audit_logs`

Append-only records for material administrator actions. Each row stores actor, action, entity type and ID, redacted before/after JSONB, reason, and timestamp. It is never exposed to anonymous or ordinary member roles.

## Authorization

- Administrator authorization uses `auth.users.raw_app_meta_data ->> 'role' = 'admin'`; editable user metadata is never trusted.
- Members can select only requests, quotes, quote items, jobs, status history, and queue-related private records that resolve to their own `auth.uid()`.
- Members cannot set quote amounts, create jobs, move statuses, edit queue order, or write audit logs.
- Guest private records are inaccessible through the public Data API.
- Administrative mutations will use server-side validation in item 5 in addition to RLS.
- RLS predicates use `(select auth.uid())` to avoid per-row function evaluation.

## Database functions

Privileged functions live in a non-exposed `private` schema, revoke execution from `PUBLIC`, validate the authenticated administrator, set a fixed `search_path`, and perform transactional mutations.

Initial functions:

- Adjust a job total while appending `job_charge_adjustments` and `audit_logs`
- Change job status while appending `job_status_history`, refreshing the queue status snapshot, and setting lifecycle timestamps
- Reorder a queue entry while recording the override reason and audit entry

Item 5 will invoke these functions through server-only routes rather than exposing them directly to the browser.

## Indexes and constraints

- Requests by member/status/submission time and by status/submission time for admin
- Quotes unique by request/version and indexed by status/expiry
- Jobs by member/status/deadline and current status/deadline
- Status definitions unique by workflow/stable key and workflow/display order
- Status history by job/change time
- Queue by visibility/manual rank/default-order time
- Audit log by entity and creation time
- Check constraints for identity shape, money, percentages, counts, lifecycle statuses, and quote expiry

Foreign-key delete behavior preserves business history: customer deletion does not cascade accepted business records. User references become null where appropriate, while request/quote/job hierarchy uses restrictive or controlled cascades only for unsubmitted test data.

## Seed data

Seed one default commission workflow and its public Thai/English statuses. Do not seed customer, request, quote, job, or queue fixture rows into production.

## Verification

The migration is accepted when:

1. Migration contract tests fail before implementation and pass afterward.
2. Every exposed table has RLS and explicit grants.
3. Anonymous users can read only the safe public queue view.
4. A member can read their own request/job history but not another member's rows.
5. Guest contacts cannot be selected by anonymous or member roles.
6. Invalid identity combinations, negative totals, invalid deposit rates, duplicate quote versions, and invalid status transitions are rejected.
7. Job total, status, queue, history, and audit mutations commit atomically.
8. Supabase security and performance advisors report no actionable schema findings.
9. Existing authentication, profile, and contact-channel tests remain green.

## Deferred work

- Dynamic service catalog and versioned form-template tables are implemented with item 4 where the form builder is connected.
- Payment ledger, PromptPay, slips, and R2 assets are item 6.
- Conversations, notifications, progress media, and delivery links are item 7.
- Email outbox, cleanup scheduling, performance hardening, and deployment are item 8.
