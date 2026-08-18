# ACCEPTANCE CRITERIA — Nasora Phase 1

## Definition of done

Phase 1 is accepted only when every mandatory criterion below passes in the production-like preview environment, required automated tests pass, no critical security finding remains, and the owner approves the final visual review.

## Global navigation and presentation

- [ ] Floating Navbar stays accessible while scrolling and enters compact state without layout jump
- [ ] Navbar includes contextual search, availability, language, and theme controls but no login control
- [ ] Sidebar is hidden by default and opens/closes by trigger, close button, Escape, and backdrop
- [ ] Sidebar correctly indicates the current page
- [ ] No page renders a footer
- [ ] Signed-out Floating Button opens login, registration, and Google login
- [ ] Signed-in Floating Button shows avatar/unread count and member shortcuts
- [ ] Administrator Floating Button includes a dashboard shortcut
- [ ] Store, Review, and Share do not produce incomplete or broken Phase 1 interactions

## Theme and motion

- [ ] Automatic local-time theme selection works when no override exists
- [ ] Manual theme override persists across sessions
- [ ] Night theme displays ambient stars and intermittent starfall
- [ ] Desktop Night theme supports cursor trail and local particle repulsion
- [ ] Autumn theme uses intermittent leaves rather than recolored starfall
- [ ] Mobile disables pointer physics
- [ ] Hidden browser tabs pause ambient animation
- [ ] Reduced Motion disables nonessential trail, repulsion, and event bursts
- [ ] Particle effects do not prevent page interaction or text readability

## Home

- [ ] Hero introduces Nasora in Thai and English
- [ ] Opening or refreshing Home selects one enabled Hero image and keeps it stable for that visit
- [ ] Hero selection does not trigger a layout shift after the initial page is visible
- [ ] Featured work is controlled independently from Portfolio and Commission layouts
- [ ] Featured carousel advances automatically and provides previous, next, and position controls
- [ ] Featured autoplay pauses on hover, keyboard interaction, hidden tab, and reduced-motion preference
- [ ] Quick Info Panel appears only on Home
- [ ] Quick Info tabs display About, Queue, Terms, and Contact
- [ ] Discord is initially displayed and admin can add, hide, edit, and reorder channels

## Portfolio

- [ ] Admin can create, edit, categorize, order, feature, publish, and archive portfolio items
- [ ] Portfolio supports optimized images and short MP4 video with poster
- [ ] Contextual search searches only Portfolio content
- [ ] Clicking an image opens one image in a lightbox
- [ ] Lightbox has no previous/next navigation
- [ ] Lightbox closes through close control, Escape, and backdrop
- [ ] Portfolio layout changes do not change Home or Commission layout baselines

## Commission catalog

- [ ] Initial categories include Chibi, Illustration, VTuber, Skin Minecraft, and Model 3D Minecraft
- [ ] Admin can add future categories and subtypes without code changes
- [ ] Category overview tile displays its cover, bottom gradient, title, subtype count, optional recommendation, and availability state
- [ ] Category overview tile does not display service-level pricing or a request action
- [ ] Selecting a category album renders its subtype cards in the existing Commission page without a document navigation or URL change
- [ ] Visitor can return from an opened album to the category overview without leaving the Commission page
- [ ] Every Thai subtype card labels its actions exactly `ประเมินราคา` and `ดูรายละเอียดและเรทราคา`
- [ ] Every English subtype card labels its actions exactly `Request Estimate` and `View Details & Rates`
- [ ] Subtype action labels never append or repeat the service name
- [ ] Global, category, and subtype availability controls work independently and compose correctly
- [ ] Closed subtype disables its request action and rejects stale submissions
- [ ] Each subtype owns its descriptions, media, pricing guidance, modifiers, documents, status workflow, and form
- [ ] Reference pricing shows THB and calculated display-only USD
- [ ] Admin can update the THB-to-USD reference rate
- [ ] Pricing guidance supports Personal, Commercial, fixed additions, percentage additions, and rush work
- [ ] Public prices never automatically set the actual quote
- [ ] Linked document opens the latest published version for optional reading
- [ ] Reading a linked pricing document is not required to submit
- [ ] Editing public pricing affects future guidance but does not mutate sent quotes

## Search

- [ ] Search remains in a consistent Navbar position
- [ ] Commission search returns only category/subtype results
- [ ] Portfolio search returns only portfolio results
- [ ] Document search returns only document results
- [ ] Queue search uses only public queue fields
- [ ] Empty and no-result states are localized and useful

## Public queue

