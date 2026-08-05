# Home Narrower Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Narrow the desktop Navbar and Home shell to the user-approved red guide lines.

**Architecture:** Change only the existing desktop geometry declarations. Keep the shared Navbar and Home layout ownership separate.

**Tech Stack:** Next.js, React, CSS Modules.

## Global Constraints

- Work in `E:\NasoraStudio\.worktrees\nasora-public`.
- Desktop width is `76vw`, capped at `1440px`, and centered.
- Do not redesign responsive layouts or inner components.
- Run only a focused page-load check during the UI-first phase.

---

### Task 1: Narrow the aligned desktop shells

**Files:**
- Modify: `src/shared/components/public-shell/public-shell.module.css`
- Modify: `src/features/home/components/home.module.css`

**Interfaces:**
- Consumes: the existing `1024px` desktop breakpoint.
- Produces: centered `76vw / 1440px` Navbar and Home shells.

- [ ] **Step 1: Change the shared Navbar width**

```css
.navbarFootprint { width: min(76vw, 1440px); }
```

- [ ] **Step 2: Change the desktop Home width**

```css
@media (min-width: 1024px) {
  .home {
    max-width: 1440px;
    width: 76vw;
  }
}
```

- [ ] **Step 3: Perform the UI-first check**

Open `/th` at `1920×1080` and confirm the Navbar and Home shell align at approximately `x = 240` and `x = 1680`. Do not run the full regression suite until the remaining UI pages are complete.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/public-shell/public-shell.module.css src/features/home/components/home.module.css
git commit -m "style: narrow the Home desktop shell"
```
