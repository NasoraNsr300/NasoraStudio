# DATABASE SCHEMA — Nasora

## Implemented core foundation (2026-08-06)

Roadmap item 3 is deployed to Supabase. The implemented foundation contains:

- `commission_requests` and `request_answers` for member/Guest estimate history
- immutable, versioned `quotes` and `quote_items` with amounts stored as integer satang
- editable `status_workflows` and `status_definitions`, seeded with 7 default statuses
- `jobs`, append-only `job_charge_adjustments`, and append-only `job_status_history`
- `queue_entries` plus the safe `public_queue` security-invoker view
- append-only `audit_logs`
- admin-only atomic operations in the private schema for total adjustments, status changes, and queue reordering

All 11 exposed core tables have RLS enabled. Members can read only records owned by their `auth.uid()`. Guest contact data is admin-only, and the public queue projection excludes internal job IDs and all contact fields. The default deposit is 50% and the default free revision count is 4; both remain overridable per quote/job.

Payments, slips/R2 assets, conversations, delivery links, and email outbox remain intentionally deferred to roadmap items 6–8.

## Conventions

- Database: Supabase PostgreSQL
- Primary keys: UUID unless an ordered integer is specifically required
- Timestamps: `timestamptz` in UTC
- Money: integer satang, never floating point
- Localized content: explicit `*_th` and `*_en` columns for stable searchable fields; structured rich content may use localized JSONB
- Soft deletion: business records use `archived_at`; expiring object files use lifecycle status and `deleted_at`
- RLS is enabled on every table in an exposed schema
- Audit records and accepted business history are append-only to normal users

## Identity

### `profiles`

| Column | Purpose |
|---|---|
| `id` | FK to `auth.users.id` |
| `nickname` | Public queue display name for registered jobs |
| `locale` | `th` or `en` |
| `avatar_asset_id` | Optional private/public avatar asset |
| `created_at`, `updated_at` | Lifecycle timestamps |
| `archived_at` | Administrator-assisted account deletion marker |

Constraints and indexes:

- Case-insensitive unique nickname
- Member selects and updates only own profile
- Authorization role is not stored in editable profile fields

### `member_contact_methods`

| Column | Purpose |
|---|---|
| `id` | Contact method identifier |
| `user_id` | Owning member |
| `type` | Discord, email, X, Facebook, or custom |
| `label` | Member-facing label |
| `value` | Address, handle, or URL |
| `is_default` | Default choice for new requests |
| `display_order` | Profile ordering |
| `created_at`, `updated_at`, `archived_at` | Lifecycle timestamps |

Only the owning member and administrator may read these records. At most one active method per member is default.

## Site settings

### `site_settings`

Key/value records for global availability, default deposit percent, default free revisions, minimum partial payment, PromptPay configuration reference, automatic theme schedule, and current terms document.

Sensitive PromptPay identifiers are readable only by the server and administrator. Public projections expose only safe display values.

### `exchange_rates`

- `base_currency` fixed to THB
- `quote_currency` initially USD
- `rate`
- `effective_at`
- `set_by`

Used only for reference display. Quotes and payments remain THB.

### `contact_channels`

- Localized label
- Type and URL/handle
- Icon key
- Display order
- Visibility

Discord is seeded as the first channel.

## Media

### `media_assets`

| Column | Purpose |
|---|---|
| `id` | Logical media identifier |
| `owner_user_id` | Member owner when applicable |
| `job_id` | Related job for customer assets |
| `kind` | original, derivative, video, poster, reference, message, slip, delivery, avatar |
| `visibility` | public or private |
| `bucket` and `object_key` | R2 location |
| `mime_type`, `byte_size`, `width`, `height`, `duration_ms` | Media metadata |
| `sha256` | Integrity and duplicate detection |
| `source_asset_id` | Derivative-to-original relationship |
| `variant` | thumbnail, card, detail, original |
| `retention_policy` | permanent, job-plus-30-days, delivery-plus-30-days |
| `expires_at`, `deleted_at` | Lifecycle controls |

Indexes:

- `job_id`, `kind`, `expires_at`
- Unique active `bucket + object_key`
- Partial index for pending expiry

### Placement tables

`home_hero_items`, `home_featured_items`, `portfolio_items`, and `commission_examples` are separate tables. Each references a media asset but independently stores its own title, description, display order, visibility, focal point, crop/aspect settings, and feature-specific metadata.

