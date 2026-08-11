# Live UI Workflows and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining Home and Admin mock behavior with live Supabase/R2 workflows, make every approved control functional, add one ordinary resettable customer account, repair uploaded-image delivery, and improve measured loading performance without changing the approved UI.

**Architecture:** Build vertical slices around one guarded settings aggregate, existing catalog/portfolio/document repositories, and existing payment/job/collaboration commands. Server components compose read models; small client islands own optimistic interactions and modal state. Supabase remains authoritative, R2 stores media, and every mutation revalidates the exact public/Admin routes it affects.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript 6, Supabase Auth/Postgres/RLS/RPC, Cloudflare R2, Vitest/Testing Library, Playwright, OpenNext Cloudflare.

## Global Constraints

- Work only in `E:/NasoraStudio/.worktrees/nasora-public` on `feature/nasora-public`.
- Preserve the approved Home, Admin Dashboard, Admin Messages, Sidebar, modal, night, and autumn visual layouts.
- Ask for approval before any new visual, copy, layout, or interaction decision not already defined by the approved design spec.
- Do not merge, push, deploy, or apply production migrations without a separate user instruction.
- Do not restore fixture or mock content when live rows are empty; render the approved themed empty states.
- Every database-exposed table uses RLS; sole-Admin checks use `app_metadata.role === "admin"` and `nasora.nsr300@gmail.com`.
- New estimate submission is blocked when commissions are closed; existing requests, payments, jobs, messages, and deliveries remain usable.
- Accept PNG, JPEG, and WebP uploads; persistent display media is normalized to WebP.
- Stop particles and shooting stars only when `prefers-reduced-motion: reduce` is active.
- Use TDD for every behavior change and commit after each independently verified checkpoint.
- Do not use subagents for this plan; execute inline with `executing-plans`.

## File Structure

- `src/features/site-settings/`: public/Admin settings schemas, repositories, and reusable availability projection.
- `src/features/home/`: live Home view mapping and existing approved Home components.
- `src/features/admin/dashboard/`: dashboard read model, server repository, and focused interactive controls.
- `src/features/admin/messages/`: live messages workspace and progress modal.
- `src/features/admin/notifications/`: live Admin notification projection and read-state mutations.
- `src/features/admin/shell/`: Sidebar/account/search/bell behavior split out of the current shell.
- `src/features/admin/modals/`: shared dirty-state modal shell and intercepted-route presentation.
- `src/features/media/`: shared image inspection, WebP normalization, R2 persistence, and response helpers.
- `scripts/reset-test-customer.mjs`: development/test-only ordinary-customer reset command.
- `tests/e2e/`: ordinary-customer lifecycle and visible-control audits.

---

### Task 1: Live site settings and commission availability

**Files:**
- Create via `npx supabase migration new live_site_settings`: `supabase/migrations/<generated>_live_site_settings.sql`
- Create: `src/features/site-settings/domain/site-settings.ts`
- Create: `src/features/site-settings/data/public-site-settings-repository.server.ts`
- Create: `src/features/site-settings/data/admin-site-settings-repository.server.ts`
- Create: `src/features/site-settings/components/admin-site-settings-form.tsx`
- Create: `src/features/site-settings/api/admin-site-settings-route.ts`
- Create: `src/app/api/admin/site-settings/route.ts`
- Modify: `src/app/(admin)/admin/settings/page.tsx`
- Modify: `src/features/admin/components/admin-shell.tsx`
- Modify: `src/features/commission/data/commission-request-repository.ts`
- Modify: `src/features/commission/components/estimate-request-dialog.tsx`
- Test: `src/features/site-settings/__tests__/site-settings-domain.test.ts`
- Test: `src/features/site-settings/__tests__/site-settings-migration-contract.test.ts`
- Test: `src/app/api/admin/site-settings/__tests__/route.test.ts`
- Test: `tests/components/admin-site-settings-form.test.tsx`
- Test: `src/features/commission/data/__tests__/commission-request-repository.test.ts`
- Test: `tests/components/estimate-request-dialog.test.tsx`

