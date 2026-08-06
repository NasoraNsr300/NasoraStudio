# Nasora Foundation and Public Desktop Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, visually reviewable Nasora public website on typed fixture data while establishing boundaries that later Supabase-backed stages can replace without changing page layouts.

**Architecture:** Use Next.js App Router with locale-prefixed public routes and React Server Components for page composition. Page-specific feature folders own their composite layouts; only the public shell and low-level primitives are shared. All public data is consumed through `PublicContentRepository`, initially implemented by local fixtures and replaced by Supabase in Stage 2.

**Tech Stack:** Node.js 20.9 or newer, npm, Next.js App Router, React, TypeScript strict mode, CSS Modules, Zod, Vitest, Testing Library, Playwright, `@opennextjs/cloudflare`, and Wrangler.

## Global Constraints

- Desktop-first implementation followed by responsive mobile behavior
- Thai and English routes use `/th` and `/en`; Thai is the default redirect target
- Night palette: `#090D1F`, `#172554`, `#C4B5FD`, and `#F6C85F`
- Autumn palette: `#FFF7E8`, `#C65D32`, and `#E9A23B`
- Fonts: Sora for Latin/display and Noto Sans Thai for Thai UI/body
- No footer and no login control in the Floating Navbar
- Home, Portfolio, and Commission composite layouts must not import each other
- Hero selects one enabled image on page open or refresh and keeps it stable for the visit
- Featured work advances automatically; it pauses for hover, focus, hidden tab, and reduced motion
- Public grids use optimized derivatives, responsive sizes, reserved aspect ratios, and lazy loading below the fold
- One-image lightbox has no previous/next navigation and closes with X, Escape, or backdrop
- No Worker-side image conversion or video transcoding
- Phase 1 Store, Review, and Share controls remain hidden rather than linking to incomplete pages

---

## File structure

```text
src/
  app/
    globals.css
    layout.tsx
    page.tsx
    [locale]/
      layout.tsx
      page.tsx
      portfolio/page.tsx
      commission/page.tsx
      queue/page.tsx
      documents/page.tsx
      documents/[slug]/page.tsx
      about/page.tsx
  shared/
    components/
      public-shell/
      primitives/
      media/
    i18n/
    theme/
    types/
  data/
    public-content-repository.ts
    fixture-public-content-repository.ts
    fixtures/
  features/
    home/
    portfolio/
    commission/
    queue/
    documents/
    about/
tests/
  unit/
  components/
  e2e/
public/
  fixtures/
```

Each component and stylesheet stays in the feature or shell folder that owns its behavior. Shared primitives may expose Button, Badge, Dialog, IconButton, MediaFrame, and visually-hidden text; they may not own page grids or composite cards.

---

### Task 1: Project foundation and quality gates

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `open-next.config.ts`
- Create: `wrangler.jsonc`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `build`, `preview`, and `deploy`
- Produces: `@/*` alias mapped to `src/*`

- [ ] **Step 1: Initialize version control and npm metadata**

Run:

```powershell
git init
npm init -y
```

Expected: `.git/` and `package.json` exist without altering specification files.

- [ ] **Step 2: Install runtime, test, and Cloudflare packages**

Run:

```powershell
npm install next@latest react@latest react-dom@latest zod clsx lucide-react
npm install --save-dev typescript @types/node @types/react @types/react-dom eslint eslint-config-next vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @opennextjs/cloudflare@latest wrangler@latest
```

Expected: `package-lock.json` pins the resolved dependency graph.

- [ ] **Step 3: Write the failing toolchain smoke test**

Create `tests/unit/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("project toolchain", () => {
  it("runs TypeScript tests", () => {
    expect(true).toBe(true);
  });
});
```

Run: `npm test`

Expected: FAIL because the `test` script and Vitest configuration do not exist.

- [ ] **Step 4: Configure strict TypeScript, Next.js, Vitest, Playwright, and scripts**

Set `package.json` scripts to:

```json
{
  "dev": "next dev",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "build": "next build",
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
}
```

Configure Vitest with `jsdom`, `@/*` alias, and `vitest.setup.ts` importing `@testing-library/jest-dom/vitest`. Configure Playwright to start `npm run dev` on `http://127.0.0.1:3000`. Configure `wrangler.jsonc` with `compatibility_date: "2026-08-05"`, `nodejs_compat`, `.open-next/worker.js`, and `.open-next/assets`. Configure `open-next.config.ts` with `defineCloudflareConfig()`.