- `home_hero_items` is the enabled Hero pool and may store a selection weight
- `home_featured_items` owns carousel ordering and an optional destination
- Hero selection is ephemeral per visit and does not require a database write or permanent visitor record

Removing or editing one placement does not alter another placement.

## Commission catalog

### `service_categories`

- Localized name, slug, description, cover asset
- Optional recommended badge and album item-count projection
- Display order
- Availability status
- Publication status

### `service_types`

- FK to category
- Localized name, slug, description, timing guidance
- Availability status independent from category
- Linked form template
- Linked status workflow
- Display order and publication status

### `pricing_options`

- FK to service type
- Localized label and description
- Usage type such as Personal or Commercial
- Reference amount in satang
- Display order and active period

These records are guidance only and are never FK-linked as the authoritative amount on a quote.

### `price_modifiers`

- FK to service type, nullable for global guidance
- Localized label and explanation
- Calculation type: fixed or percentage
- Value
- Display-only flag
- Display order and active status

### `form_templates`

- Localized title and instructions
- Version number
- Service type owner
- Published version flag
- Created and published timestamps

### `form_fields`

- FK to form template version
- Stable field key
- Type: short text, long text, number, date, select, radio, checkbox, multi-select, file
- Localized label, help, and placeholder
- Required flag
- Display order
- Validation JSONB
- Option JSONB with localized labels

Published form versions are immutable; edits create a new version so old request answers remain interpretable.

## Requests and quotes

### `commission_requests`

| Column | Purpose |
|---|---|
| `id` | Request identifier |
| `requester_type` | member or guest |
| `user_id` | Nullable member owner |
| `guest_display_name` | Public-safe guest alias |
| `guest_contact` | Private external contact details |
| `member_contact_method_id` | Nullable saved contact selected by a member |
| `contact_snapshot` | Private copy used for this request, including a one-request override |
| `service_type_id` | Requested subtype |
| `form_template_version_id` | Exact form used |
| `status` | submitted, reviewing, quoted, declined, cancelled, converted, closed |
| `submitted_at`, `closed_at` | Lifecycle timestamps |

### `request_answers`

- Request FK
- Field key and field-version reference
- Typed JSONB value
- Optional media asset reference

Customers may insert during submission but cannot edit submitted answers.

### `quotes`

- Request FK
- Version and status
- Scope summary in both languages when needed
- Total in satang
- Deposit percent and amount
- Free revision count
- Estimated duration and proposed deadline
- Valid from and expiry timestamp
- Terms document version FK
- Sent, accepted, declined, closed timestamps

### `quote_items`

- Quote FK
- Localized label and description
- Quantity
- Unit amount and line total in satang
- Item type: base, commercial, rush, character, background, prop, custom
- Display order

### `terms_acceptances`

- Quote FK
- User FK
- Document version FK
- Accepted timestamp
- Request metadata needed for evidence, minimized according to Privacy Policy

## Jobs, workflows, and queue

### `status_workflows`

- Localized name
- Service-type association or default flag
- Work-start status FK
- Active flag

### `status_definitions`

- Workflow FK
- Stable key
- Localized label
- Public label
- Display order
- Terminal and customer-visible flags

Used statuses cannot be hard-deleted; they may be archived.

### `jobs`

- Request and accepted quote FK
- Member user FK, nullable for guest
- Service type FK
- Current status definition FK
- Current total charge in satang
- Verified paid amount and outstanding amount projections
- Deposit verified timestamp
- Work-start timestamp
- Deadline
- Completed and cancelled timestamps
- Cancellation and refund policy result

### `job_charge_adjustments`

- Job FK
- Localized reason
- Signed amount in satang
- Category such as added character, background, prop, excess revision, discount, correction
- Created by and created timestamp

Adjustments never overwrite the original quote.

### `job_status_history`

- Job FK
- From and to status
- Changed by
- Public note and private note
- Changed timestamp

Append-only.

### `queue_entries`

- Job FK, unique while active
- Public display name snapshot
- Public service label snapshot
- Public status label
- Deadline
- Default order timestamp from deposit verification
- Optional manual sort rank and override reason
- Visibility

Public access is through a restricted view with `security_invoker` behavior or an equivalent safe query.

### `revision_requests`

- Job FK
- Requesting member FK
- Description
- Status: requested, accepted, rejected, completed
- Counted revision number
- Accepted by and accepted timestamp
- Related message/media references