**Interfaces:**
- Produces `SiteSettings`, `PublicSiteSettings`, `getPublicSiteSettings()`, `getAdminSiteSettings()`, and `saveAdminSiteSettings(input)`.
- Produces `POST /api/admin/site-settings` with strict JSON and response `{ settings: AdminSiteSettings }`.
- Settings fields are `commissionsOpen`, `homeHeading`, `homeDescription`, `businessHours`, `discordContact`, `queueCapacity`, `particlesEnabled`, `shootingStarsEnabled`, and private `adminNote`.

- [ ] **Step 1: Write failing domain and migration contract tests**

```ts
expect(projectPublicSiteSettings(row)).toEqual({
  businessHours: "11:00 – 22:00",
  commissionsOpen: false,
  discordContact: "nasora.studio",
  homeDescription: { en: "Stories made visible", th: "ถ่ายทอดเรื่องราวให้มองเห็น" },
  homeHeading: { en: "Draw your world", th: "รับวาดภาพในโลกของคุณ" },
  particlesEnabled: true,
  queueCapacity: 10,
  shootingStarsEnabled: true,
});
expect(projectPublicSiteSettings(row)).not.toHaveProperty("adminNote");
expect(sql).toMatch(/alter table public\.site_settings enable row level security/i);
expect(sql).toMatch(/revoke all on function public\.admin_save_site_settings/i);
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm test -- --run src/features/site-settings/__tests__/site-settings-domain.test.ts src/features/site-settings/__tests__/site-settings-migration-contract.test.ts`

Expected: FAIL because the schema, migration, and projections do not exist.

- [ ] **Step 3: Create the singleton settings migration**

Run: `npx supabase migration new live_site_settings`

Implement a one-row `public.site_settings` table keyed by `id boolean primary key default true check (id)`, JSONB localized fields with exact `th`/`en` keys, bounded queue capacity `1..100`, private Admin note, audit timestamps, public safe projection function, and guarded Admin save RPC. Enable RLS, grant only safe public read access, revoke mutation privileges from `anon`/`authenticated`, and grant the guarded RPC only to `authenticated` after repeating the sole-Admin authorization check inside the function.

- [ ] **Step 4: Implement strict TypeScript schemas and repositories**

```ts
export type PublicSiteSettings = {
  businessHours: string;
  commissionsOpen: boolean;
  discordContact: string;
  homeDescription: LocalizedText;
  homeHeading: LocalizedText;
  particlesEnabled: boolean;
  queueCapacity: number;
  shootingStarsEnabled: boolean;
};
export type AdminSiteSettings = PublicSiteSettings & {
  adminNote: string;
  updatedAt: string;
};
export async function getPublicSiteSettings(): Promise<PublicSiteSettings>;
export async function getAdminSiteSettings(): Promise<AdminSiteSettings>;
export async function saveAdminSiteSettings(input: SaveAdminSiteSettingsInput): Promise<AdminSiteSettings>;
```

- [ ] **Step 5: Write RED route/form tests for authorization, optimistic state, rollback, and validation**

```tsx
render(<AdminSiteSettingsForm initialSettings={settings} fetcher={fetcher} />);
await user.click(screen.getByRole("switch", { name: "เปิดรับงาน" }));
expect(fetcher).toHaveBeenCalledWith("/api/admin/site-settings", expect.objectContaining({ method: "POST" }));
await screen.findByRole("alert");
expect(screen.getByRole("switch", { name: "เปิดรับงาน" })).toHaveAttribute("aria-checked", "true");
```

- [ ] **Step 6: Implement the Admin API, Settings form, and shared commission toggle**

Use one client control for the topbar and Settings form. Send the complete validated settings object, show `กำลังบันทึก`, rollback on failure, and call `router.refresh()` on success. The route uses same-origin strict JSON, sole-Admin authentication, stable `400/401/403/500` responses, and revalidates `/admin`, `/admin/settings`, `/th`, `/en`, both commission roots, and the Navbar layouts.

- [ ] **Step 7: Enforce closed commissions in the shared Guest/member submission command**

Make `submit_commission_request` lock/read the singleton setting immediately before persistence and raise the stable `commissions_closed` database error when closed. Map that result in `commission-request-repository.ts` to `ขณะนี้ปิดรับแบบประเมินใหม่`, disable the dialog submit action from the public setting projection, and keep the RPC guard authoritative for both Guest and member modes.

- [ ] **Step 8: Run checkpoint verification**

Run:

