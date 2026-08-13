# Responsive audit — 2026-08-14

Status: UI changes pending Nasora approval. This audit did not modify layout CSS, JSX, or visual snapshots.

## Evidence

- Viewports: 390x844, 768x1024, 1440x900, and Home 1920x1080.
- Public functional E2E: 47 passed, 6 skipped, 1 responsive behavior failure, 13 stale visual baselines.
- Authenticated checks: member security boundary and avatar lifecycle passed. Estimate submit/cancel skipped because commissions are closed.
- Accessibility: five representative public pages and the estimate/details dialogs reported no critical or serious automated Axe violations.
- Horizontal document overflow assertions pass on public routes, but clipped nested member content proves document width alone is not a sufficient responsive check.

Artifacts are kept under `output/playwright/responsive-audit/` and Playwright `test-results/`.

## Findings and proposed changes

### R1 — Public service view controls are undersized

- Reproduction: `/en/commission/illustration`, 390x844.
- Current result: Grid, List, and Gallery buttons are 36x36.
- Proposed result: retain the same visual group and icons, but enlarge each hit target to at least 44x44.
- Likely file: `src/features/commission/components/commission.module.css`.
- Approval: pending.

### R2 — Service details dialog clips content on phone

- Reproduction: open `View Details & Rates` at 390x844.
- Current result: title, description, price table, and footer actions extend beyond the left/right viewport; only a cropped middle portion is visible.
- Proposed result: single-column phone dialog, full-width title and pricing panels, internally scrollable body, and two full-width footer actions. Desktop geometry remains unchanged.
- Likely files: `src/features/commission/components/commission.module.css`, responsive Playwright assertions/snapshot.
- Approval: pending.

### R3 — Member header/sidebar content clips on phone

- Reproduction: `/en/member/jobs`, `/requests`, `/messages`, `/payments`, `/profile` at 390x844.
- Current result: avatar/name and five-column member navigation overflow the member rail and are hidden on the right.
- Proposed result: keep member sidebar identity visible, then render its five destinations as a horizontally scrollable tab row below the identity on phone. No page-level horizontal scroll; desktop sidebar unchanged.
- Likely files: `src/features/member/components/member-pages.module.css`, `src/features/member/components/member-sidebar.module.css`, member responsive tests.
- Approval: pending.

### R4 — Member messages show two panes in insufficient phone width

- Reproduction: `/en/member/messages`, 390x844.
- Current result: conversation list and chat are squeezed together; empty-state text and composer are clipped.
- Proposed result: phone shows conversation list first; selecting a conversation replaces it with chat and exposes a Back control. Chat body owns vertical scrolling and composer stays visible. Tablet/Desktop keep two panes.
- Likely files: member messages component, `src/features/member/components/member-pages.module.css`, component/E2E tests.
- Approval: pending.

### R5 — Member profile two-column fields remain wider than the phone panel

- Reproduction: `/en/member/profile`, 390x844.
- Current result: preferred-language and adjacent fields are cut at the right edge.
- Proposed result: stack field pairs and upload controls at phone width; preserve current cards and colors.
- Likely file: `src/features/member/components/member-pages.module.css`.
- Approval: pending.

### R6 — Admin shell is Desktop-only below 1438px

- Static evidence: `admin-dashboard.module.css` sets `min-width: 1438px` and has no viewport responsive breakpoint.
- Current result: tablet/phone require a wide canvas and cannot use dashboard controls safely.
- Proposed result: below 1100px collapse Admin sidebar to icon rail, allow main content vertical scrolling, stack dashboard summary/rail panels, and give dense tables their own horizontal scroll. Below 720px open sidebar as a drawer and stack actions. Desktop 1440/1920 layout remains unchanged.
- Likely files: `src/features/admin/components/admin-dashboard.module.css`, section page CSS, Admin component/E2E tests.
- Approval: pending.

### R7 — Visual baselines are stale

- Reproduction: visual suite differs on Home, Portfolio, Commission, Queue, Documents, and Service Details at Desktop and phone.
- Current result: functional UI has changed since approved snapshots; blindly updating would hide R2–R6.
- Proposed result: implement approved responsive fixes first, visually inspect all target pages, then update only confirmed baselines.
- Approval: pending with R1–R6.

## Pages that need no responsive redesign from this audit

- Public Home at 768x1024.
- Public Portfolio at 390x844 and 768x1024.
- Public Commission albums at 390x844.
- Existing public routes have no document-level horizontal overflow.

