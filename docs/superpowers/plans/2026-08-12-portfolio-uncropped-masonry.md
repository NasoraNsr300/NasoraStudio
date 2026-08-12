# Portfolio Uncropped Masonry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every portfolio image's source aspect ratio inside the approved four-column dense gallery without cropping.

**Architecture:** Keep deterministic one- or two-column width selection in `portfolio-layout.ts`. Replace fixed grid-row shapes with per-card CSS aspect ratio derived from database media dimensions, and render images as normal full-width content instead of absolutely positioned `object-fit: cover` media.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules, Vitest, Testing Library

## Global Constraints

- Desktop remains a four-column dense gallery.
- Wide images may span two columns; portrait and near-square images remain one column.
- Images must preserve their original aspect ratio and must not be cropped.
- Database `display_order`, lightbox behavior, hover/focus title overlay, loading priority, and responsive breakpoints remain unchanged.
- No new runtime dependency.

---

### Task 1: Define deterministic width spans

**Files:**
- Modify: `src/features/portfolio/components/portfolio-layout.ts`
- Modify: `src/features/portfolio/components/__tests__/portfolio-layout.test.ts`

**Interfaces:**
- Consumes: media `{ height: number; id: string; width: number }`
- Produces: `portfolioTileWidth(media): "single" | "double"`

- [ ] **Step 1: Write the failing width-selection test**

```ts
expect(portfolioTileWidth({ height: 1600, id: portraitId, width: 1200 })).toBe("single");
expect(portfolioTileWidth({ height: 800, id: landscapeId, width: 1800 })).toBe("double");
expect(portfolioTileWidth(media)).toBe(portfolioTileWidth(media));
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npx vitest run src/features/portfolio/components/__tests__/portfolio-layout.test.ts`

Expected: FAIL because `portfolioTileWidth` is not exported.

- [ ] **Step 3: Implement the minimal deterministic width selector**

```ts
export type PortfolioTileWidth = "single" | "double";

export function portfolioTileWidth(media: { height: number; id: string; width: number }): PortfolioTileWidth {
  const ratio = media.width / media.height;
  if (ratio < 1.35) return "single";
  return stableHash(media.id) % 5 === 0 ? "single" : "double";
}
```

- [ ] **Step 4: Run the focused test and observe GREEN**

Run: `npx vitest run src/features/portfolio/components/__tests__/portfolio-layout.test.ts`

Expected: PASS.

---

### Task 2: Render intrinsic-ratio portfolio cards

**Files:**
- Modify: `src/features/portfolio/components/portfolio-gallery.tsx`
- Modify: `src/features/portfolio/components/portfolio.module.css`
- Modify: `src/features/portfolio/components/__tests__/portfolio-gallery.test.tsx`
- Create: `src/features/portfolio/components/__tests__/portfolio-layout-css.test.ts`

**Interfaces:**
- Consumes: `portfolioTileWidth(media)` and media `width`/`height`
- Produces: cards with `--portfolio-aspect-ratio: "width / height"` and `single|double` width classes

- [ ] **Step 1: Write failing component and CSS contracts**

```tsx
const card = screen.getByRole("button", { name: "ดู สวนจันทร์" });
expect(card).toHaveStyle({ "--portfolio-aspect-ratio": "1200 / 1600" });
```

```ts
expect(css).not.toMatch(/object-fit:\s*cover/);
expect(css).not.toMatch(/grid-auto-rows:/);
expect(css).toMatch(/\.card\s*\{[^}]*aspect-ratio:\s*var\(--portfolio-aspect-ratio\)/);
```

- [ ] **Step 2: Run focused tests and observe RED**

Run: `npx vitest run src/features/portfolio/components/__tests__/portfolio-gallery.test.tsx src/features/portfolio/components/__tests__/portfolio-layout-css.test.ts`

Expected: FAIL because cards do not expose their intrinsic ratio and CSS still uses fixed rows with `cover`.

- [ ] **Step 3: Implement intrinsic-ratio cards**

Pass a typed CSS custom property from each media row:

```tsx
style={{ "--portfolio-aspect-ratio": `${item.media.width} / ${item.media.height}` } as CSSProperties}
```

Use these CSS rules:

```css
.gallery { display: grid; gap: .65rem; grid-auto-flow: dense; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.card { aspect-ratio: var(--portfolio-aspect-ratio); }
.cardMedia { display: block; height: auto; width: 100%; }
.single { grid-column: span 1; }
.double { grid-column: span 2; }
```

Keep the overlay absolutely positioned over the full card and remove obsolete `square`, `portrait`, `wide`, and `hero` row-span rules.

- [ ] **Step 4: Run focused gallery tests and observe GREEN**

Run: `npx vitest run src/features/portfolio/components/__tests__/portfolio-layout.test.ts src/features/portfolio/components/__tests__/portfolio-gallery.test.tsx src/features/portfolio/components/__tests__/portfolio-layout-css.test.ts tests/components/portfolio-gallery.test.tsx tests/components/image-lightbox.test.tsx`

Expected: PASS.

---

### Task 3: Verify responsive and production behavior

**Files:**
- Modify only if verification exposes a regression in the Task 2 files.

**Interfaces:**
- Consumes: completed gallery implementation
- Produces: verified uncropped gallery checkpoint

- [ ] **Step 1: Run static verification**

Run: `npm run typecheck`

Run: `npx eslint src/features/portfolio/components/portfolio-layout.ts src/features/portfolio/components/portfolio-gallery.tsx src/features/portfolio/components/__tests__/portfolio-layout.test.ts src/features/portfolio/components/__tests__/portfolio-gallery.test.tsx src/features/portfolio/components/__tests__/portfolio-layout-css.test.ts`

Expected: both exit 0.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 3: Inspect the browser at desktop width**

Open `/th/portfolio` and verify:

- the otter portrait remains fully visible;
- the landscape image remains fully visible;
- no artificial blank strip appears inside either card;
- title appears only on hover/focus;
- clicking either card opens the full image lightbox.

- [ ] **Step 4: Commit implementation**

```powershell
git add -- src/features/portfolio/components/portfolio-layout.ts src/features/portfolio/components/portfolio-gallery.tsx src/features/portfolio/components/portfolio.module.css src/features/portfolio/components/__tests__/portfolio-layout.test.ts src/features/portfolio/components/__tests__/portfolio-gallery.test.tsx src/features/portfolio/components/__tests__/portfolio-layout-css.test.ts
git commit -m "fix(portfolio): preserve artwork aspect ratios"
```