```powershell
npm test -- --run src/features/site-settings src/app/api/admin/site-settings src/features/commission tests/components/admin-site-settings-form.test.tsx tests/components/estimate-request-dialog.test.tsx
npm test -- --run --maxWorkers=4
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 9: Commit checkpoint**

```powershell
git add -- supabase/migrations src/features/site-settings src/app/api/admin/site-settings src/features/commission 'src/app/(admin)/admin/settings/page.tsx' src/features/admin/components/admin-shell.tsx tests
git commit -m "feat(settings): persist commission availability"
```

---

### Task 2: Live Home content from Portfolio

**Files:**
- Create via `npx supabase migration new portfolio_home_presentation`: `supabase/migrations/<generated>_portfolio_home_presentation.sql`
- Create: `src/features/home/data/live-home-repository.server.ts`
- Create: `src/features/home/domain/home-content.ts`
- Modify: `src/features/portfolio/domain/portfolio.ts`
- Modify: `src/features/portfolio/data/public-portfolio-repository.server.ts`
- Modify: `src/features/admin/portfolio/data/admin-portfolio-repository.server.ts`
- Modify: `src/features/admin/portfolio/components/admin-portfolio-editor.tsx`
- Modify: `src/features/admin/portfolio/api/portfolio-route.ts`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/features/home/components/home-page.tsx`
- Modify: `src/features/home/components/home-hero.tsx`
- Modify: `src/features/home/components/featured-carousel.tsx`
- Modify: `src/features/home/components/home.module.css`
- Delete production imports from: `src/data/fixture-public-content-repository.ts`
- Test: `src/features/home/__tests__/live-home-repository.test.ts`
- Test: `src/features/admin/portfolio/__tests__/portfolio-home-presentation-contract.test.ts`
- Test: `tests/components/home-page.test.tsx`
- Test: `tests/unit/home-route.test.ts`

**Interfaces:**
- Extends Portfolio rows with `show_in_hero boolean not null default false`, `featured boolean not null default false`, and existing `display_order` as the Home featured order.
- Produces `getLiveHomeContent(locale): Promise<{ hero: HeroItem[]; featured: FeaturedItem[]; settings: PublicSiteSettings }>`.

- [ ] **Step 1: Write RED mapping/repository tests**

```ts
expect(await repository.getLiveHomeContent("th")).toEqual({
  hero: [expect.objectContaining({ id: heroId, enabled: true })],
  featured: [expect.objectContaining({ id: featuredId, displayOrder: 2 })],
  settings,
});
expect(query).toExcludeArchivedAndUnpublishedRows();
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- --run src/features/home/__tests__/live-home-repository.test.ts tests/unit/home-route.test.ts`

Expected: FAIL because Home still imports the fixture repository and Portfolio has no Hero flag.

- [ ] **Step 3: Add the Portfolio Home-presentation field and guarded save support**

Run: `npx supabase migration new portfolio_home_presentation`

Add `show_in_hero`, update the guarded save RPC signature and audit snapshot, preserve existing rows with `false`, and add a partial public ordering index for published/non-archived Hero/featured rows.

- [ ] **Step 4: Extend Portfolio domain and editor controls**

```ts
export type SaveAdminPortfolioItemInput = {
  albumId: string;
  displayOrder: number;
  featured: boolean;
  id: string | null;
  mediaId: string;
  published: boolean;
  showInHero: boolean;
  title: LocalizedPortfolioText;
};
```

Add approved checkboxes `แสดงใน Hero` and `แสดงในผลงานเด่น` plus the existing numeric display order. Persist all three values through the existing item API.

- [ ] **Step 5: Replace fixture Home reads with the live repository**

`src/app/[locale]/page.tsx` must import only `getLiveHomeContent`. Map published Portfolio media to the existing `HeroItem`/`FeaturedItem` component contracts, randomize only among eligible Hero rows, order featured rows by `display_order`, and return empty arrays when no rows exist.

- [ ] **Step 6: Implement the approved themed empty states**

Keep the current Home layout and styling. When Hero is empty, render the localized heading/description and a themed media placeholder without fixture art. When featured is empty, render one compact `ยังไม่มีผลงานแนะนำ` panel in the existing carousel footprint.

- [ ] **Step 7: Revalidate Home after Portfolio and settings mutations**

Add `revalidatePath("/th")` and `revalidatePath("/en")` to successful Portfolio writes and archives. Verify unpublished/archived items disappear from Home on refresh.

