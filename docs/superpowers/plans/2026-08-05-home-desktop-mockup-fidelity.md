# Home Desktop Mockup Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop Home page closely match the approved `nasora-home-night-v1.png`, remove Navbar shrinking, and replace the stepped Featured card with a slow continuous four-up loop.

**Architecture:** Keep the shared shell and every Home composite in its current ownership boundary. Remove scroll-driven Navbar state entirely. `FeaturedCarousel` becomes a CSS-animated, duplicated-track loop whose React state only manages pause reasons; desktop-only layout rules are isolated under a minimum-width media query so this pass does not redesign mobile.

**Tech Stack:** Next.js App Router, React, strict TypeScript, CSS Modules, Vitest, Testing Library, Playwright, and OpenNext Cloudflare.

## Global Constraints

- Work only in `E:\NasoraStudio\.worktrees\nasora-public` on `feature/nasora-public`.
- Visual target: `E:\NasoraStudio\mockups\nasora-home-night-v1.png` at `1920×1080`.
- This pass redesigns Desktop Home only; do not redesign responsive/mobile layouts or other page composites.
- The shared Floating Navbar keeps one constant size at all scroll positions.
- Home container width is approximately 88vw, capped near 1680px, and centered.
- Featured artwork shows four cards, clips the remaining track, flows continuously, and loops without a visible jump.
- Pause Featured motion on hover, focus, hidden document, explicit pause, and Reduced Motion.
- Keep Hero random selection stable for the visit and preserve static fallback/LCP derivative behavior.
- Do not introduce Worker-side image transformation or cross-import Portfolio/Commission layout components.
- Stop after Home passes and present it to the user before changing another page.

---

## File structure

```text
src/shared/components/public-shell/
  floating-navbar.tsx        # constant Navbar behavior
  public-shell.module.css    # shared 88vw/1680px desktop shell geometry
src/features/home/components/
  home-page.tsx              # Home-only composition and test hooks
  home-hero.tsx              # existing stable Hero; copy/media structure only
  featured-carousel.tsx      # continuous loop and pause state
  quick-info-panel.tsx       # existing tabs; compact mockup composition
  home.module.css            # Home-owned desktop visual implementation
tests/components/
  public-shell.test.tsx      # Navbar constant-size regression
  featured-carousel.test.tsx # loop duplication and pause contract
  home-page.test.tsx         # Home content/ownership regressions
tests/e2e/
  theme-and-navigation.spec.ts # constant Navbar after scroll
  home-desktop.spec.ts         # 1920×1080 geometry and first-viewport checks
  visual-regression.spec.ts    # dedicated Home desktop baseline
```

### Task 1: Keep the Floating Navbar at one size

**Files:**
- Modify: `src/shared/components/public-shell/floating-navbar.tsx`
- Modify: `src/shared/components/public-shell/public-shell.module.css`
- Modify: `tests/components/public-shell.test.tsx`
- Modify: `tests/e2e/theme-and-navigation.spec.ts`

**Interfaces:**
- Consumes: `FloatingNavbarProps { locale: Locale; availability?: "open" | "closed" }`
- Produces: a Navbar with no scroll listener, compact state, or `data-compact` attribute

- [ ] **Step 1: Replace the compact component test with a constant-state regression**

```tsx
it("keeps one Navbar size after scrolling", () => {
  render(<FloatingNavbar locale="en" />);
  const navbar = screen.getByRole("banner");

  expect(navbar).not.toHaveAttribute("data-compact");
  fireEvent.scroll(window, { target: { scrollY: 320 } });
  expect(navbar).not.toHaveAttribute("data-compact");
});
```

- [ ] **Step 2: Replace the Playwright compact assertion with bounding-box stability**

```ts
test("floating Navbar keeps the same dimensions after scroll", async ({ page }) => {
  await page.goto("/en");
  const navbar = page.getByRole("banner");
  const before = await navbar.boundingBox();
  await page.evaluate(() => window.scrollTo(0, 320));
  const after = await navbar.boundingBox();

  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
  await expect(navbar).not.toHaveAttribute("data-compact");
});
```

- [ ] **Step 3: Run the focused tests and verify the old implementation fails**

Run:

```powershell
npm test -- tests/components/public-shell.test.tsx
npx playwright test tests/e2e/theme-and-navigation.spec.ts --grep "same dimensions"
```

Expected: FAIL because the current Navbar sets `data-compact` and changes padding after scroll.

- [ ] **Step 4: Remove compact behavior and align the desktop shell width**

In `floating-navbar.tsx`, apply this exact behavioral diff while leaving the control markup below the header unchanged:

