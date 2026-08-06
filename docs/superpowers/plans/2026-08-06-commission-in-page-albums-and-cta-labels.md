# Commission In-Page Albums and Shared CTA Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Commission album interaction so selecting an album reveals its service cards on the same locale Commission URL, with fixed bilingual estimate and detail action labels.

**Architecture:** Execute this plan after Tasks 1–5 of `2026-08-05-nasora-foundation-public.md`. A client-side `CommissionAlbumsPage` owns selected-album state and swaps between the album overview and service collection without route navigation. Shared locale dictionaries own CTA copy, while service records own titles and availability but never custom CTA text.

**Tech Stack:** Node.js 20.9+, npm, Next.js App Router, React, TypeScript strict mode, CSS Modules, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve all previously approved Nasora scope, architecture, themes, page boundaries, account flows, administrator tools, and later implementation stages.
- Keep visitors on `/{locale}/commission` while selecting and closing albums; do not create or navigate to `/{locale}/commission/[category]`.
- Thai actions are exactly `ประเมินราคา` and `ดูรายละเอียดและเรทราคา`.
- English actions are exactly `Request Estimate` and `View Details & Rates`.
- Never append, interpolate, or repeat a service name in either action label.
- Category overview tiles do not show service-level prices or request actions.
- Closed services keep the detail action enabled and disable the estimate action.
- Respect `prefers-reduced-motion`; motion is optional and never required to understand state.
- `E:/NasoraStudio/img/` is user-owned local upload-test material. Do not delete, rename, transform, stage, or commit it. Automated tests must use committed purpose-built fixtures instead.

---

### Task 1: Add Typed Commission Messages

**Files:**
- Modify: `src/shared/i18n/dictionaries.ts`
- Test: `tests/unit/dictionaries.test.ts`

**Interfaces:**
- Produces: `CommissionMessages { estimate: string; detailsAndRates: string; backToAlbums: string; albumUnavailable: string; estimatePreview: string; closeEstimate: string; closeDetails: string }`
- Produces: `getDictionary(locale: Locale): { commission: CommissionMessages; ... }`

- [ ] **Step 1: Write the failing dictionary test**

```ts
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/shared/i18n/dictionaries";

describe("commission messages", () => {
  it("uses the approved Thai CTA labels", () => {
    expect(getDictionary("th").commission).toMatchObject({
      estimate: "ประเมินราคา",
      detailsAndRates: "ดูรายละเอียดและเรทราคา",
    });
  });

  it("uses the approved English CTA labels", () => {
    expect(getDictionary("en").commission).toMatchObject({
      estimate: "Request Estimate",
      detailsAndRates: "View Details & Rates",
    });
  });
});
```

- [ ] **Step 2: Run the test and verify the new messages are missing**

Run: `npm test -- tests/unit/dictionaries.test.ts`

Expected: FAIL because `commission.estimate` and `commission.detailsAndRates` do not exist.

- [ ] **Step 3: Add the typed dictionary section**

```ts
export type CommissionMessages = {
  estimate: string;
  detailsAndRates: string;
  backToAlbums: string;
  albumUnavailable: string;
  estimatePreview: string;
  closeEstimate: string;
  closeDetails: string;
};

const commissionMessages: Record<Locale, CommissionMessages> = {
  th: {
    estimate: "ประเมินราคา",
    detailsAndRates: "ดูรายละเอียดและเรทราคา",
    backToAlbums: "กลับไปดูทุกอัลบั้ม",
    albumUnavailable: "อัลบั้มนี้ยังไม่พร้อมแสดงผล",
    estimatePreview: "แบบฟอร์มประเมินราคาจะเปิดใช้งานในขั้นถัดไป",
    closeEstimate: "ปิด",
    closeDetails: "ปิดรายละเอียด",
  },
  en: {
    estimate: "Request Estimate",
    detailsAndRates: "View Details & Rates",
    backToAlbums: "Back to all albums",
    albumUnavailable: "This album is not available yet",
    estimatePreview: "The estimate form will be enabled in the next stage",
    closeEstimate: "Close",
    closeDetails: "Close details",
  },
};
```

Return `commission: commissionMessages[locale]` from `getDictionary` without changing existing dictionary sections.

- [ ] **Step 4: Run the dictionary test**