- [ ] **Step 8: Verify and commit**

Run the Home/Portfolio focused tests, full tests, typecheck, lint, build, and `git diff --check`; then commit:

```powershell
git commit -m "feat(home): render live portfolio content"
```

---

### Task 3: Live Admin Dashboard, availability, and personal note

**Files:**
- Create: `src/features/admin/dashboard/domain/admin-dashboard.ts`
- Create: `src/features/admin/dashboard/data/admin-dashboard-repository.server.ts`
- Create: `src/features/admin/dashboard/components/admin-dashboard-view.tsx`
- Create: `src/features/admin/dashboard/components/admin-personal-note-modal.tsx`
- Create: `src/features/admin/dashboard/components/admin-dashboard-actions.tsx`
- Create: `src/app/api/admin/personal-note/route.ts`
- Create: `src/features/site-settings/api/admin-personal-note-route.ts`
- Modify: `src/app/(admin)/admin/page.tsx`
- Replace runtime mock arrays in: `src/features/admin/components/admin-dashboard.tsx`
- Modify: `src/features/admin/components/admin-dashboard.module.css`
- Reuse: payment verification, job status, Guest job, and estimate links already implemented in their authoritative modules.
- Test: `src/features/admin/dashboard/__tests__/admin-dashboard-repository.test.ts`
- Test: `tests/components/admin-dashboard.test.tsx`
- Test: `src/app/api/admin/personal-note/__tests__/route.test.ts`

**Interfaces:**
- Produces `AdminDashboardViewModel` containing `counts`, `recentEstimates`, `pendingSlips`, `activeJobs`, `todayJobs`, `workload`, `settings`, and `personalNote`.
- Dashboard mutation controls call existing APIs instead of duplicating database commands.

- [ ] **Step 1: Replace fixture expectations with RED live view-model tests**

```ts
expect(await getAdminDashboard()).toMatchObject({
  counts: { activeJobs: 2, pendingSlips: 1, submittedEstimates: 1, unreadMessages: 3 },
  workload: { active: 2, capacity: 10, percent: 20 },
});
expect(screen.queryByText("Kirana")).not.toBeInTheDocument();
```

- [ ] **Step 2: Implement the server aggregation repository**

