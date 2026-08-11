# Live UI, Admin Workflows, and Performance Design

## Goal

Replace the remaining Home and Admin mock data with live Supabase/R2-backed workflows, make every visible control behave intentionally, provide one normal customer test account for end-to-end validation, repair image delivery, and optimize loading without changing the approved visual direction.

The work remains on `feature/nasora-public`. It is committed in checkpoints and is not merged, pushed, or deployed without a separate user instruction.

## Approved Product Rules

- Any visual, layout, modal, copy, or interaction change must be approved by the user before implementation.
- Existing Home, Admin Dashboard, and Admin Messages visual layouts remain the baseline.
- Home Hero uses Portfolio items explicitly marked for Hero display.
- Home featured work uses Portfolio items explicitly marked as featured and ordered by Admin.
- If no live content exists, the UI shows a themed empty state; it never falls back to fixture or mock content.
- Admin add actions open modals over their list pages.
- Complex forms use full-screen modals. Simple forms use centered modals.
- Opening a modal may update the URL and browser history, while direct navigation to that URL still renders a full editor page.
- A dirty modal asks for confirmation before closing. A clean modal can close with Escape or the backdrop.
- Successful saves close the modal and refresh the underlying live list.
- Uploaded images preview immediately, show upload progress, and cannot be saved until the upload succeeds.
- Failed images do not show a retry button. They show a safe error state and can be replaced through the editor.
- PNG and JPEG sources are normalized to WebP for display. Existing WebP files remain supported.
- The normal site keeps its approved particle effects. When the operating system requests reduced motion, particles and shooting stars stop.

## Scope Decomposition

Implementation follows vertical slices. Each slice owns its database contract, repository, API, UI wiring, tests, verification, and commit.

1. Live Site Settings and Home
2. Live Admin Dashboard and commission availability
3. Live Admin Messages, notifications, sidebar, and account controls
4. Modal CRUD for Admin add actions
5. Normal customer test account and full workflow validation
6. Image delivery repair and performance optimization

## Architecture

### Site Settings

A singleton public settings record is the authority for:

- commission availability;
- localized Home heading and description;
- business hours;
- Discord/contact value;
- queue capacity;
- particle and shooting-star availability.

Admin can update the record through an authenticated, sole-admin mutation boundary. Public readers receive only customer-safe fields. Navbar, Home, Commission pages, and estimate forms use this shared source instead of separate constants.

Closing commissions prevents new member and Guest estimate submissions at both the UI and database/API boundary. Existing requests, payments, jobs, messages, and deliveries continue normally.

### Live Home

Portfolio remains the single media/content source for Hero and featured artwork. Portfolio items gain Admin-managed presentation fields:

- `show_in_hero`;
- `featured`;
- `display_order`.

Only published, non-archived items with valid media are eligible. Hero selection is randomized from eligible rows. Featured work is ordered and uses the existing continuous carousel. Archiving or unpublishing a Portfolio item removes it from Home automatically.

The Portfolio editor adds approved controls for Hero visibility, featured visibility, and display order. No second Home image library is created.

### Live Admin Dashboard

The Dashboard receives a server-composed view model from focused repositories rather than importing fixture arrays. It includes:

- counts for estimates awaiting review, slips awaiting verification, active jobs, and unread messages;
- recent estimate requests with direct management links;
- pending payment slips using the existing verification mutation;
- active queue rows with real status, deadline, and progress;
- today's queue;
- computed workload against queue capacity;
- the current commission availability state;
- the Admin personal note.

Dashboard actions use the same domain APIs as their full management pages. The Dashboard does not implement duplicate mutation logic.

Commission availability keeps the existing toggle visual. It shows a saving state, rolls back on failure, and exposes an understandable error. The public Navbar and Commission UI update from the same setting.

The personal note opens a centered modal and persists separately from public settings.

### Messages and Notifications

Admin Messages continues to use member-owned job conversations. The approved completion includes:

- live conversation rows;
- live unread counts;
- sending text and supported images;
- a centered progress-update modal;
- progress-image expansion;
- sending, success, failure, and retry states for message mutations;
- an intentional empty state.

The hardcoded sidebar value `5` is removed. Sidebar and notification badges use live counts.

The Admin notification bell opens a dropdown containing actionable items for:

- new estimate requests;
- slips awaiting verification;
- unread customer messages;
- jobs approaching their deadline.

Each item navigates to its authoritative management view. The dropdown supports marking all currently presented notification items as read and displays an empty state when no items remain.

### Sidebar and Admin Account Controls

The Sidebar is fully interactive:

- all menu links navigate and report active state from the current route;
- the collapse control reduces the Sidebar to icons rather than hiding it;
- labels appear as tooltips while collapsed;
- badges remain visible;
- the top hamburger toggles the same state;
- collapsed state is remembered in browser storage.

The Admin profile trigger opens a dropdown with links to the public site and Settings plus a sign-out action. It shows the authenticated Admin email and profile image when available, otherwise a safe `N` fallback. Fixture avatar assets are removed from the Admin shell.