- [ ] Queue shows display name, status, service type, and deadline
- [ ] Registered jobs use nickname
- [ ] Guest jobs use administrator-entered alias
- [ ] Default order follows verified deposit time
- [ ] Admin can override order and must provide an audit reason
- [ ] Public queue reveals no private job identifier, quote, payment, message, contact, or delivery detail
- [ ] Guest can see the same public row as any visitor but cannot open private details

## Documents and public content

- [ ] Admin can create Thai/English document versions, categories, tags, covers, and pinned state
- [ ] Published document has a direct URL and opens correctly as a route-aware modal
- [ ] Document content is sanitized before render
- [ ] Search can find localized titles and body content
- [ ] Published versions are immutable
- [ ] Quote acceptance references an exact Terms version
- [ ] Privacy Policy describes collected data, processors, retention, and deletion-request contact

## Authentication and profile

- [ ] Email/password registration, verification, login, logout, and password reset pass
- [ ] Google login passes
- [ ] Resend SMTP with a verified domain sends Auth mail to a non-project-team test address
- [ ] Nickname is required and unique without case-only duplicates
- [ ] Member can change nickname while uniqueness validation remains enforced
- [ ] Member can add, edit, delete, reorder, and select a default contact channel
- [ ] Email/password member can securely change password
- [ ] Google-authenticated member can initiate the verified email flow to set or recover a password
- [ ] Member cannot edit administrator authorization data
- [ ] Administrator-assisted account deletion/anonymization flow is documented and tested
- [ ] Authenticated responses are private and never cached for another user

## Form builder and requests

- [ ] Admin can create subtype forms with all approved field types
- [ ] Published form edits create a new version
- [ ] Old request answers remain readable after a new form version is published
- [ ] Selected service subtype is inherited from the originating service
- [ ] Member can submit an open subtype request
- [ ] Guest can submit an open subtype request with external contact information
- [ ] Signed-in form shows a Member module populated with nickname and saved contact channels and does not ask for Guest identity
- [ ] Member can select a saved contact channel and override it for one request without mutating the Profile record
- [ ] Signed-out form shows Guest identity and contact fields and does not expose a Member module
- [ ] Closed subtype rejects a form that was opened before closure
- [ ] Submitted answers cannot be edited by the customer
- [ ] Failed uploads preserve field input and can retry
- [ ] Admin receives email and dashboard record for a new request

## Quotes and Terms

- [ ] Admin manually creates an actual quote independent of catalog guidance
- [ ] Quote contains itemized price, scope, timing, deposit rate, revision count, expiry, and Terms version
- [ ] Default deposit is 50% and can be changed per quote
- [ ] Default free revisions are 4 and can be changed per quote
- [ ] Expiry can be set from 3–7 days and admin can close early
- [ ] Expired or closed quote cannot be accepted
- [ ] Member can accept or decline an active quote
- [ ] Acceptance records user, timestamp, and Terms version
- [ ] Added characters, backgrounds, props, excess revisions, and other scope changes can adjust the job total with item and reason history

## Payment

- [ ] Deposit QR encodes the exact amount due
- [ ] PromptPay ID is not exposed outside the intended QR/payment display
- [ ] Member can upload a deposit slip
- [ ] Admin can approve or reject with a required reason
- [ ] Rejected slip can be replaced and resubmitted
- [ ] Queue entry is created only after verified deposit
- [ ] Partial payment remains unavailable before deposit verification
- [ ] Member chooses a partial amount after deposit
- [ ] Configurable minimum defaults to THB 100
- [ ] When outstanding balance is below minimum, only remaining balance is accepted
- [ ] Every payment has a separate immutable review history
- [ ] Verified payment, adjustment, and refund recalculate outstanding balance correctly
- [ ] Money calculations use integer satang and pass rounding tests

## Jobs, statuses, and revisions

- [ ] Admin can configure a default status workflow and service-specific workflows
- [ ] Used status definitions can be archived but not destructively removed from history
- [ ] Every status transition is appended to history
- [ ] Public and private labels remain appropriately separated
- [ ] Work-start state initially maps to `กำลังร่าง`
- [ ] Deposit becomes non-refundable at or after work-start state
- [ ] Before work start, admin can record full, partial, or no refund
- [ ] Revision count increases only when admin accepts a request
- [ ] Member sees allowed, used, and remaining revisions
- [ ] Excess revision can create an itemized charge adjustment
- [ ] Job history remains available permanently

## Messaging and notifications

- [ ] Registered job has one private conversation
- [ ] Member and admin can send text and images
- [ ] Non-image message attachments are rejected
- [ ] Member cannot access another member's conversation
- [ ] Guest has no internal conversation
- [ ] Persisted message appears after Realtime reconnect
- [ ] Floating Button unread count matches persisted read state
- [ ] Member receives in-site quote, payment, status, message, and delivery notifications
- [ ] Customer email notifications remain disabled in Phase 1 except Auth mail

