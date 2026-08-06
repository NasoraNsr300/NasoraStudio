# FEATURE SCOPE — Nasora

## Scope rules

- Phase 1 items are required for the first production release
- Phase 2 items are intentionally excluded from Phase 1 implementation and acceptance
- Any new feature must be assigned to a phase before development
- Public reference prices never calculate or guarantee the final commission price

## Phase 1 public experience

### Global application shell

- Floating Navbar remains visible while scrolling and becomes more compact after scroll begins
- Navbar contains contextual search, service availability indicators, language switcher, and theme control
- Login is not displayed in the Floating Navbar
- Sidebar is hidden by default on desktop and mobile, then slides in on demand
- Sidebar contains Home, Portfolio, Price Commission, Queue, My Requests, Messages, Terms, Store, Review, About Me, theme controls, and login
- Store and Review entries are marked as unavailable or hidden until Phase 2; they must not lead to broken pages
- No footer
- Floating Button at the bottom-right changes by authentication state

### Floating Button

- Signed-out visitor: opens email/password login, registration, and Google login
- Registered member: shows avatar and unread count, then opens notifications, requests, messages, profile, and logout
- Administrator: also exposes a dashboard shortcut
- Keyboard and screen-reader behavior must be equivalent to pointer interaction

### Home

- Hero introduction for Nasora
- Administrator manages an enabled Hero image pool; one image is selected randomly when Home is opened or refreshed and remains stable for that visit
- Hero selection does not rotate on a timer and must not cause a post-render layout shift
- Featured works managed independently from Portfolio layout and Commission layout
- Featured works advance automatically as a carousel with manual previous/next and position controls
- Featured autoplay pauses during hover, keyboard interaction, a hidden browser tab, and reduced-motion preference
- Home-only Quick Info Panel with tabs for About, Queue, Terms, and Contact
- Commission availability and Queue shortcut are visible in the application shell
- Discord is the initial contact channel; channels can be added, hidden, edited, and reordered in admin

### Themes and ambient motion

- Night theme uses the Celestial Amber palette, twinkling stars, intermittent starfall, cursor trail, and pointer repulsion on desktop
- Autumn theme uses warm colors and intermittent falling leaves
- Theme is selected automatically from local time, can be overridden by the user, and remembers the override
- Mobile disables pointer physics and uses a lightweight ambient effect
- `prefers-reduced-motion` substantially reduces or disables nonessential motion

### Portfolio

- Independent Portfolio page and page-specific layout
- Supports images and short MP4 video
- Categories, featured state, visibility, metadata, and ordering are editable in admin
- Clicking an image opens a single-image lightbox
- Lightbox has no previous or next navigation
- Lightbox closes from the close control, Escape key, or backdrop
- A media asset may be reused elsewhere without sharing the Portfolio layout configuration

### Commission Albums

- Hierarchy: service category → service subtype → service detail
- Initial categories cover Chibi, Illustration, VTuber, Skin Minecraft, and Model 3D Minecraft
- New categories and subtypes can be created without code changes
- The category overview uses image-led album tiles: cover image, bottom gradient, title at bottom-left, subtype count at bottom-right, and optional recommended badge
- Selecting an album replaces the catalog content in place on the Commission page; it does not navigate to another HTML page or change the locale Commission URL
- The in-page album view includes a clear control to return to the category overview
- Reference prices and request actions are not placed on the category overview tile; they appear after entering the album or opening service details
- Every subtype card uses the same two localized action labels without appending the service name: `ประเมินราคา` / `Request Estimate` and `ดูรายละเอียดและเรทราคา` / `View Details & Rates`
- Availability can be controlled globally, by category, and by subtype
- Closed subtypes disable request submission; no waitlist is collected
- Each subtype has its own descriptions, media examples, reference pricing, modifiers, timing guidance, linked documents, and editable form
- Detail modal or page shows reference pricing in THB and calculated USD reference values
- USD is display-only; actual payment remains THB
- Admin controls the exchange rate used for display
- Reference pricing supports Personal, Commercial, rush work, fixed additions, and percentage additions
- Linked-document buttons open the latest published Document Center content in a modal for optional reading
- Document reading is not a form submission gate
- Clicking an example opens the single-image lightbox behavior
- Share UI is hidden until Phase 2 behavior is defined

### Contextual search

- The search field remains in the same Floating Navbar position
- Portfolio searches portfolio content
- Commission searches categories and subtypes
- Document Center searches documents and document content
- Queue searches public queue fields
- Search must not combine unrelated page result types

### Public Queue

- Table displays customer display name, job status, service type, and deadline
- Registered jobs use the member nickname
- Guest jobs use the alias entered by the administrator
- Queue order defaults to verified-deposit timestamp
- Administrator can override ordering for exceptional cases such as rush work
- Public rows never link to private quote, payment, message, or delivery details

### Document Center and About

- Documents support Thai and English content in the same logical document
- Supports categories, search, publication status, pinned documents, cover media, table of contents, tags, and version history
- Each document has a shareable URL while it may still render as a modal over the listing
- Terms and About content are editable from admin
- Privacy Policy is included