### Modal CRUD

Next.js intercepted routes provide modal presentation while preserving direct routes as full pages. The underlying form components and mutation APIs are shared between both presentations.

Full-screen modals:

- add Commission album;
- add Portfolio item;
- create Document.

Centered modals:

- add or edit Commission sub-service;
- add Guest job;
- add progress update;
- edit Admin personal note.

Search, filters, scroll position, and list state remain available behind the modal. Successful mutation revalidates the relevant Admin and public routes.

### Normal Customer Test Account

One normal Supabase Auth member is created with email `customer.test@nasora.local`. It has ordinary member metadata and the same RLS constraints as a real customer.

A development/test-only reset command creates or resets deterministic test rows required to exercise:

1. sign in;
2. submit estimate;
3. Admin review and quote;
4. deposit payment and slip verification;
5. job and public queue creation;
6. member/Admin messaging and progress updates;
7. installment/final payment;
8. delivery and download.

The reset path is unavailable in production builds, requires server-side secrets, never appears in public UI, and never bypasses RLS. Credentials are supplied through ignored environment variables and are not committed.

## Data and Security Boundaries

- Public tables exposed through the Supabase Data API use RLS.
- Customer rows are restricted by `auth.uid()` ownership.
- Sole-Admin authorization uses `app_metadata.role` plus the approved Admin email, never user-editable metadata.
- Privileged functions live behind private or guarded boundaries, revoke default `PUBLIC` execution, set a safe search path, and repeat authorization checks.
- Public settings projections omit Admin note and operational/private fields.
- All Admin and member mutation routes enforce same-origin JSON or bounded multipart input.
- Image routes never expose R2 credentials or object mutation URLs.
- Test reset capabilities are excluded from production and are not callable by a browser client.

## Image Pipeline

The image defect is investigated end to end rather than patched at the component layer:

1. validate browser upload input;
2. validate server MIME, file signature, dimensions, and byte limit;
3. normalize display assets to WebP;
4. write the R2 object and confirm its metadata;
5. persist the media row only after a successful write;
6. resolve the media row under the correct public/Admin visibility rules;
7. issue a valid same-origin media response with correct content type, caching, and authorization;
8. verify normal `<img>`/Next Image behavior in a real browser.

An upload preview initially uses a local object URL. After persistence, it switches to the permanent media endpoint. Orphan cleanup removes R2 objects when database registration fails.

## Performance Design

Optimization follows measurement, not assumption.

- Capture baseline Lighthouse and browser performance measurements for Home, Portfolio, Commission album, and Admin Dashboard.
- Prioritize the Hero image and first visible artwork.
- Lazy-load below-the-fold images.
- Provide accurate responsive image sizes and dimension metadata to prevent layout shift.
- Cache public data and media responses with explicit invalidation after Admin mutations.
- Dynamically load full-screen editors, rich-text tooling, and heavy modal code only when needed.
- Keep server components as the default and limit client components to interactive islands.
- Remove fixture imports and unused mock assets from production paths.
- Honor `prefers-reduced-motion` by stopping particles and shooting stars.
- Compare LCP, CLS, transferred image bytes, and JavaScript before and after the work.

## Error Handling

- Optimistic controls roll back when a mutation fails.
- Mutations expose Thai error messages suitable for the user and log only non-sensitive diagnostic context.
- Empty live data is represented explicitly and never replaced by fabricated rows.
- Image failures prevent parent records from being saved with incomplete media state.
- Modal dirty-state protection prevents accidental loss.
- API validation failures return stable status codes and do not leak database or storage details.

## Verification Strategy

Every vertical slice uses TDD and ends with a checkpoint commit.

- Unit tests cover settings projection, dashboard aggregation, unread counts, modal state, image validation, and performance helpers.
- API tests cover authentication, sole-Admin authorization, input validation, state transitions, and cache revalidation.
- Migration contract and live integration tests cover RLS, grants, guarded functions, test-account isolation, and R2 upload/read/delete.
- Browser tests audit every visible button across public, member, and Admin surfaces. Each button must navigate, open a modal, submit a real mutation, or be disabled with an explicit reason.
- End-to-end validation uses the single normal customer test account for the complete commission lifecycle.
- Each checkpoint runs focused tests followed by the full test suite, typecheck, lint, production build, and diff checks.
- Final performance verification records before/after metrics and confirms no fixture/mock fallback remains in production routes.

## Completion Criteria

- Home, Admin Dashboard, and Admin Messages contain no runtime fixture or hardcoded customer rows.
- Sidebar, Navbar, floating account controls, notification controls, theme, language, search/filter controls, and relevant back actions behave intentionally.
- Commission availability is persistent and enforced at UI and server/database boundaries.
- All approved Admin add actions use modal presentation with direct-route fallback.
- The single customer test account completes the full workflow under normal RLS.
- Newly uploaded images render after persistence on Admin and public pages.
- Public loading metrics improve without changing the approved visual identity.
- The branch contains clean checkpoint commits and remains unmerged, unpushed, and undeployed.