## Delivery and retention

- [ ] Admin can deliver through R2 file or Google Drive URL
- [ ] Delivery remains locked until required balance is paid unless audited override exists
- [ ] Member sees delivered and expiry dates
- [ ] Private R2 downloads use short-lived authorization
- [ ] Delivery becomes unavailable after 30 days
- [ ] Expired R2 delivery object is deleted automatically
- [ ] Expired Google Drive URL is hidden and admin receives deletion reminder
- [ ] Customer reference and message images are deleted 30 days after job completion
- [ ] Payment slips and business history are excluded from automatic cleanup
- [ ] Cleanup job is idempotent and a second run does not corrupt history
- [ ] Failed cleanup creates an admin-visible error and email retry

## Guest administration

- [ ] Guest request has no authenticated owner
- [ ] Admin can record guest quote, payments, job, status, deadline, and alias
- [ ] Admin can add guest job to public queue
- [ ] Guest private data is never returned from public queue endpoints
- [ ] Guest history remains permanently visible to admin

## Media optimization

- [ ] Admin upload retains original PNG/JPG privately
- [ ] Browser creates thumbnail, card, and detail WebP variants before R2 upload
- [ ] Public grids serve an appropriate WebP variant rather than original
- [ ] `srcset` and `sizes` choose an appropriate resolution
- [ ] Image dimensions reserve space before load
- [ ] Below-fold images are lazy loaded
- [ ] Hero LCP image is selectively preloaded
- [ ] MP4 uses poster and `preload="none"`
- [ ] Removing a placement does not delete the shared asset
- [ ] Deleting an asset lists all placements and requires confirmation

## Layout isolation

- [ ] Home uses its own featured layout implementation
- [ ] Portfolio uses its own gallery layout implementation
- [ ] Commission uses its own album layout implementation
- [ ] No composite gallery/page layout is imported by more than one of these pages
- [ ] Shared primitives do not impose parent grid, section spacing, or page-level responsive behavior
- [ ] Visual regression tests prove that changing one page layout leaves the other two unchanged

## Security

- [ ] RLS is enabled on all exposed tables
- [ ] Negative tests prove members cannot read or mutate another member's rows
- [ ] `service_role`, SMTP secret, and R2 secret are absent from client bundles
- [ ] Admin checks use server-controlled authorization metadata
- [ ] File keys are server-generated and traversal-safe
- [ ] Upload authorization restricts operation, object key, type, and expiry
- [ ] Public views expose only approved fields
- [ ] Audit logs redact secrets and cannot be edited by normal users
- [ ] Dependency versions are pinned and lockfile is committed
- [ ] Supabase advisors report no unresolved critical security issue

## Accessibility

- [ ] Automated accessibility scan has no critical violation
- [ ] Keyboard-only user can operate navigation, tabs, Floating Button, forms, modal, lightbox, and table actions
- [ ] Focus is trapped/restored correctly for overlays
- [ ] Visible focus meets contrast requirements
- [ ] Text and interactive controls meet WCAG 2.2 AA contrast
- [ ] Meaningful media has localized alternative text
- [ ] Status and validation do not rely on color alone
- [ ] Thai and English page language metadata is correct
- [ ] Content remains usable at 200% browser zoom

## Performance

Measured separately for representative desktop and mobile traffic at the 75th percentile:

- [ ] LCP ≤ 2.5 seconds
- [ ] INP ≤ 200 milliseconds
- [ ] CLS ≤ 0.1
- [ ] Public route does not ship admin feature code
- [ ] Worker dynamic routes remain under Free CPU limit in production-like profiling or have an approved fallback
- [ ] Particle effect maintains a smooth experience on the agreed test devices and degrades adaptively
- [ ] Cloudflare Web Analytics receives production Core Web Vitals

## Operations and launch

- [ ] Development, preview, and production configurations are separate
- [ ] Production schema matches committed migrations
- [ ] Database export and restore drill succeeds
- [ ] R2 private access test fails anonymously and succeeds with authorized access
- [ ] Scheduled cleanup is rehearsed in report-only mode before deletion is enabled
- [ ] Production smoke test passes on temporary Cloudflare URL
- [ ] Initial services remain closed until owner explicitly opens them
- [ ] Error, CPU, email, storage, and database dashboards are documented
- [ ] Domain purchase is optional and does not block temporary-URL launch

## Phase 2 exclusions

The Phase 1 release is not blocked by absence of Store, Review, PDF expense summary, 2FA, Share, spam protection, customer email notifications, formal invoice, payment gateway, or interactive 3D viewer.
