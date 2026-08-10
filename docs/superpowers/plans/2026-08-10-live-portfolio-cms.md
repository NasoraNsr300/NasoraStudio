# Live Portfolio CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Admin Portfolio mockup and public Portfolio fixture with a Supabase-backed, R2-hosted single-image portfolio CMS and deterministic four-column dense layout.

**Architecture:** Portfolio owns its schema, repositories, routes, Admin UI, and public mapping. It references commission albums and reuses the private R2 signer/media metadata, but does not share page-specific components with Catalog or Documents.

**Tech Stack:** Next.js 16.3, React 19.2, TypeScript 6, Supabase/Postgres RLS and guarded RPCs, Cloudflare R2, Zod 4, Vitest.

## Global Constraints

- One image and localized title per item; no description, video, or carousel.
- Categories reference active commission albums.
- Public gallery is four-column dense grid with deterministic ID-based variation.
- Title is hidden until hover or keyboard focus.
- Archive is reversible; public sees only published, non-archived rows.
- No fixture fallback, deploy, push, or merge.
- Use RED-GREEN-REFACTOR for every production behavior.

---

### Task 1: Portfolio schema, RLS, and mutations

**Files:**
- Create via CLI: timestamped `portfolio_cms.sql` under `supabase/migrations`
- Create: `src/features/admin/portfolio/__tests__/portfolio-migration-contract.test.ts`

**Interfaces:**
- Consumes: `commission_albums`, `commission_catalog_media`, `private.is_admin()`, `audit_logs`.
- Produces: `portfolio_items`, `admin_save_portfolio_item(...)`, `admin_set_portfolio_item_archive(...)`.

- [ ] **Step 1: Generate migration name**

```powershell
npx supabase migration new portfolio_cms
```

Expected: one timestamped SQL file.

- [ ] **Step 2: Write failing contract test**

```ts
expect(sql).toMatch(/create table public\.portfolio_items/i);
expect(sql).toMatch(/album_id uuid not null references public\.commission_albums/i);
expect(sql).toMatch(/media_id uuid not null references public\.commission_catalog_media/i);
expect(sql).toMatch(/private\.is_admin\(\)/i);
expect(sql).toMatch(/insert into public\.audit_logs/i);
expect(sql).toMatch(/revoke execute[\s\S]+from public, anon, service_role/i);
```

- [ ] **Step 3: Run RED**

```powershell
npm test -- src/features/admin/portfolio/__tests__/portfolio-migration-contract.test.ts
```

Expected: FAIL because schema is missing.

- [ ] **Step 4: Implement minimal SQL**

Create `portfolio_items` with localized `title jsonb`, album/media FKs, `featured`, non-negative `display_order`, `published`, `archived_at`, actor/timestamps, indexes, and RLS. Public SELECT predicate must require the item and linked album to be published/non-archived. Mutation RPCs use `security definer set search_path = ''`, verify `private.is_admin()`, validate active references, lock on update, and audit atomically. Revoke defaults from `public, anon, service_role`; grant only authenticated.

- [ ] **Step 5: Run GREEN and commit**

```powershell
npm test -- src/features/admin/portfolio/__tests__/portfolio-migration-contract.test.ts
git add supabase/migrations src/features/admin/portfolio/__tests__
git commit -m "feat(portfolio): add portfolio cms schema"
```

---

### Task 2: Portfolio domain and repositories

**Files:**
- Create: `src/features/portfolio/domain/portfolio.ts`
- Create: `src/features/portfolio/data/public-portfolio-repository.server.ts`
- Create: `src/features/portfolio/data/__tests__/public-portfolio-repository.test.ts`
- Create: `src/features/admin/portfolio/data/admin-portfolio-repository.server.ts`
- Create: `src/features/admin/portfolio/data/__tests__/admin-portfolio-repository.test.ts`

**Interfaces:**
- Produces `PublicPortfolioItem`, `AdminPortfolioItem`, `listPublicPortfolio()`, `listAdminPortfolio()`, `getAdminPortfolioItem(id)`, `saveAdminPortfolioItem(input)`, `archiveAdminPortfolioItem(id, archived, reason)`.

- [ ] **Step 1: Write failing mapping tests**

```ts
expect(result[0]).toMatchObject({
  id: itemId,
  category: "illustration",
  media: { width: 1600, height: 900, detailSrc: `/api/portfolio/media/\${mediaId}` },
  title: { th: "à¹à¸ªà¸‡à¸”à¸²à¸§", en: "Starlight" },
});
```

Cover ordering, archived Admin rows, missing media, album joins, and RPC errors.

- [ ] **Step 2: Run RED**

```powershell
npm test -- src/features/portfolio/data src/features/admin/portfolio/data
```

Expected: FAIL because repositories do not exist.

- [ ] **Step 3: Implement strict row schemas and mapping**