Use focused reads from existing estimate, payment, job, conversation, and settings tables/RPC projections. Bound lists to Dashboard needs (`4` estimates, `2` slips, active queue rows, today's rows), calculate workload from `queueCapacity`, and return empty arrays rather than fabricated customers.

- [ ] **Step 3: Wire the route and preserve the approved visual layout**

Make `src/app/(admin)/admin/page.tsx` load the view model and pass it into a presentational Dashboard. Replace all `href="#"` with authoritative links. Queue status and slip controls call existing mutation endpoints, display saving/error state per row, and refresh after success.

- [ ] **Step 4: Add the centered personal-note modal and API**

The pencil opens the approved centered modal. Save only `adminNote` through a focused API which preserves all public settings values, limits the note to `2,000` characters, and refreshes the Dashboard. Backdrop/Escape closes a clean modal; changed text asks for confirmation.

- [ ] **Step 5: Verify real commission toggles in Dashboard and right rail**

Both topbar and Dashboard rail use the Task 1 control and state. Assert optimistic save, rollback, Thai error, and public status revalidation.

- [ ] **Step 6: Verify and commit**

Run Dashboard/API focused tests, the complete suite, typecheck, lint, build, and diff check; commit:

```powershell
git commit -m "feat(admin): power dashboard with live data"
```

---

### Task 4: Live Messages, notifications, Sidebar, and Admin account controls

**Files:**
- Create via `npx supabase migration new admin_message_reads`: `supabase/migrations/<generated>_admin_message_reads.sql`
- Create: `src/features/admin/notifications/domain/admin-notification.ts`
- Create: `src/features/admin/notifications/data/admin-notification-repository.server.ts`
- Create: `src/features/admin/notifications/components/admin-notification-menu.tsx`
- Create: `src/app/api/admin/notifications/read/route.ts`
- Create: `src/features/admin/shell/components/admin-sidebar.tsx`
- Create: `src/features/admin/shell/components/admin-account-menu.tsx`
- Create: `src/features/admin/shell/components/admin-global-search.tsx`
- Modify: `src/features/admin/components/admin-shell.tsx`
- Modify: `src/app/(admin)/layout.tsx`
- Modify: `src/features/collaboration/data/collaboration-repository.server.ts`
- Modify: `src/features/admin/messages/components/admin-messages-workspace.tsx`
- Modify: `src/features/admin/messages/components/admin-messages-workspace.module.css`
- Modify: `src/app/(admin)/admin/messages/page.tsx`
- Test: `src/features/admin/notifications/__tests__/admin-notification-repository.test.ts`
- Test: `tests/components/admin-shell.test.tsx`
- Test: `tests/components/admin-messages-workspace.test.tsx`
- Test: `src/app/api/admin/notifications/read/__tests__/route.test.ts`

**Interfaces:**
- Extends `ConversationView` with `unreadCount` and `lastMessageAt`.
- Produces `AdminNotificationItem = { id; href; kind; occurredAt; title; detail; read }`.
- Produces `AdminShellData = { adminEmail; adminImageUrl; commissionsOpen; notifications; unreadMessages }`.

- [ ] **Step 1: Write RED unread/notification/security tests**

```ts
expect(conversations[0]).toMatchObject({ unreadCount: 2 });
expect(notifications.map((item) => item.kind)).toEqual(expect.arrayContaining(["estimate", "slip", "message", "deadline"]));
expect(screen.queryByText("5")).not.toBeInTheDocument();
```

- [ ] **Step 2: Add Admin read-state storage and guarded commands**

Run `npx supabase migration new admin_message_reads`. Store per-Admin last-read timestamps for conversations and notification sources, protect rows by the sole-Admin predicate, and expose guarded read/update functions with safe search paths and revoked default execution.

- [ ] **Step 3: Extend the conversation projection and Messages workspace**

Load live messages, unread counts, and last-message ordering. Keep approved layout. Text/image send controls show `กำลังส่ง`, success reset, failure with inline `ลองอีกครั้ง`, and do not fabricate a selected conversation when empty. Clicking a room marks it read. Clicking an image opens the approved one-image lightbox; backdrop closes it.

- [ ] **Step 4: Move progress update into the approved centered modal**

Reuse existing progress mutation and form fields. Preserve draft on ambiguous failure, block double submit, show upload state, close and refresh on success, and protect dirty close.

- [ ] **Step 5: Implement live bell dropdown**

Build estimate, pending-slip, unread-message, and near-deadline items from live tables. Each links to the authoritative Admin view. `ทำเครื่องหมายว่าอ่านแล้วทั้งหมด` updates only the displayed notification set. Empty state reads `ไม่มีการแจ้งเตือนใหม่`.

- [ ] **Step 6: Implement interactive Sidebar and account controls**

Split the Sidebar from the shell. Collapse to icon strip, add title/tooltips, preserve badges, persist `nasora-admin-sidebar-collapsed` in localStorage, and let the hamburger toggle the same state. Replace fixture avatar with authenticated image or `N`. Account menu includes public site, Settings, real email, and Supabase sign-out.

- [ ] **Step 7: Make global search intentional**

`Ctrl+/` focuses the search field. Submitting a non-empty query navigates to `/admin/search?q=<encoded>`. Add a server search route that returns grouped links for customers/jobs/estimates/slips without exposing Guest contact values in client props.

- [ ] **Step 8: Verify and commit**

Run focused Messages/Shell/notification tests, full suite, typecheck, lint, build, and diff check; commit:

```powershell
git commit -m "feat(admin): connect messages and notifications"
```

---

### Task 5: Modal CRUD for every approved Admin add action

**Files:**
- Create: `src/features/admin/modals/components/admin-modal-shell.tsx`
- Create: `src/features/admin/modals/hooks/use-dirty-modal.ts`
- Create: `src/app/(admin)/admin/@modal/default.tsx`
- Create intercepted routes under `src/app/(admin)/admin/@modal/(.)catalog/new/`, `(.)portfolio/new/`, and `(.)documents/new/`
- Create direct modal query handling for centered sub-service, Guest job, progress update, and personal-note dialogs.
- Modify: `src/app/(admin)/layout.tsx`
- Modify: catalog, portfolio, documents, jobs, messages, and Dashboard list components.
- Modify: existing Admin editors to accept `presentation: "page" | "modal"`, `onDirtyChange`, and `onSaved`.
- Test: `tests/components/admin-modal-shell.test.tsx`
- Test: focused editor/list tests for catalog, portfolio, documents, jobs, messages, and Dashboard.
- Test: `tests/e2e/admin-modal-navigation.spec.ts`

**Interfaces:**
- `AdminModalShell({ children, dirty, mode, title })` supports `mode: "centered" | "fullscreen"`.
- `useDirtyModal(initialFingerprint)` returns `{ dirty, markSaved, requestClose }`.
- Direct editor URLs remain full pages; intercepted navigation renders the same editor over the list.

- [ ] **Step 1: Write RED modal behavior tests**

```tsx
await user.click(screen.getByRole("button", { name: "เพิ่มผลงาน" }));
expect(screen.getByRole("dialog", { name: "เพิ่มผลงาน" })).toHaveAttribute("data-mode", "fullscreen");
await user.keyboard("{Escape}");
expect(screen.getByRole("alertdialog", { name: "ละทิ้งการแก้ไขหรือไม่" })).toBeVisible();
```

- [ ] **Step 2: Implement the shared accessible modal shell**

Add focus trap, initial focus, focus restoration, Escape/backdrop clean close, dirty confirmation, `aria-modal`, scroll lock, and browser-back close. Do not change approved colors, dimensions, or page layouts.

- [ ] **Step 3: Add full-screen intercepted routes**

Wire add Album, add Portfolio, and create Document buttons to their existing `/new` URLs. Intercept only client navigation from list pages; direct URL load renders the existing full editor page. Successful save calls `router.back()` and `router.refresh()`.

- [ ] **Step 4: Convert simple inline forms to centered modals**

Move sub-service add/edit, Guest job add, progress update, and personal note into centered modals while reusing the existing form components and APIs. Preserve list search/filter/scroll state behind the modal.

- [ ] **Step 5: Audit every visible Admin button**

Add a table-driven component test that enumerates each Admin page control and asserts exactly one contract: navigates, opens a modal, calls a real mutation, or is disabled with an explicit Thai reason. Remove all remaining `href="#"` and unexplained no-op buttons.

- [ ] **Step 6: Verify and commit**

Run modal/editor focused tests and Playwright modal navigation, then full tests, typecheck, lint, build, and diff check; commit:

```powershell
git commit -m "feat(admin): open CRUD workflows in modals"
```

---

### Task 6: Ordinary customer test account and deterministic reset

**Files:**
- Create: `scripts/reset-test-customer.mjs`
- Create: `src/features/test-support/test-customer.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Create: `tests/e2e/fixtures/test-customer.ts`
- Create: `tests/e2e/customer-commission-lifecycle.spec.ts`
- Test: `tests/unit/test-customer-guard.test.ts`

**Interfaces:**
- Uses `TEST_CUSTOMER_EMAIL=customer.test@nasora.local` and server-only `TEST_CUSTOMER_PASSWORD`.
- Adds script `test:customer:reset` invoking `node --env-file=.env.local scripts/reset-test-customer.mjs`.
- Uses Supabase Admin `createUser`/`updateUserById` only from the Node script with `SUPABASE_SECRET_KEY`; browser code never imports the reset module.

- [ ] **Step 1: Write RED production-guard and credential tests**

```ts
expect(() => assertTestResetAllowed({ nodeEnv: "production" })).toThrow("disabled in production");
expect(() => parseTestCustomerEnv({})).toThrow("TEST_CUSTOMER_PASSWORD");
```

- [ ] **Step 2: Implement the server-only reset guard and script**

The script refuses production, validates the exact approved email, creates or updates one confirmed ordinary Auth user with `app_metadata.role = "member"`, resets password, deletes only rows owned by that user through a guarded service RPC, and inserts deterministic member profile/contact data. It must never assign Admin metadata or disable RLS for browser sessions.

- [ ] **Step 3: Add ignored environment documentation and npm command**

Add only variable names to `.env.example`. Do not commit a password or secret. Document command output as the user ID, reset row counts, and next test URL without printing the password.

- [ ] **Step 4: Write the full browser lifecycle test**

Reset and sign in as the ordinary account, submit an estimate, switch to the existing Admin storage state, review/send quote, create deposit intent, attach a deterministic test slip, verify it, assert job/queue creation, exchange text/progress, record installment/final payment, create delivery, and assert member access. Assert the customer cannot reach `/admin` or another member's rows.

- [ ] **Step 5: Verify and commit**

Run unit tests and the E2E test against local Supabase/R2 when credentials are present. If local external services are unavailable, keep the deterministic unit/route tests green and record the exact deferred command without claiming E2E completion. Then run full verification and commit:

```powershell
git commit -m "test(e2e): add ordinary customer workflow"
```

---

### Task 7: Uploaded-image repair and WebP display pipeline

**Files:**
- Create: `src/features/media/domain/image-upload.ts`
- Create: `src/features/media/client/normalize-image-for-upload.ts`
- Create: `src/features/media/server/persist-r2-image.server.ts`
- Create: `src/features/media/components/image-upload-field.tsx`
- Modify: catalog, portfolio, document, message, and progress upload routes.
- Modify: catalog, portfolio, document, message, and progress editors/composers.
- Modify: public/Admin media response routes.
- Modify: `next.config.ts`
- Test: `src/features/media/__tests__/image-upload.test.ts`
- Test: route tests for every media endpoint.
- Test: `tests/e2e/uploaded-images.spec.ts`

**Interfaces:**
- `inspectImageUpload(file): Promise<{ contentType; height; sizeBytes; width }>` validates MIME plus magic bytes and dimensions.
- `normalizeImageForUpload(file): Promise<{ file: File; contentType: "image/webp"; height; width }>` uses `createImageBitmap` plus `OffscreenCanvas.convertToBlob` or an HTML canvas fallback before network upload.
- `persistR2Image(input)` uploads, HEAD-confirms ETag/content type, registers the DB row only after storage success, and deletes the object if registration fails.
- `ImageUploadField` exposes `status: "idle" | "preview" | "uploading" | "ready" | "error"` and `mediaId` only when ready.

- [ ] **Step 1: Reproduce the broken permanent-image path in a browser test**

Upload PNG/JPEG/WebP through Admin, save the parent record, reload, visit the public page, and assert the permanent endpoint returns `200`, correct `content-type`, non-zero bytes, and visible dimensions. Keep this RED before implementation.

- [ ] **Step 2: Trace and test each pipeline boundary**

Add focused failures for invalid signatures, oversized files, R2 PUT failure, HEAD mismatch, DB registration failure/orphan cleanup, signed read failure, and wrong cache/content headers.

- [ ] **Step 3: Implement shared validation and client-side WebP normalization**

Normalize PNG/JPEG inputs in the Admin/member browser before network upload with `createImageBitmap` and `OffscreenCanvas.convertToBlob({ type: "image/webp", quality: 0.86 })`, falling back to an HTML canvas `toBlob` implementation when OffscreenCanvas is unavailable. Existing WebP may pass through after dimension validation. Preserve source aspect ratio, cap the longest edge at `4096`, revoke object URLs after replacement/unmount, and require the server to verify the resulting WebP magic bytes, declared dimensions, and `5 MiB` display limit. This adds no image-processing dependency and consumes no Cloudflare Worker conversion CPU.

- [ ] **Step 4: Replace duplicated upload handlers with the shared pipeline**

All editors show a local object-URL preview immediately, upload status, and permanent URL after success. Parent save buttons stay disabled while uploading or errored. Replacing a failed file clears the error; no reload/retry button is added.

- [ ] **Step 5: Repair media response headers and visibility**

Return or redirect only after authorizing the media row. Set exact WebP content type, immutable caching for versioned object identities, short safe caching for lookup redirects, and no-store for private message/progress assets. Do not expose object mutation URLs or credentials.

- [ ] **Step 6: Verify and commit**

Run media domain/route tests, the browser upload test, full suite, typecheck, lint, build, and diff check; commit:

```powershell
git commit -m "fix(media): persist and render uploaded images"
```

---

### Task 8: Public/member/Admin control audit

**Files:**
- Create: `tests/e2e/public-controls.spec.ts`
- Create: `tests/e2e/member-controls.spec.ts`
- Create: `tests/e2e/admin-controls.spec.ts`
- Modify only the specific components whose visible controls fail the audit.

**Interfaces:**
- Every visible button/link/input has one tested outcome: navigation, modal open/close, mutation, theme/language state change, search/filter result, notification action, or explicit disabled reason.

- [ ] **Step 1: Enumerate controls from rendered pages and write RED Playwright assertions**

Cover Home, Portfolio, Commission root/sub-album/detail/estimate form, Queue, Documents, auth/floating account, member workspace, Admin Dashboard, estimates, jobs, payments, messages, catalog, portfolio, documents, settings, Sidebar, topbar, notification menu, and account menu.

- [ ] **Step 2: Repair only failed interaction contracts**

Keep approved UI unchanged. Replace no-op handlers and dead links with their authoritative route/modal/mutation. Disable genuinely unavailable actions with `aria-disabled`/`disabled` and a visible Thai explanation.

- [ ] **Step 3: Verify closed/open commission behavior end to end**

Close from Admin, assert public status changes and new Guest/member submissions return blocked UI plus `409`, then reopen and assert submission succeeds. Existing member job/message/payment routes must remain usable while closed.

- [ ] **Step 4: Verify and commit**

Run all three control audits, then complete tests/typecheck/lint/build/diff checks; commit:

```powershell
git commit -m "test(ui): verify every visible control"
```

---

### Task 9: Measured loading optimization and final cleanup

**Files:**
- Create: `docs/performance/2026-08-12-baseline.md`
- Create: `docs/performance/2026-08-12-final.md`
- Create: `src/shared/performance/reduced-motion.ts`
- Modify: Home/Portfolio/Commission/Admin image components and particle background components.
- Modify: public data repositories and mutation revalidation helpers.
- Modify: modal/editor imports to use dynamic loading where measured.
- Remove fixture imports/assets only when `rg` proves no test or production route needs them.
- Test: `tests/unit/reduced-motion.test.ts`
- Test: existing and new performance-oriented browser assertions.

**Interfaces:**
- Baseline/final reports record LCP, CLS, transferred image bytes, and JavaScript bytes for Home, Portfolio, Commission album, and Admin Dashboard at the same viewport and throttling profile.

- [ ] **Step 1: Capture baseline measurements before optimization**

Use a production build and Playwright/Chrome trace at desktop viewport `1440×900`. Record repeatable commands, median of three runs, route, LCP, CLS, image bytes, JS bytes, and screenshots in the baseline report.

- [ ] **Step 2: Add RED reduced-motion and image-loading assertions**

Assert particles/shooting stars are absent under reduced motion, Hero/first-visible artwork is eager/high priority, below-fold images are lazy, and image `sizes` metadata matches the approved containers.

- [ ] **Step 3: Apply measured optimizations**

Keep server components as the default, dynamically load rich editors/full-screen modal code, cache public repository reads with explicit tags, invalidate tags after Admin mutations, prioritize only Hero/first-visible media, lazy-load the rest, add exact width/height/sizes, and remove production fixture imports.

- [ ] **Step 4: Capture final measurements and enforce no regression**

Repeat the exact baseline profile. Require no CLS regression, lower transferred image bytes, no higher route JavaScript without a documented functional reason, and improved or stable median LCP. Record measured deltas rather than qualitative claims.

- [ ] **Step 5: Run final clean verification**

```powershell
rg -n "fixture|mock|href=\"#\"|>5</b>" src/app src/features
npm test -- --run --maxWorkers=4
npm run typecheck
npm run lint
npm run build
npm run test:e2e
git diff --check
git status --short
```

Expected: no runtime fixture/mock customer rows, no unexplained dead links/hardcoded notification badge, all automated checks pass, and only intentional uncommitted local environment files remain.

- [ ] **Step 6: Commit final checkpoint**

```powershell
git add src tests docs/performance package.json package-lock.json next.config.ts
git commit -m "perf: optimize live Nasora workflows"
```

## Final Integration Gate

- [ ] Confirm every requirement in `docs/superpowers/specs/2026-08-12-live-ui-workflows-and-performance-design.md` maps to a passing test or recorded measurement.
- [ ] Confirm Supabase migrations apply cleanly to a disposable/local project before any production apply.
- [ ] Confirm the ordinary test customer cannot access Admin routes and Admin-only RPCs.
- [ ] Confirm uploaded images survive reload and render on both Admin and public pages.
- [ ] Confirm the branch is clean and checkpoint commits are ordered.
- [ ] Stop before merge, push, deploy, or production migration apply and report the exact next authorized action.