Create root layout metadata title `Nasora` and root page redirect:

```ts
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/th");
}
```

- [ ] **Step 5: Verify and commit the foundation**

Run:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0 and `/` redirects to `/th`.

Commit:

```powershell
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts vitest.setup.ts playwright.config.ts open-next.config.ts wrangler.jsonc .gitignore .env.example src tests
git commit -m "chore: initialize Nasora web application"
```

---

### Task 2: Locale routing, design tokens, themes, and public shell

**Files:**
- Create: `src/shared/i18n/locales.ts`
- Create: `src/shared/i18n/dictionaries.ts`
- Create: `src/shared/theme/theme.ts`
- Create: `src/shared/theme/theme-script.tsx`
- Create: `src/shared/components/public-shell/public-shell.tsx`
- Create: `src/shared/components/public-shell/floating-navbar.tsx`
- Create: `src/shared/components/public-shell/sidebar.tsx`
- Create: `src/shared/components/public-shell/account-button.tsx`
- Create: `src/shared/components/public-shell/public-shell.module.css`
- Create: `src/shared/components/primitives/icon-button.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/[locale]/layout.tsx`
- Test: `tests/unit/theme.test.ts`
- Test: `tests/components/public-shell.test.tsx`

**Interfaces:**
- Produces: `type Locale = "th" | "en"`
- Produces: `resolveAutomaticTheme(hour: number): "night" | "autumn"`
- Produces: `PublicShellProps { locale: Locale; children: ReactNode; search: SearchConfig }`
- Produces: `SearchConfig { label: string; action: string; queryName: "q" }`

- [ ] **Step 1: Write failing theme and shell tests**

Test these behaviors:

```ts
expect(resolveAutomaticTheme(21)).toBe("night");
expect(resolveAutomaticTheme(11)).toBe("autumn");
```

Render `PublicShell` and assert that it contains NASORA, menu button, page-scoped search, OPEN state, Queue, TH/EN, theme control, account button, and no footer or navbar login.

Run: `npm test -- tests/unit/theme.test.ts tests/components/public-shell.test.tsx`

Expected: FAIL because the modules do not exist.

- [ ] **Step 2: Implement locale validation and automatic theme resolution**

Implement:

```ts
export const locales = ["th", "en"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function resolveAutomaticTheme(hour: number) {
  return hour >= 7 && hour < 18 ? "autumn" : "night";
}
```

The pre-hydration theme script reads `nasora-theme`; absent an override, it uses local time. Manual selection persists to localStorage. Invalid locale segments call `notFound()`.

- [ ] **Step 3: Implement tokens and ambient layers**

Define CSS custom properties for both approved palettes, typography, spacing, radii, elevation, focus rings, and z-index layers. Implement star and leaf ambient layers as CSS-only decoration at this stage. Apply `pointer-events: none`, pause animations when `document.hidden`, and disable nonessential animation under `prefers-reduced-motion: reduce`.

- [ ] **Step 4: Implement the shell without composite page layouts**