Public query selects only needed columns and relies on RLS. Admin verifies the sole-admin session before reading all states. No raw Supabase row crosses into components.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm test -- src/features/portfolio/data src/features/admin/portfolio/data
git add src/features/portfolio src/features/admin/portfolio/data
git commit -m "feat(portfolio): add live repositories"
```

---

### Task 3: Admin mutation and media APIs

**Files:**
- Create: `src/features/admin/portfolio/api/portfolio-route.ts`
- Create: `src/app/api/admin/portfolio/items/route.ts`
- Create: `src/app/api/admin/portfolio/items/[itemId]/route.ts`
- Create: `src/app/api/admin/portfolio/items/[itemId]/archive/route.ts`
- Create: `src/app/api/admin/portfolio/media/route.ts`
- Create: `src/app/api/portfolio/media/[mediaId]/route.ts`
- Create tests beside each route group.
- Modify: `src/features/collaboration/storage/r2-private-assets.server.ts`

**Interfaces:**
- Save body: `{ albumId, title:{th,en}, mediaId, featured, displayOrder, published }`.
- Upload form: `file,width,height,altTh,altEn`; response `{ mediaId, src }`.

- [ ] **Step 1: Write failing route tests**

Cover exact same-origin, strict JSON, UUIDs, sole-admin denial, conflict mapping, revalidation, 5 MiB, magic bytes, R2 cleanup, and public 404 for unattached/private media.

- [ ] **Step 2: Run RED**

```powershell
npm test -- src/app/api/admin/portfolio src/app/api/portfolio
```

Expected: FAIL because routes are absent.

- [ ] **Step 3: Implement routes**

Keep Portfolio route helpers separate from Catalog. Allow `portfolio/{uuid}.{png|jpg|webp}` keys. Resolve public media only through a visible portfolio attachment before signing GET.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm test -- src/app/api/admin/portfolio src/app/api/portfolio
git add src/app/api/admin/portfolio src/app/api/portfolio src/features/admin/portfolio/api src/features/collaboration/storage/r2-private-assets.server.ts
git commit -m "feat(portfolio): add admin and media api"
```

---

### Task 4: Real Admin Portfolio UI

**Files:**
- Modify: `src/app/(admin)/admin/portfolio/page.tsx`
- Create: `src/app/(admin)/admin/portfolio/new/page.tsx`
- Create: `src/app/(admin)/admin/portfolio/[itemId]/page.tsx`
- Create: `src/features/admin/portfolio/components/admin-portfolio-page.tsx`
- Create: `src/features/admin/portfolio/components/admin-portfolio-page.module.css`
- Create: `src/features/admin/portfolio/components/admin-portfolio-editor.tsx`
- Create: `src/features/admin/portfolio/components/admin-portfolio-editor.module.css`
- Create component tests.
- Modify: `src/features/admin/components/admin-section-pages.tsx`

**Interfaces:**
- List receives `items: AdminPortfolioItem[]`.
- Editor receives active albums and optional existing item.

- [ ] **Step 1: Write failing UI tests**

Prove fixture paths disappear; Add/Edit navigation uses real IDs; search/status filters work; upload preview works; failed saves retain fields; archive/restore refreshes.

- [ ] **Step 2: Run RED**

```powershell
npm test -- src/features/admin/portfolio/components
```

Expected: FAIL against mock UI.

- [ ] **Step 3: Implement list/editor**

Preserve current header/toolbar/card proportions. Use dedicated routes. Use `createImageBitmap` for dimensions and the proven upload-before-save flow.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm test -- src/features/admin/portfolio/components
git add "src/app/(admin)/admin/portfolio" src/features/admin/portfolio/components src/features/admin/components/admin-section-pages.tsx
git commit -m "feat(admin): make portfolio editable"
```

---

### Task 5: Deterministic public dense gallery

**Files:**
- Modify: `src/app/[locale]/portfolio/page.tsx`
- Modify Portfolio gallery/page/lightbox/CSS files.
- Create: `src/features/portfolio/domain/portfolio-layout.ts`
- Create: `src/features/portfolio/domain/__tests__/portfolio-layout.test.ts`
- Create: `src/features/portfolio/__tests__/public-portfolio-route.test.tsx`

**Interfaces:**
- `getPortfolioPlacement(item): { columnSpan: 1|2; rowSpan: number }`.

- [ ] **Step 1: Write failing deterministic tests**

```ts
expect(getPortfolioPlacement(item)).toEqual(getPortfolioPlacement(item));
expect(getPortfolioPlacement(wide).columnSpan).toBe(2);
expect(getPortfolioPlacement(tall).columnSpan).toBe(1);
```

Also prove no fixture import, title overlay is hover/focus only, and lightbox remains one image.

- [ ] **Step 2: Run RED**

```powershell
npm test -- src/features/portfolio
```

Expected: FAIL until live repository/layout are wired.

- [ ] **Step 3: Implement gallery**

Use four grid columns, small fixed row unit, `grid-auto-flow:dense`, bounded spans, reserved dimensions, stable ID hash, and never `Math.random()`. Keep DOM reading order and existing close interactions.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm test -- src/features/portfolio
git add "src/app/[locale]/portfolio" src/features/portfolio
git commit -m "feat(portfolio): serve deterministic live gallery"
```

---

### Task 6: Apply and verify Portfolio

- [ ] **Step 1: Run focused and full verification**

```powershell
npm test -- src/features/admin/portfolio src/features/portfolio src/app/api/admin/portfolio src/app/api/portfolio
npm test -- --maxWorkers=2 --reporter=dot
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all exit 0.

- [ ] **Step 2: Discover CLI flags, dry-run, and push migration**

Run `npx supabase db push --help`; use its current dry-run option, then push. Verify local/remote migration histories match.

- [ ] **Step 3: Verify RLS and R2**

Anon sees only public rows; ordinary members cannot mutate; sole Admin can CRUD/archive. Upload one temporary valid image, resolve a signed GET, then delete it.

- [ ] **Step 4: Commit only verification fixes if needed**

```powershell
git add src/app/api/admin/portfolio src/app/api/portfolio "src/app/(admin)/admin/portfolio" "src/app/[locale]/portfolio" src/features/admin/portfolio src/features/portfolio src/features/collaboration/storage/r2-private-assets.server.ts supabase/migrations
git diff --cached --check
git commit -m "fix(portfolio): address integration verification"
```

Do not deploy, push the Git branch, or merge.