```diff
-import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
+import { useCallback, useState, useSyncExternalStore } from "react";

 export function FloatingNavbar({ locale, availability = "open" }: FloatingNavbarProps) {
   const [sidebarOpen, setSidebarOpen] = useState(false);
-  const [compact, setCompact] = useState(false);
   const theme = useSyncExternalStore(subscribeToTheme, currentTheme, () => "night");

-  useEffect(() => {
-    const updateCompactState = () => setCompact(window.scrollY > 32);
-    updateCompactState();
-    window.addEventListener("scroll", updateCompactState, { passive: true });
-    return () => window.removeEventListener("scroll", updateCompactState);
-  }, []);

-      <header className={styles.navbar} data-compact={compact}>
+      <header className={styles.navbar}>
```
```

In `public-shell.module.css`, delete `.navbar[data-compact="true"]`, remove layout-property transitions, and use the approved desktop alignment:

```css
.navbarFootprint {
  margin: 2rem auto 0;
  min-height: 64px;
  position: sticky;
  top: 1rem;
  width: min(88vw, 1680px);
  z-index: var(--z-navbar);
}

.navbar {
  padding: 0.625rem 1rem;
  width: 100%;
}
```

- [ ] **Step 5: Run the focused tests**

Run the commands from Step 3.

Expected: PASS with stable Navbar dimensions and all existing Sidebar/theme behavior intact.

- [ ] **Step 6: Commit Task 1**

```powershell
git add src/shared/components/public-shell/floating-navbar.tsx src/shared/components/public-shell/public-shell.module.css tests/components/public-shell.test.tsx tests/e2e/theme-and-navigation.spec.ts
git commit -m "fix: keep the public Navbar full size"
```

### Task 2: Replace the stepped Featured card with a continuous four-up loop

**Files:**
- Modify: `src/features/home/components/featured-carousel.tsx`
- Modify: `src/features/home/components/home.module.css`
- Modify: `tests/components/featured-carousel.test.tsx`
- Modify: `tests/components/home-page.test.tsx`

**Interfaces:**
- Consumes: `FeaturedCarouselProps { items: FeaturedItem[]; locale?: Locale; secondsPerItem?: number }`
- Produces: two render groups marked `data-featured-loop-group`, a track marked `data-paused`, four desktop card columns, and a localized Play/Pause control

- [ ] **Step 1: Replace stepped-index tests with the loop contract**

Add focused tests with at least five unique test items:

```tsx
it("renders two groups for a seamless loop while exposing only the primary group", () => {
  render(<FeaturedCarousel items={items} locale="en" />);

  expect(screen.getAllByTestId("featured-loop-group")).toHaveLength(2);
  expect(screen.getByTestId("featured-loop-viewport")).toHaveAttribute("data-visible-count", "4");
  expect(screen.getAllByRole("link", { name: "View Starlit Traveler" })).toHaveLength(1);
});

it("toggles an explicit manual pause", () => {
  render(<FeaturedCarousel items={items} locale="en" />);
  const track = screen.getByTestId("featured-loop-track");

  fireEvent.click(screen.getByRole("button", { name: "Pause featured artwork" }));
  expect(track).toHaveAttribute("data-paused", "true");
  fireEvent.click(screen.getByRole("button", { name: "Play featured artwork" }));
  expect(track).toHaveAttribute("data-paused", "false");
});
```

Keep separate tests for hover, focus, `visibilitychange`, Reduced Motion, zero items, locale-prefixed destinations, and Thai labels. Assert pause state through `data-paused` rather than fake interval advancement.

- [ ] **Step 2: Run the Featured tests and verify failure**

Run:

```powershell
npm test -- tests/components/featured-carousel.test.tsx tests/components/home-page.test.tsx
```

Expected: FAIL because the current component renders one active article with Previous/Next/position controls.

- [ ] **Step 3: Implement pause-only React state and duplicated presentation groups**

Use one state set and no timer/index state:

```tsx
type PauseReason = "focus" | "hover" | "manual" | "motion" | "visibility";

if (items.length === 0) return null;

const renderItems = items.length >= 4
  ? items
  : Array.from({ length: 4 }, (_, index) => items[index % items.length]);
const durationSeconds = Math.max(renderItems.length * secondsPerItem, 24);
const isPaused = pauseReasons.size > 0;
const manualPaused = pauseReasons.has("manual");

<section aria-label={copy.label} className={styles.carousel} role="region">
  <div className={styles.sectionHeading}>
    <h2 id="featured-work">{copy.title}</h2>
    <button
      aria-label={manualPaused ? copy.play : copy.pause}
      className={styles.motionToggle}
      onClick={() => setPaused("manual", !manualPaused)}
      type="button"
    >
      {manualPaused ? "▶" : "Ⅱ"}
    </button>
  </div>
  <div className={styles.loopViewport} data-testid="featured-loop-viewport" data-visible-count="4">
    <div
      className={styles.loopTrack}
      data-paused={isPaused}
      data-testid="featured-loop-track"
      style={{ "--loop-duration": `${durationSeconds}s` } as CSSProperties}
    >
      <FeaturedGroup items={renderItems} locale={locale} />
      <FeaturedGroup ariaHidden items={renderItems} locale={locale} />
    </div>
  </div>