`FloatingNavbar` receives only search configuration and availability. `Sidebar` owns its overlay, focus trap, Escape close, and slide animation. `AccountButton` opens a clearly labeled non-submitting authentication preview panel until Stage 2 connects Supabase. The shell renders no footer.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test -- tests/unit/theme.test.ts tests/components/public-shell.test.tsx
npm run lint
npm run typecheck
```

Expected: all commands exit 0.

Commit:

```powershell
git add src/app src/shared tests/unit/theme.test.ts tests/components/public-shell.test.tsx
git commit -m "feat: add locale-aware public shell and themes"
```

---

### Task 3: Typed public content repository and fixture media

**Files:**
- Create: `src/shared/types/public-content.ts`
- Create: `src/data/public-content-repository.ts`
- Create: `src/data/fixture-public-content-repository.ts`
- Create: `src/data/fixtures/public-content.ts`
- Create: `src/shared/components/media/responsive-media.tsx`
- Create: `src/shared/components/media/media-frame.module.css`
- Create: `public/fixtures/README.md`
- Test: `tests/unit/fixture-public-content-repository.test.ts`

**Interfaces:**
- Produces: `PublicMedia`, `HeroItem`, `FeaturedItem`, `PortfolioItem`, `ServiceCategory`, `ServiceType`, `PublicQueueItem`, `DocumentSummary`
- Produces: `PublicContentRepository` with page-scoped read methods
- Produces: `getPublicContentRepository(): PublicContentRepository`

- [ ] **Step 1: Write failing repository contract tests**

Assert that the fixture repository returns at least two enabled Hero items, featured items ordered by `displayOrder`, five initial service categories, queue rows without private identifiers, and published documents only.

Run: `npm test -- tests/unit/fixture-public-content-repository.test.ts`

Expected: FAIL because the repository is missing.

- [ ] **Step 2: Define exact public content types**

Use discriminated media types:

```ts
export type PublicMedia = {
  id: string;
  kind: "image" | "video";
  alt: Record<"th" | "en", string>;
  thumbnailSrc: string;
  cardSrc: string;
  detailSrc: string;
  width: number;
  height: number;
  posterSrc?: string;
};
```

Every layout-specific item stores its own crop and display metadata; no `PortfolioItem` is reused as a Home or Commission placement.

- [ ] **Step 3: Define repository methods**

```ts
export interface PublicContentRepository {
  getHome(locale: Locale): Promise<{ hero: HeroItem[]; featured: FeaturedItem[] }>;
  getPortfolio(locale: Locale, query?: string, category?: string): Promise<PortfolioItem[]>;
  getServiceCategories(locale: Locale): Promise<ServiceCategory[]>;
  getServiceCategory(locale: Locale, slug: string): Promise<{ category: ServiceCategory; types: ServiceType[] } | null>;
  getQueue(locale: Locale, query?: string): Promise<PublicQueueItem[]>;
  getDocuments(locale: Locale, query?: string): Promise<DocumentSummary[]>;
  getDocument(locale: Locale, slug: string): Promise<DocumentSummary | null>;
}
```

- [ ] **Step 4: Implement fixtures and responsive media**

Create bilingual fixture records corresponding to the approved mockups. `ResponsiveMedia` reserves aspect ratio, uses `sizes`, sets `loading="lazy"` except explicit priority media, uses a poster and `preload="none"` for video, and never requests an original asset for a grid.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test -- tests/unit/fixture-public-content-repository.test.ts
npm run typecheck
```

Expected: PASS with no private queue fields in the exported type.

Commit:

```powershell
git add src/data src/shared/types src/shared/components/media public/fixtures tests/unit/fixture-public-content-repository.test.ts
git commit -m "feat: add typed public content repository"
```

---

### Task 4: Home Hero, featured carousel, and Quick Info

**Files:**
- Create: `src/features/home/components/home-page.tsx`
- Create: `src/features/home/components/home-hero.tsx`
- Create: `src/features/home/components/featured-carousel.tsx`
- Create: `src/features/home/components/quick-info-panel.tsx`
- Create: `src/features/home/components/home.module.css`
- Create: `src/features/home/lib/select-hero.ts`
- Modify: `src/app/[locale]/page.tsx`
- Test: `tests/unit/select-hero.test.ts`
- Test: `tests/components/featured-carousel.test.tsx`
- Test: `tests/components/home-page.test.tsx`

**Interfaces:**
- Produces: `selectHero(items: HeroItem[], randomValue: number): HeroItem`
- Produces: `FeaturedCarouselProps { items: FeaturedItem[]; intervalMs?: number }`

- [ ] **Step 1: Write failing Hero and carousel tests**

Cover empty Hero rejection, deterministic selection from an injected random value, stable selection across rerenders, automatic featured advance, previous/next control, pause on hover/focus, and no autoplay under reduced motion.

Use fake timers:

```ts
vi.useFakeTimers();
render(<FeaturedCarousel items={items} intervalMs={7000} />);
act(() => vi.advanceTimersByTime(7000));
expect(screen.getByLabelText("2 / 4")).toBeVisible();
```

Run: `npm test -- tests/unit/select-hero.test.ts tests/components/featured-carousel.test.tsx tests/components/home-page.test.tsx`

Expected: FAIL because Home components do not exist.

- [ ] **Step 2: Implement stable per-visit Hero selection**

Select once in a client boundary using a lazy state initializer. Do not change the selection on an interval. Render the first fixture Hero as the server fallback with identical dimensions so hydration cannot move layout. Preload only the displayed LCP candidate.