## Phase 1 identity and customer features

### Authentication

- Email/password registration and login
- Google OAuth login
- Email verification and password reset through custom SMTP
- Profile includes editable unique nickname, locale, optional avatar, and multiple editable contact channels
- Member can add, edit, delete, reorder, and choose a default contact channel
- Email/password members can securely change their password; Google-authenticated members use a verified email recovery or set-password flow
- Phase 1 account deletion is an administrator-assisted request, not self-service

### Request forms

- Registered members and guests can submit while the selected subtype is open
- Selected category and subtype are prefilled and cannot drift from the service being viewed
- Each subtype uses an independently editable form template
- Supported fields: short text, long text, number/budget, date, radio, select, checkbox, multi-select, and file upload
- Form definition can add required state, labels, localized help, ordering, and validation rules
- Authenticated form renders a Member information module populated from the profile nickname and saved contact channels
- Member chooses a saved contact channel and may override its value for that request without changing the saved profile
- Signed-out form renders Guest identity and external-contact fields instead of the Member module
- Submission becomes immutable to the customer; subsequent clarification happens through messages for members or externally for guests

### Quote

- Administrator reviews the submitted request and sets the actual job price manually
- Public pricing is guidance and does not automatically calculate the quote
- Quote contains itemized description, amount, scope, expected timing, deposit rate, free revision count, expiry, and Terms version
- Default deposit is 50% and editable per quote
- Default free revisions are 4 and editable per quote
- Quote expiry is 3–7 days and can be manually closed early
- Registered member may accept or decline
- Acceptance records customer, timestamp, and Terms version
- Administrator may adjust an accepted job total when the customer adds characters, background, props, excess revisions, or other scope; every change requires a recorded item and reason

### Payment

- Phase 1 uses amount-specific PromptPay QR and uploaded slip
- PromptPay ID and payment settings are controlled from admin
- Administrator approves or rejects each slip with a reason
- Queue entry is created after the deposit is verified
- After deposit, customer chooses partial-payment amounts
- Default minimum partial payment is THB 100 and editable globally
- If remaining balance is below the minimum, the customer must pay the remaining balance
- Payment ledger recalculates paid and outstanding balances after every verified payment, adjustment, or refund
- Refund before work starts is an administrator decision: full, partial, or none
- Deposit becomes non-refundable when job status enters the configured work-start state, initially `กำลังร่าง`

### Work tracking and communication

- Registered member sees own requests, quotes, job status, payment ledger, revisions, messages, notifications, and delivery
- Job workflows can have service-specific status definitions
- All status changes are stored permanently
- Messages support text and images only
- Delivery files are handled separately from message attachments
- Revision request is counted when administrator accepts it
- Customer sees total free revisions, used revisions, and remaining revisions
- Excess revisions can add a charge to the existing job
- Guest receives no private portal; administrator records guest history manually

### Delivery and retention

- Administrator can upload delivery files to R2 or provide a Google Drive link
- Delivery unlocks after the required balance is fully paid unless administrator explicitly overrides
- Delivery link is available for 30 days
- R2 delivery files are deleted automatically after 30 days
- Google Drive link is hidden after 30 days and administrator receives an email reminder to delete the Drive file
- Customer reference images and message images are deleted 30 days after job completion
- Slips, payment records, quotes, status history, messages without expired assets, and job history are retained permanently

## Phase 1 administrator features

- Single protected administrator dashboard
- Dashboard summaries for new requests, quote expiry, pending slips, active jobs, deadlines, unread messages, and file expiry
- CRUD and ordering for public content, media placements, services, pricing guidance, modifiers, forms, documents, contact channels, and settings
- Independent Home, Portfolio, and Commission layout configuration
- Quote builder and scope adjustment history
- Slip review and refund recording
- Queue creation for guests and ordering override
- Service-specific status workflow editor
- Job communication, revision review, delivery management, and permanent history
- Audit log for material actions
- Email notifications to administrator for new requests, member messages, slips, upcoming delivery expiry, and failed scheduled actions

## Media optimization

- Original PNG/JPG files are retained privately
- Admin browser creates WebP derivatives before upload to avoid Worker CPU cost
- At minimum create thumbnail, card, and detail sizes
- Public pages serve responsive `srcset` candidates
- Images outside the viewport use lazy loading
- Critical Hero media is preloaded selectively
- MP4 portfolio videos use poster images and `preload="none"`

## Phase 2

- Digital item Store with product pages, purchase record, PromptPay slip verification, and protected download link
- Reviews restricted to completed customers
- Downloadable expense-summary PDF
- Administrator 2FA
- Share actions
- Spam protection and rate limits
- Customer email notifications for quotes, payments, messages, status, and expiry

## Explicitly out of scope

- Automatic payment gateway or automatic slip validation
- Customer-to-customer marketplace behavior
- Public customer job detail pages
- Interactive 3D viewer
- Live video streaming
- LINE notifications
- Tax invoice system