</section>
```

`FeaturedGroup` stays in the same file, renders responsive stored derivatives, gives the duplicate group `aria-hidden="true"`, and sets duplicate links to `tabIndex={-1}`. Link labels use `View ${item.title[locale]}` / `ดู ${item.title[locale]}`.

- [ ] **Step 4: Add seamless CSS motion and four-card geometry**

```css
.loopViewport {
  container-type: inline-size;
  overflow: hidden;
}

.loopTrack {
  --loop-gap: 1rem;
  animation: featured-loop var(--loop-duration, 30s) linear infinite;
  display: flex;
  gap: var(--loop-gap);
  width: max-content;
}

.loopTrack[data-paused="true"] { animation-play-state: paused; }

.loopGroup { display: flex; gap: var(--loop-gap); }

.loopCard {
  flex: 0 0 calc((100cqw - 3 * var(--loop-gap)) / 4);
  min-width: 0;
}

@keyframes featured-loop {
  to { transform: translateX(calc(-50% - var(--loop-gap) / 2)); }
}

@media (prefers-reduced-motion: reduce) {
  .loopTrack { animation: none; }
}
```

- [ ] **Step 5: Run focused tests and inspect the animation in a real browser**

Run:

```powershell
npm test -- tests/components/featured-carousel.test.tsx tests/components/home-page.test.tsx
npx playwright test tests/e2e/accessibility.spec.ts --grep "Home"
```

Expected: PASS; only primary cards appear in the accessibility tree and the track pauses for every approved reason.

- [ ] **Step 6: Commit Task 2**

```powershell
git add src/features/home/components/featured-carousel.tsx src/features/home/components/home.module.css tests/components/featured-carousel.test.tsx tests/components/home-page.test.tsx
git commit -m "feat: add continuous Home artwork loop"
```

### Task 3: Match the approved desktop Home composition

**Files:**
- Modify: `src/features/home/components/home-page.tsx`
- Modify: `src/features/home/components/home-hero.tsx`
- Modify: `src/features/home/components/quick-info-panel.tsx`
- Modify: `src/features/home/components/home.module.css`
- Create: `tests/e2e/home-desktop.spec.ts`
- Modify: `tests/e2e/visual-regression.spec.ts`
- Update after visual inspection: `tests/e2e/visual-regression.spec.ts-snapshots/home-mockup-1920x1080.png`

**Interfaces:**
- Consumes: existing `HomePageProps`, stable `HomeHero`, continuous `FeaturedCarousel`, and Home-only `QuickInfoPanel`
- Produces: a centered desktop Home shell with `data-home-shell`, `data-home-hero`, `data-home-lower-grid`, and first-viewport geometry assertions

- [ ] **Step 1: Write the desktop geometry E2E test**

```ts
test("Home follows the approved 1920 desktop composition", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/th");

  const shell = page.locator('[data-home-shell="true"]');
  const hero = page.locator('[data-home-hero="true"]');
  const lower = page.locator('[data-home-lower-grid="true"]');
  const shellBox = await shell.boundingBox();
  const heroBox = await hero.boundingBox();
  const lowerBox = await lower.boundingBox();

  expect(shellBox?.width).toBeGreaterThanOrEqual(1640);
  expect(shellBox?.width).toBeLessThanOrEqual(1690);
  expect(heroBox?.height).toBeLessThan(560);
  expect(lowerBox?.y).toBeLessThan(760);
  await expect(page.getByTestId("featured-loop-viewport")).toHaveAttribute("data-visible-count", "4");
  await expect(page.getByRole("tablist", { name: /ข้อมูลฉบับย่อ/ })).toBeInViewport();
});
```

- [ ] **Step 2: Run the geometry test and verify failure**

Run:

```powershell
npx playwright test tests/e2e/home-desktop.spec.ts
```

Expected: FAIL because the current Home is capped at 1440px and the Hero consumes excessive vertical space.

- [ ] **Step 3: Add semantic test hooks without changing ownership**

```tsx
<main className={styles.home} data-home-shell="true">
  <div data-home-hero="true">
    <HomeHero heroItems={heroItems} locale={locale} randomValue={randomValue} />
  </div>
  <div className={styles.lowerGrid} data-home-lower-grid="true">
    <FeaturedCarousel items={featuredItems} locale={locale} />
    <QuickInfoPanel locale={locale} />
  </div>