- [ ] **Step 3: Implement the featured carousel**

Default interval is `7000`. Pause on pointer enter, focus within, manual navigation, and `visibilitychange`; resume only when the pause reason clears. Announce the current position without announcing every automatic movement to screen readers.

- [ ] **Step 4: Implement Home composition and Quick Info**

Build Hero copy/CTA, featured carousel, and Home-only About/Queue/Terms/Contact tabs. Keep the composition inside `features/home`; do not import portfolio or commission components.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test -- tests/unit/select-hero.test.ts tests/components/featured-carousel.test.tsx tests/components/home-page.test.tsx
npm run lint
npm run typecheck
```

Expected: PASS, including stable Hero and carousel pause tests.

Commit:

```powershell
git add src/app/[locale]/page.tsx src/features/home tests/unit/select-hero.test.ts tests/components/featured-carousel.test.tsx tests/components/home-page.test.tsx
git commit -m "feat: build Nasora home experience"
```

---

### Task 5: Independent Portfolio gallery and one-image lightbox

**Files:**
- Create: `src/features/portfolio/components/portfolio-page.tsx`
- Create: `src/features/portfolio/components/portfolio-gallery.tsx`
- Create: `src/features/portfolio/components/image-lightbox.tsx`
- Create: `src/features/portfolio/components/portfolio.module.css`
- Create: `src/app/[locale]/portfolio/page.tsx`
- Test: `tests/components/portfolio-gallery.test.tsx`
- Test: `tests/components/image-lightbox.test.tsx`

**Interfaces:**
- Produces: `PortfolioGalleryProps { items: PortfolioItem[] }`
- Produces: `ImageLightboxProps { item: PortfolioItem | null; onClose(): void }`

- [ ] **Step 1: Write failing Portfolio tests**

Assert page-scoped filtering, image click opening one asset, absence of previous/next controls, X/Escape/backdrop closure, focus restoration, and body scroll lock.

Run: `npm test -- tests/components/portfolio-gallery.test.tsx tests/components/image-lightbox.test.tsx`

Expected: FAIL because Portfolio modules do not exist.

- [ ] **Step 2: Implement the page-specific masonry/grid layout**

Use CSS grid with independently controlled item spans from `PortfolioItem`. Keep overlay metadata minimal and provide category filters plus newest/featured sorting.

- [ ] **Step 3: Implement accessible one-image lightbox**

Render one selected image with `role="dialog"`, `aria-modal="true"`, a visible close control, Escape listener, and backdrop close only when the pointer target is the backdrop. Do not add arrows, swipe navigation, or hidden carousel state.

- [ ] **Step 4: Connect route and scoped search**

Read `q` and `category` search params on the server page, pass them to `getPortfolio`, and configure the navbar search action as `/${locale}/portfolio`.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test -- tests/components/portfolio-gallery.test.tsx tests/components/image-lightbox.test.tsx
npm run typecheck
```

Expected: PASS and no Home/Commission imports under `features/portfolio`.

Commit:

```powershell
git add src/app/[locale]/portfolio src/features/portfolio tests/components/portfolio-gallery.test.tsx tests/components/image-lightbox.test.tsx
git commit -m "feat: add independent portfolio gallery"
```

---

### Task 6: Commission albums, subtype cards, and service details

Execute the approved focused plan in `docs/superpowers/plans/2026-08-06-commission-in-page-albums-and-cta-labels.md` for this task; it preserves this task's detail and pricing requirements while replacing category-route navigation with same-URL in-page album browsing.

**Files:**
- Create: `src/features/commission/components/commission-albums-page.tsx`
- Create: `src/features/commission/components/album-tile.tsx`
- Create: `src/features/commission/components/service-category-page.tsx`
- Create: `src/features/commission/components/service-card.tsx`
- Create: `src/features/commission/components/service-detail-dialog.tsx`
- Create: `src/features/commission/components/commission.module.css`
- Create: `src/app/[locale]/commission/page.tsx`
- Test: `tests/components/commission-albums.test.tsx`
- Test: `tests/components/service-detail-dialog.test.tsx`

**Interfaces:**
- Produces: `AlbumTileProps { category: ServiceCategory }`
- Produces: `ServiceDetailDialogProps { service: ServiceType; open: boolean; onClose(): void }`

