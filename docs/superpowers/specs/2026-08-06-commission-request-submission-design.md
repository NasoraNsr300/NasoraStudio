# Nasora Commission Request Submission Design

## Objective

Connect the existing estimate-request modal to Supabase so signed-in members and Guests can submit real commission briefs without changing the approved UI layout. This design implements roadmap item 4 only. Reference-image storage remains deferred until the R2 work in item 6.

## Confirmed behavior

- The customer mode is derived from the authentication session rather than chosen manually.
- A signed-in customer submits as a member. The form displays their current nickname and preferred contact channel from `profiles` and `contact_channels`.
- A signed-out customer submits as Guest and must provide a display name, contact kind, and contact value.
- The selected category and service subtype are locked to the service card that opened the modal.
- Submission stores the brief once and returns a short human-readable reference code.
- Submitted briefs cannot be edited. Members may later cancel a brief while it is awaiting review; Guest follow-up remains outside the website.
- Reference image selection and upload are not included in this item. The upload control is hidden until R2 support is available so the interface does not imply that files were saved.
- Draft persistence remains deferred. The existing draft action stays non-operative or hidden until its behavior is defined.

## Submission architecture

Use one public, security-definer PostgreSQL function as the only customer submission boundary. The browser calls the RPC with validated form data. The function independently derives the authenticated user, validates the requested mode and identity shape, inserts `commission_requests` and `request_answers` in one transaction, and returns the request ID plus reference code.

This is preferred over direct table inserts because the parent request and extensible answers must commit atomically and Guest writes must not receive broad table permissions. It is preferred over a service-role API route because no elevated secret is required in the web runtime.

The function will:

1. Use a fixed `search_path` and revoke execution from `PUBLIC` by default.
2. Accept calls from `anon` and `authenticated` only through an explicit grant.
3. Treat an existing `auth.uid()` as a member submission regardless of client-supplied identity fields.
4. Read the member nickname and default contact channel from the database and create immutable snapshots.
5. Require complete Guest identity and contact data when `auth.uid()` is null.
6. Validate category/service snapshots, usage, budget range, deadline, length limits, and non-negative extra counts.
7. Insert the stable fields into `commission_requests` and any extensible values into `request_answers` atomically.
8. Return only the new request ID and generated reference code; it does not expose private Guest rows afterward.

## Request data mapping

The current form maps to `commission_requests` as follows:

- Authentication state -> `requester_type` and `user_id`
- Profile or Guest fields -> immutable display-name and contact snapshots
- Selected album and subtype -> category/service slugs and localized name snapshots
- Personal or commercial -> `usage_type`
- Minimum and maximum THB -> integer satang budget columns
- Preferred date -> `requested_deadline`
- Project description -> `description`
- Mood, palette, and style -> `mood_and_style`
- Extra characters, background level, and props -> their count columns
- Initial lifecycle -> `submitted`

Form-version metadata and any future template-only answers use `request_answers`. The first version records a stable `form_version` answer so later form revisions do not make historical briefs ambiguous.

## Member identity and contact behavior

The modal consumes the existing authentication provider. While the session is loading, submission controls remain disabled. Once signed in, the member identity panel displays the authenticated nickname and the default contact channel loaded from the existing member repository. If the member has no contact channel, email is used as the snapshot fallback and the form explains that it comes from the account.

Client-provided member names and contacts are never authoritative. The database function reads them again during submission so a modified browser request cannot impersonate a different member.

## Guest behavior

Guests provide:

- Display name
- Contact kind: Discord, email, Facebook, or X
- Contact value

Guest contact data is private and is never exposed through the public queue. The success state shows the request reference code and asks the Guest to retain it for communication. Guest submissions do not create accounts and cannot be reopened through a public lookup page.

## Validation and interaction states

The form uses the same validation contract on the client and at the submission boundary:

- Required identity fields according to mode
- Required usage type, budget selection, deadline, and project description
- Budget values are non-negative and minimum cannot exceed maximum
- Deadline cannot be earlier than the current local date
- Description maximum 1,000 characters and mood/style maximum 800 characters
- Extra counts are bounded non-negative integers
- Privacy policy and terms must be accepted

The approved visual structure remains unchanged. Add only inline validation messages and the following states:

- Loading member identity
- Submitting, with the submit button locked against duplicate clicks
- Recoverable error, preserving all entered values
- Success, showing the reference code and a close action

## Member history

After successful submission, members can read their own request through the existing RLS policy. Item 4 connects the member estimate page to real request rows and answers, ordered newest first. The first version shows request reference, service snapshot, submission date, and lifecycle status. Pricing and job creation remain empty until the administrator completes item 5.

Member cancellation uses a separate guarded RPC. It permits only the owning member and only while the request status is `submitted` or `reviewing`. It changes the status to `cancelled`, records `closed_at`, and appends an audit-safe lifecycle entry. Guests cancel through their external contact channel.

## Security

- No new direct insert, update, or delete policies are granted to `anon` or ordinary members.
- Guest private records remain unreadable through the Data API.
- Member identity is derived from `auth.uid()` and database-owned profile data.
- Input JSON is constrained in both size and allowed keys before insertion.
- Function execution uses a fixed search path, fully qualified relations, and minimum required grants.
- The client never receives a service-role key.
- Duplicate submissions are prevented in the UI and the RPC accepts an idempotency key so retries return the original request.

## Testing

Acceptance requires:

1. Signed-out users see Guest fields; signed-in users see database-backed member identity.
2. A valid Guest brief creates one request and its answers atomically.
3. A valid member brief is owned by `auth.uid()` and ignores forged member identity input.
4. Invalid budgets, dates, counts, oversized text, missing legal consent, and mismatched requester modes are rejected.
5. Retrying the same idempotency key does not create a duplicate request.
6. Members can list only their own submitted briefs.
7. Members can cancel only their own request while it is awaiting review.
8. Guest contacts remain inaccessible to anonymous and ordinary authenticated reads.
9. Existing UI layout tests continue to pass, with new tests covering loading, error, success, and duplicate-submit behavior.
10. Supabase security and performance advisors report no new actionable findings.

## Deferred work

- Reference-image uploads and R2 asset metadata: item 6
- Administrator review, pricing, and queue creation: item 5
- Payment, PromptPay QR, and slip verification: item 6
- Messaging, progress updates, and delivery links: item 7
- Email delivery, cleanup jobs, optimization, and deployment: item 8