</main>
```

- [ ] **Step 4: Implement desktop-only mockup geometry**

Keep existing small-screen rules. Add the visual target under `@media (min-width: 1024px)`:

```css
@media (min-width: 1024px) {
  .home {
    max-width: 1680px;
    padding: clamp(1.5rem, 3vh, 2.5rem) 0 5rem;
    width: 88vw;
  }

  .hero {
    gap: clamp(3rem, 5vw, 6rem);
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.25fr);
    min-height: 0;
  }

  .hero h1 { font-size: clamp(3rem, 3.2vw, 4rem); }
  .heroDescription { margin-block: 1.25rem 0.75rem; max-width: 38rem; }
  .heroActions { margin-top: 1.75rem; }
  .heroArtwork { max-height: 500px; }

  .lowerGrid {
    gap: 1.5rem;
    grid-template-columns: minmax(0, 1.58fr) minmax(32rem, 0.92fr);
    margin-top: 1rem;
  }

  .carousel {
    background: transparent;
    border: 0;
    box-shadow: none;
    padding: 0;
  }

  .quickInfo { min-height: 17rem; padding: 1.25rem 1.5rem; }
}
```

Tune only within these approved limits while comparing to the mockup: centered 88vw/1680px shell, Hero under 560px tall, lower section starting before y=760, and no clipped controls at 1920×1080.

- [ ] **Step 5: Add the dedicated visual target**

Extend the visual suite with a deterministic Night-theme Home capture:

```ts
test("Home matches the approved 1920 desktop baseline", async ({ page }) => {
  await prepareVisualPage(page, "/th", 1920, 1080);
  await expect(page).toHaveScreenshot("home-mockup-1920x1080.png", {
    animations: "disabled",
    caret: "initial",
    fullPage: false,
    maxDiffPixelRatio: crossPlatformMaxDiffPixelRatio,
    stylePath: screenshotStylePath,
  });
});
```

Generate the baseline only after visually opening both the result and `E:\NasoraStudio\mockups\nasora-home-night-v1.png`. Do not approve a baseline that preserves the current excessive whitespace.

- [ ] **Step 6: Run Home-focused verification**

```powershell
npm test -- tests/components/home-page.test.tsx tests/components/featured-carousel.test.tsx tests/components/public-shell.test.tsx
npx playwright test tests/e2e/home-desktop.spec.ts tests/e2e/theme-and-navigation.spec.ts tests/e2e/visual-regression.spec.ts --grep "Home|Navbar"
```

Expected: PASS with the Home target and unchanged behavior on non-Home routes except the constant Navbar.

- [ ] **Step 7: Commit Task 3**

```powershell
git add src/features/home tests/e2e/home-desktop.spec.ts tests/e2e/visual-regression.spec.ts tests/e2e/visual-regression.spec.ts-snapshots/home-mockup-1920x1080.png
git commit -m "feat: match the approved Home desktop mockup"
```

### Task 4: Final Home-only quality gate and user preview

**Files:**
- Modify only if verification finds an issue: files already listed in Tasks 1–3
- Review: `E:\NasoraStudio\mockups\nasora-home-night-v1.png`

**Interfaces:**
- Consumes: committed Tasks 1–3
- Produces: a clean feature branch and a reviewable Desktop Home preview

- [ ] **Step 1: Run the complete automated gate**

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm run cf:build
npx playwright test
npm audit
```

Expected: all tests pass, all routes remain static, OpenNext build passes, and audit reports zero vulnerabilities.

- [ ] **Step 2: Inspect the Home screenshot beside the approved mockup**

Open both files at original detail and verify Navbar size, shared alignment, compact Hero height, four visible artwork cards, hidden overflow, Quick Info placement, and first-viewport density. If any one differs materially, fix that owning Home or shell stylesheet and rerun the focused gate before accepting it.

- [ ] **Step 3: Verify repository cleanliness and process cleanup**

```powershell
git diff --check
git status --short
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000, 8787 }
```

Expected: no whitespace errors, no uncommitted tracked changes after the final commit, and no leftover development/preview listener.

- [ ] **Step 4: Commit any verification-only correction**

```powershell
git add src/shared/components/public-shell/floating-navbar.tsx src/shared/components/public-shell/public-shell.module.css src/features/home/components tests/components/public-shell.test.tsx tests/components/featured-carousel.test.tsx tests/components/home-page.test.tsx tests/e2e/home-desktop.spec.ts tests/e2e/theme-and-navigation.spec.ts tests/e2e/visual-regression.spec.ts tests/e2e/visual-regression.spec.ts-snapshots/home-mockup-1920x1080.png
git commit -m "fix: finish Home mockup fidelity pass"
```

Skip this commit when Step 1–3 require no correction.

- [ ] **Step 5: Stop at the Home review checkpoint**

Present the Desktop Home result and its screenshot to the user. Do not begin Queue, Portfolio, Commission, or another page until the user approves Home.