Run: `npm test -- tests/unit/dictionaries.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the message contract**

```powershell
git add src/shared/i18n/dictionaries.ts tests/unit/dictionaries.test.ts
git commit -m "feat: add shared commission action labels"
```

---

### Task 2: Render Album Services In Place

**Files:**
- Create: `src/features/commission/components/commission-albums-page.tsx`
- Create: `src/features/commission/components/album-tile.tsx`
- Create: `src/features/commission/components/service-card.tsx`
- Create: `src/features/commission/components/commission.module.css`
- Modify: `src/app/[locale]/commission/page.tsx`
- Test: `tests/components/commission-albums.test.tsx`
- Create: `tests/fixtures/commission-albums.ts`

**Interfaces:**
- Consumes: `Locale`, `CommissionMessages`, `ServiceCategory`, `ServiceType`, `ResponsiveMedia`
- Produces: `CommissionAlbum { category: ServiceCategory; services: ServiceType[] }`
- Produces: `CommissionAlbumsPageProps { albums: CommissionAlbum[]; messages: CommissionMessages }`
- Produces: `AlbumTileProps { category: ServiceCategory; onSelect(): void }`
- Produces: `ServiceCardProps { service: ServiceType; messages: CommissionMessages; onEstimate(): void; onViewDetails(trigger: HTMLButtonElement): void }`

- [ ] **Step 1: Write failing interaction and copy tests**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommissionAlbumsPage } from "@/features/commission/components/commission-albums-page";
import { commissionAlbumFixtures } from "../fixtures/commission-albums";
import { getDictionary } from "@/shared/i18n/dictionaries";

describe("CommissionAlbumsPage", () => {
  it("opens and closes an album without navigation", () => {
    history.replaceState(null, "", "/th/commission");
    render(
      <CommissionAlbumsPage
        albums={commissionAlbumFixtures}
        messages={getDictionary("th").commission}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Chibi/ }));
    expect(location.pathname).toBe("/th/commission");
    expect(screen.getByText("Chibi Bust")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "กลับไปดูทุกอัลบั้ม" }));
    expect(screen.getByRole("button", { name: /Chibi/ })).toBeVisible();
  });

  it("uses shared labels without repeating the service name", () => {
    render(
      <CommissionAlbumsPage
        albums={commissionAlbumFixtures}
        messages={getDictionary("th").commission}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Chibi/ }));

    expect(screen.getAllByRole("button", { name: "ประเมินราคา" })).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "ดูรายละเอียดและเรทราคา" })).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /ประเมินราคา Chibi/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ดูรายละเอียด.*Chibi/ })).not.toBeInTheDocument();
  });
});
```

Create `tests/fixtures/commission-albums.ts` with one open `Chibi Bust` service and one closed `Chibi Full Body` service using the exact `ServiceCategory` and `ServiceType` types established by Foundation Task 3.

- [ ] **Step 2: Run the component test and verify it fails**

Run: `npm test -- tests/components/commission-albums.test.tsx`

Expected: FAIL because `CommissionAlbumsPage`, `AlbumTile`, and `ServiceCard` do not exist.

- [ ] **Step 3: Implement accessible album selection state**

```tsx
"use client";

export function CommissionAlbumsPage({
  albums,
  messages,
}: CommissionAlbumsPageProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [estimateService, setEstimateService] = useState<ServiceType | null>(null);
  const selected = albums.find(({ category }) => category.slug === selectedSlug);

  if (!selectedSlug) {
    return (
      <section aria-label="Commission albums" className={styles.albumGrid}>
        {albums.map(({ category }) => (
          <AlbumTile
            key={category.id}
            category={category}
            onSelect={() => setSelectedSlug(category.slug)}
          />
        ))}
      </section>
    );
  }

  if (!selected) {
    return (
      <section aria-live="polite">
        <p>{messages.albumUnavailable}</p>
        <button type="button" onClick={() => setSelectedSlug(null)}>
          {messages.backToAlbums}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby={`album-${selected.category.id}`} className={styles.albumView}>
      <button type="button" onClick={() => setSelectedSlug(null)}>
        {messages.backToAlbums}
      </button>
      <h2 id={`album-${selected.category.id}`}>{selected.category.title}</h2>
      <div className={styles.serviceGrid}>
        {selected.services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            messages={messages}
            onEstimate={() => setEstimateService(service)}
            onViewDetails={() => undefined}
          />
        ))}
      </div>
      {estimateService ? (
        <aside role="status" className={styles.estimatePreview}>
          <strong>{estimateService.title}</strong>
          <p>{messages.estimatePreview}</p>
          <button type="button" onClick={() => setEstimateService(null)}>
            {messages.closeEstimate}
          </button>
        </aside>
      ) : null}
    </section>
  );
}
```