Only accepted revision rows consume the allowance.

## Payment and refunds

### `payments`

- Job FK
- Type: deposit, partial, balance, additional
- Amount in satang
- Status: awaiting-slip, under-review, verified, rejected, void
- Requested, submitted, reviewed timestamps
- Reviewed by and rejection reason
- External/manual flag for guest records

### `payment_slips`

- Payment FK
- Media asset FK
- Uploaded by
- Upload timestamp
- Verification metadata

Slip assets use permanent retention unless the administrator explicitly applies a lawful deletion policy later.

### `refunds`

- Job and optional payment FK
- Amount in satang
- Reason
- Method
- Decision type: full, partial, none
- Processed by and processed timestamp

Database functions or transactions must prevent verified payments minus refunds from exceeding valid job totals without an explicit administrator override and audit record.

## Messaging and notifications

### `conversations`

- One active conversation per registered job
- Job and member owner FK
- Last message timestamp

### `messages`

- Conversation FK
- Sender user and sender role
- Text body
- Created, edited, and deleted timestamps
- System-message flag

### `message_assets`

- Message and media asset FK
- Only image kinds allowed

### `conversation_reads`

- Conversation and user FK
- Last read message/timestamp

### `notifications`

- Recipient user FK
- Type, title, body, target URL
- Related entity type and ID
- Created, read, and archived timestamps

## Delivery

### `deliveries`

- Job FK
- Type: R2 file or Google Drive URL
- Media asset FK or encrypted/private URL field
- Delivered timestamp
- Expires timestamp fixed initially at delivered plus 30 days
- Hidden and deleted timestamps
- Administrator override and note

Only fully paid jobs may expose delivery to a member unless an audited administrator override exists.

## Documents

### `document_categories`

- Localized name and slug
- Display order and active status

### `documents`

- Stable slug and category FK
- Pinned flag and pin order
- Publication status
- Cover asset
- Current published version FK

### `document_versions`

- Document FK and version number
- Thai and English title, summary, and sanitized rich content
- Table-of-contents metadata
- Created by, created timestamp, published timestamp
- Immutable after publication

### `document_tags` and `document_tag_links`

Localized tags and many-to-many links for filtering and search.

### `document_links`

- Source entity type and ID, initially service type or pricing option
- Document FK
- Localized button label
- Display order

Opening a link always resolves the latest published document version. Quote acceptance separately stores a fixed Terms version.

## Operations

### `email_outbox`

- Template/event type
- Recipient
- Sanitized payload
- Status, attempts, next retry, last error
- Created and sent timestamps

### `cleanup_tasks`

- Asset or delivery target
- Due timestamp
- Status and attempts
- Last error

### `audit_logs`

- Actor ID and role
- Action
- Entity type and ID
- Before and after JSONB with sensitive fields redacted
- Reason
- Timestamp

## Required indexes

- Published catalog by category and display order
- Public queue by visibility, manual rank, and deposit timestamp
- Requests by user/status/submitted time
- Quotes by request/status/expiry
- Jobs by user/current status/deadline
- Payments by job/status/submitted time
- Messages by conversation/created time
- Notifications by recipient/read/created time
- Documents by publication/category/pin order
- Full-text or trigram search indexes for localized service, portfolio, queue-safe, and document fields
- Expiring assets and deliveries by `expires_at` where not deleted

## RLS summary

| Data | Anonymous | Member | Administrator |
|---|---|---|---|
| Published public content | Read | Read | Manage |
| Public queue projection | Read | Read | Manage |
| Profile | None | Own row | Manage |
| Member request/quote/job | None | Own rows | Manage |
| Guest private records | None | None | Manage |
| Payments and slips | None | Own rows and upload allowed state | Manage/verify |
| Messages | None | Own job conversation | Manage |
| Delivery | None | Own eligible job | Manage |
| Audit log | None | None | Read/append through server |

## Retention matrix

| Record or asset | Retention |
|---|---|
| Job, request, quote, charge, status, revision history | Permanent |
| Payment and slip | Permanent |
| Text messages | Permanent |
| Customer reference and message images | Delete 30 days after job completion |
| R2 delivery files | Delete 30 days after delivery |
| Google Drive delivery URL | Hide after 30 days; remind admin to delete source |
| Public portfolio and original artist media | Until administrator deletes with usage confirmation |
| Account profile | Until administrator-assisted deletion or anonymization request |