- [ ] **Step 1: Write failing album and detail tests**

Assert that album tiles show cover, title, count, availability/recommended badge, and do not show prices or request actions. Assert that selecting an album swaps the overview for its subtype cards without changing the Commission URL and that the visitor can return to the overview. Assert subtype cards show reference price and exactly two localized actions: `ประเมินราคา` / `Request Estimate` and `ดูรายละเอียดและเรทราคา` / `View Details & Rates`, without the service name appended. Assert closed services disable request action. Assert detail dialog separates Personal/Commercial, Rush, additions, timing, four standard revisions, document link, samples, and final-price guidance.

Run: `npm test -- tests/components/commission-albums.test.tsx tests/components/service-detail-dialog.test.tsx`

Expected: FAIL because Commission components do not exist.

- [ ] **Step 2: Implement reference-style album tiles**

Use a cover image filling the tile, dark bottom gradient, title at bottom-left, count pill at bottom-right, optional recommendation at top-left, and availability state. Responsive grid uses four columns on wide desktop, three on standard desktop, two on tablet, and one on narrow mobile.

- [ ] **Step 3: Implement subtype browsing and details**

Keep the album overview and selected-album view inside `CommissionAlbumsPage`. Selecting a tile updates component state and renders subtype filter controls and service cards in the same page without route navigation or URL mutation; provide a visible back-to-albums control. Each card reads its two fixed labels from shared locale messages and never interpolates the service name. Service details use a large dialog with independently scrollable body and sticky actions. Prices remain typed THB integers with formatted display-only USD strings from fixture data.

- [ ] **Step 4: Connect routes and the non-submitting request preview**

Missing or unpublished album data falls back to the category overview with a non-blocking unavailable message. The request button opens a Stage 1 informational panel stating that the interactive estimate form arrives in Stage 2; it must not submit or collect data.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test -- tests/components/commission-albums.test.tsx tests/components/service-detail-dialog.test.tsx
npm run lint
npm run typecheck
```

Expected: PASS with album overview free of service-level pricing.

Commit:

```powershell
git add src/app/[locale]/commission src/features/commission tests/components/commission-albums.test.tsx tests/components/service-detail-dialog.test.tsx
git commit -m "feat: build commission album experience"
```

---

### Task 7: Public Queue, Document Center, and About/Contact

**Files:**
- Create: `src/features/queue/components/queue-page.tsx`
- Create: `src/features/queue/components/queue-table.tsx`
- Create: `src/features/queue/components/queue.module.css`
- Create: `src/features/documents/components/document-center-page.tsx`
- Create: `src/features/documents/components/document-reader.tsx`
- Create: `src/features/documents/components/documents.module.css`
- Create: `src/features/about/components/about-page.tsx`
- Create: `src/app/[locale]/queue/page.tsx`
- Create: `src/app/[locale]/documents/page.tsx`
- Create: `src/app/[locale]/documents/[slug]/page.tsx`
- Create: `src/app/[locale]/about/page.tsx`
- Test: `tests/components/queue-table.test.tsx`
- Test: `tests/components/document-center.test.tsx`

**Interfaces:**
- Consumes: `PublicQueueItem` containing only `position`, `displayName`, `serviceName`, `statusLabel`, and `deadlineLabel`
- Produces: `DocumentReaderProps { document: DocumentSummary; mode: "route" | "dialog" }`

- [ ] **Step 1: Write failing Queue and Document tests**

Assert queue columns and safe data, member nickname/Guest alias rendering, no clickable private row, page-scoped queue search, pinned document ordering, category filters, TH/EN labels, direct document route, and readable document dialog behavior.

Run: `npm test -- tests/components/queue-table.test.tsx tests/components/document-center.test.tsx`

Expected: FAIL because the features do not exist.

- [ ] **Step 2: Implement responsive Queue**

Render the approved desktop table and convert each row to a compact record on narrow screens without hiding display name, status, service, or deadline. Status always uses text plus color. Rows do not link to job details.

- [ ] **Step 3: Implement Document Center and reader**

Provide announcement, pinned/official summary, category controls, scoped search, and direct URLs. The reader uses a legible opaque surface and route-aware close behavior. Reading remains optional and does not alter request state.

- [ ] **Step 4: Implement About/Contact**

Render editable fixture biography and public contact channels with Discord first. Reuse only low-level shell/primitives, not Home Quick Info composition.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test -- tests/components/queue-table.test.tsx tests/components/document-center.test.tsx
npm run typecheck
```