`AlbumTile` must render a native `<button type="button">` containing the cover, title, count, recommendation badge, and availability state. It must not render a link, price, or request action.

- [ ] **Step 4: Implement fixed service actions and closed state**

```tsx
export function ServiceCard({
  service,
  messages,
  onEstimate,
  onViewDetails,
}: ServiceCardProps) {
  const isClosed = service.availability === "closed";

  return (
    <article className={styles.serviceCard}>
      <ResponsiveMedia media={service.cover} />
      <h3>{service.title}</h3>
      <p>{service.referencePriceLabel}</p>
      <button type="button" disabled={isClosed} onClick={onEstimate}>
        {messages.estimate}
      </button>
      <button type="button" onClick={(event) => onViewDetails(event.currentTarget)}>
        {messages.detailsAndRates}
      </button>
    </article>
  );
}
```

Do not build labels with template strings. Add a short opacity/transform transition only inside `@media (prefers-reduced-motion: no-preference)`; the default rendering must work without animation.

- [ ] **Step 5: Connect the locale Commission page**

The server page loads all categories and their services through `PublicContentRepository`, gets the locale messages, and passes serializable props to the client component:

```tsx
import { CommissionAlbumsPage } from "@/features/commission/components/commission-albums-page";
import { getPublicContentRepository } from "@/data/public-content-repository";
import { getDictionary } from "@/shared/i18n/dictionaries";
import type { Locale } from "@/shared/i18n/locales";

export default async function CommissionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const repository = getPublicContentRepository();
  const categories = await repository.getServiceCategories(locale);
  const records = await Promise.all(
    categories.map((category) => repository.getServiceCategory(locale, category.slug)),
  );
  const albums = records.filter((record) => record !== null);

  return (
    <CommissionAlbumsPage
      albums={albums}
      messages={getDictionary(locale).commission}
    />
  );
}
```

Keep the pathname `/${locale}/commission`; do not call `router.push`, `history.pushState`, or render category links. Render the Stage 1 estimate preview from `estimateService` inside the client component, without submitting or collecting data.

- [ ] **Step 6: Run component, type, and lint checks**

Run:

```powershell
npm test -- tests/unit/dictionaries.test.ts tests/components/commission-albums.test.tsx
npm run typecheck
npm run lint
```

Expected: all commands PASS.

- [ ] **Step 7: Commit the in-page album experience**

```powershell
git add src/app/[locale]/commission/page.tsx src/features/commission tests/components/commission-albums.test.tsx tests/fixtures/commission-albums.ts
git commit -m "feat: browse commission albums in place"
```

---

### Task 3: Connect the Planned Detail Dialog and Add Browser Journey Coverage

**Files:**
- Modify: `src/features/commission/components/service-detail-dialog.tsx`
- Modify: `src/features/commission/components/commission-albums-page.tsx`
- Test: `tests/components/service-detail-dialog.test.tsx`
- Test: `tests/e2e/public-journey.spec.ts`
- Create: `docs/testing/commission-preview-checklist.md`

**Interfaces:**
- Consumes: `ServiceType`, `CommissionMessages`
- Consumes: the `ServiceDetailDialog` content sections and pricing behavior already required by Foundation Task 6
- Produces: `ServiceDetailDialogProps { service: ServiceType | null; messages: CommissionMessages; onClose(): void }`

- [ ] **Step 1: Write the failing detail and journey tests**

```tsx
it("opens details from the fixed Thai CTA", () => {
  renderCommissionPage("th");
  fireEvent.click(screen.getByRole("button", { name: /Chibi/ }));
  fireEvent.click(screen.getAllByRole("button", { name: "ดูรายละเอียดและเรทราคา" })[0]);
  expect(screen.getByRole("dialog", { name: /Chibi Bust/ })).toBeVisible();
});

it("keeps details available when estimates are closed", () => {
  renderClosedServiceCard();
  expect(screen.getByRole("button", { name: "ประเมินราคา" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "ดูรายละเอียดและเรทราคา" })).toBeEnabled();
});
```

