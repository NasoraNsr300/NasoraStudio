# Nasora Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete desktop-first Nasora admin area from the approved dashboard mockup, with every sidebar destination and a persistent Night/Autumn theme control.

**Architecture:** The admin area lives in the isolated `(admin)` route group so it never inherits the public or member shell. `AdminShell` owns the shared sidebar, top bar, active navigation, and theme state; every route supplies its own focused page content. Fixture data remains local to admin UI components until the later Supabase data phase.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, lucide-react, Vitest, Testing Library.

## Global Constraints

- Preserve the approved public and member layouts.
- Match `mockups/nasora-admin-dashboard-night-v1.png` at desktop width.
- Support Night and Autumn themes and persist the admin choice in `localStorage`.
- Build all nine admin sidebar destinations with real routes.
- UI only in this phase; do not mutate production data.

---

### Task 1: Admin dashboard and shell

**Files:**
- Create: `src/features/admin/components/admin-shell.tsx`
- Create: `src/features/admin/components/admin-shell.module.css`
- Modify: `src/features/admin/components/admin-dashboard.tsx`
- Modify: `src/features/admin/components/admin-dashboard.module.css`
- Test: `tests/components/admin-dashboard.test.tsx`

**Interfaces:**
- Produces: `AdminShell({ children, activePath })` and `AdminDashboard()`.

- [ ] Write tests for approved dashboard sections, active navigation, and theme controls.
- [ ] Run `npm test -- tests/components/admin-dashboard.test.tsx` and verify the new assertions fail.
- [ ] Implement the shell and dashboard mockup.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Admin management pages

**Files:**
- Create: `src/features/admin/components/admin-section-pages.tsx`
- Create: `src/features/admin/components/admin-section-pages.module.css`
- Create: `src/app/(admin)/admin/{estimates,jobs,payments,messages,catalog,portfolio,documents,settings}/page.tsx`
- Test: `tests/components/admin-sections.test.tsx`

**Interfaces:**
- Consumes: `AdminShell`.
- Produces: dedicated route components for all sidebar destinations.

- [ ] Write route-level UI tests for each page heading and primary management action.
- [ ] Run `npm test -- tests/components/admin-sections.test.tsx` and verify failure.
- [ ] Implement the eight management surfaces with page-specific controls, tables, lists, and settings.
- [ ] Re-run the focused test and verify it passes.

### Task 3: Visual verification

**Files:**
- Modify only files from Tasks 1–2 when visual defects are found.

**Interfaces:**
- Consumes: `/admin` and every admin sub-route.

- [ ] Run `npm run typecheck`.
- [ ] Run focused admin tests.
- [ ] Open `/admin` at desktop size and compare against the approved mockup.
- [ ] Verify Night/Autumn switching and navigation between every sidebar page.
- [ ] Record any unrelated legacy failures separately without changing approved public UI.