Expected: PASS with no private queue property available to the UI.

Commit:

```powershell
git add src/app/[locale]/queue src/app/[locale]/documents src/app/[locale]/about src/features/queue src/features/documents src/features/about tests/components/queue-table.test.tsx tests/components/document-center.test.tsx
git commit -m "feat: add public queue documents and contact"
```

---

### Task 8: Responsive, accessibility, visual regression, and Cloudflare preview gate

**Files:**
- Create: `tests/e2e/public-pages.spec.ts`
- Create: `tests/e2e/theme-and-navigation.spec.ts`
- Create: `tests/e2e/lightbox.spec.ts`
- Create: `tests/e2e/visual-regression.spec.ts`
- Create: `docs/testing/public-preview-checklist.md`
- Modify: affected feature CSS modules only where tests reveal defects

**Interfaces:**
- Consumes: all Stage 1 public routes
- Produces: stable Desktop 1440×900 and Mobile 390×844 screenshot baselines

- [ ] **Step 1: Write failing end-to-end journeys**

Cover:

```ts
test("visitor can browse the public commission journey", async ({ page }) => {
  await page.goto("/th");
  await page.getByRole("link", { name: /คอมมิชชัน/ }).click();
  const commissionUrl = page.url();
  await page.getByRole("button", { name: /ILLUSTRATION/ }).click();
  await expect(page).toHaveURL(commissionUrl);
  await page.getByRole("button", { name: "ดูรายละเอียดและเรทราคา" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
```

Also cover Sidebar focus/close, locale switch, manual theme persistence, queue visibility, document direct route, Portfolio lightbox closure, and absence of footer/navbar login.

Run: `npm run test:e2e`

Expected: FAIL until all routes and responsive states are aligned.

- [ ] **Step 2: Add visual baselines and layout-isolation checks**

Capture Home, Portfolio, Commission Albums, Queue, Documents, and service details at Desktop and Mobile viewports. Keep separate snapshots per route. Add an import-boundary test that fails when Home imports from Portfolio/Commission composite component paths or vice versa.

- [ ] **Step 3: Fix only evidence-backed responsive and accessibility defects**

Resolve failures in the owning feature stylesheet. Verify visible focus, no keyboard trap, no horizontal overflow, 44px minimum interactive targets on mobile, preserved aspect ratios, and non-color status labels.

- [ ] **Step 4: Run the complete local and Cloudflare preview gate**

Run:

```powershell
npm test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
npm run preview
```

Expected: automated commands pass; OpenNext builds successfully; the preview serves `/th`, `/en`, and all public routes without unsupported runtime errors.

- [ ] **Step 5: Document review checkpoint and commit**

Create `docs/testing/public-preview-checklist.md` containing exact URLs and checks for the ten approved mockup screens, Night/Autumn switching, Desktop/Mobile layouts, Hero stability, featured autoplay pause, album tile appearance, and one-image lightbox behavior.

Commit:

```powershell
git add tests/e2e docs/testing src
git commit -m "test: validate Nasora public preview"
```

Stop after this commit and present the running public preview for user review before starting Stage 2.

---

## Plan self-review result

- Spec coverage: Stage 1 covers every public page, global shell, approved Home/album revisions, themes, media behavior, layout isolation, responsive behavior, and the public portions of `ACCEPTANCE_CRITERIA.md`
- Deferred by explicit stage boundary: real authentication, profile editing, Member/Guest estimate form, Supabase persistence, payments, messages, member workspace, and admin operations begin in Stages 2–4 of the roadmap
- Incomplete-work scan: Stage 1 uses fixture content intentionally behind a defined repository interface; no production form accepts or stores data before Stage 2
- Type consistency: all page tasks consume the types and repository contract established in Task 3
- Platform consistency: public pages remain static/ISR-compatible; OpenNext preview is required before the stage checkpoint

## Implementation references

- Next.js App Router and installation: https://nextjs.org/docs/app/getting-started/installation
- Cloudflare Next.js/OpenNext guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- OpenNext Cloudflare adapter: https://opennext.js.org/cloudflare
- Supabase server-side Auth for Stage 2: https://supabase.com/docs/guides/auth/server-side