```ts
test("visitor browses an album without leaving Commission", async ({ page }) => {
  await page.goto("/th/commission");
  const commissionUrl = page.url();
  await page.getByRole("button", { name: /Chibi/ }).click();
  await expect(page).toHaveURL(commissionUrl);
  await page.getByRole("button", { name: "ดูรายละเอียดและเรทราคา" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /ปิด/ }).click();
  await page.getByRole("button", { name: "กลับไปดูทุกอัลบั้ม" }).click();
  await expect(page).toHaveURL(commissionUrl);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```powershell
npm test -- tests/components/service-detail-dialog.test.tsx
npx playwright test tests/e2e/public-journey.spec.ts
```

Expected: FAIL because the detail dialog and complete journey are not connected.

- [ ] **Step 3: Implement dialog state and focus-safe close behavior**

Store the selected service and invoking button inside `CommissionAlbumsPage`:

```tsx
const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
const detailTriggerRef = useRef<HTMLButtonElement | null>(null);

function openDetails(service: ServiceType, trigger: HTMLButtonElement) {
  detailTriggerRef.current = trigger;
  setSelectedService(service);
}

function closeDetails() {
  setSelectedService(null);
  requestAnimationFrame(() => detailTriggerRef.current?.focus());
}

<ServiceCard
  service={service}
  messages={messages}
  onEstimate={() => setEstimateService(service)}
  onViewDetails={(trigger) => openDetails(service, trigger)}
/>
<ServiceDetailDialog
  service={selectedService}
  messages={messages}
  onClose={closeDetails}
/>
```

Keep the Foundation Task 6 pricing, additions, timing, document, example, and final-price guidance sections unchanged. Add this Escape lifecycle to its existing component:

```tsx
useEffect(() => {
  if (!service) return;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
  };
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, [service, onClose]);
```

On the existing dialog root, set `role="dialog"`, `aria-modal="true"`, and `aria-labelledby={`service-${service.id}`}`. Set the existing heading id to `service-${service.id}` and its close button text to `{messages.closeDetails}`. Do not change the content or pricing rules inside those existing detail sections; this task changes only how the in-page album view opens and closes the dialog.

- [ ] **Step 4: Document the preview checks and local upload assets**

Create `docs/testing/commission-preview-checklist.md` with these exact checks:

```markdown
- [ ] `/th/commission` and `/en/commission` show album overview tiles without prices or request CTAs.
- [ ] Selecting an album changes visible content without changing the URL.
- [ ] Back to all albums restores the overview without changing the URL.
- [ ] Thai cards show only `ประเมินราคา` and `ดูรายละเอียดและเรทราคา`.
- [ ] English cards show only `Request Estimate` and `View Details & Rates`.
- [ ] Closed services disable Estimate and keep Details enabled.
- [ ] Keyboard focus enters and returns from the service detail dialog correctly.
- [ ] Reduced-motion mode does not depend on album transition animation.
- [ ] Local files under `E:/NasoraStudio/img/` remain untracked and are reserved for manual upload testing in the later upload-management stage.
```

- [ ] **Step 5: Run the full public verification set**

Run:

```powershell
npm test
npm run typecheck
npm run lint
npx playwright test tests/e2e/public-journey.spec.ts
git status --short
```

Expected: tests, typecheck, lint, and Playwright PASS. `git status --short` may show only the user-owned untracked `img/` directory; it must not appear in the staged diff.

- [ ] **Step 6: Commit detail integration and verification docs**

```powershell
git add src/features/commission/components/service-detail-dialog.tsx src/features/commission/components/commission-albums-page.tsx tests/components/service-detail-dialog.test.tsx tests/e2e/public-journey.spec.ts docs/testing/commission-preview-checklist.md
git diff --cached --name-only
git commit -m "test: cover commission album journey"
```

Expected staged file list: only the five paths named above; no path under `img/`.

## Plan Self-Review Result

- Spec coverage: Tasks 1–3 cover exact bilingual labels, absence of service-name interpolation, same-URL album browsing, return-to-overview behavior, unavailable-album fallback, closed-service actions, detail dialog integration, reduced motion, and browser-level verification.
- Previous-plan compatibility: this plan begins after Foundation Tasks 1–5 and replaces only the earlier route-based category portion of Foundation Task 6; all other foundation and roadmap tasks remain unchanged.
- Upload-test assets: `E:/NasoraStudio/img/` remains local and untracked for the later upload-management stage; this Commission feature neither consumes nor mutates those files.
- Type consistency: `CommissionMessages`, `CommissionAlbum`, and component prop signatures are introduced once and consumed with the same names in later tasks.
- Placeholder scan: no incomplete implementation markers are present.
