# Commission Album Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace commission catalog fixtures with a Supabase-backed album, service, and price catalog editable from Admin and rendered by public Thai/English pages.

**Architecture:** Supabase is the sole catalog source. Guarded admin RPCs own mutations and audit logging; public RLS exposes only published, non-archived rows. Focused server repositories map database rows to existing public view models, while dedicated Admin pages provide CRUD and archive/restore without changing approved layouts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Supabase Postgres/RLS/RPC, Zod, Vitest, Cloudflare R2.

## Global Constraints

- Keep current approved public and Admin layouts.
- Seed Chibi, Illustration, VTuber, and Skin Minecraft as real database rows.
- Supabase is the only album/service/price source; no fixture fallback.
- Normal removal archives data and remains restorable.
- Existing request and quote snapshots never change after catalog edits.
- Only `nasora.nsr300@gmail.com` with `app_metadata.role = admin` can mutate catalog data.
- Store money as integer THB satang.
- Do not deploy, merge, or push during this plan.

---

### Task 1: Catalog schema, seed, RLS, and mutation RPCs

**Files:**
- Create: `supabase/migrations/20260810110000_commission_catalog.sql`
- Create: `src/features/admin/catalog/__tests__/catalog-migration-contract.test.ts`

**Interfaces:**
- Produces tables `commission_albums`, `commission_services`, `commission_service_prices`, `commission_catalog_media`.
- Produces RPCs `admin_save_commission_album`, `admin_set_commission_album_archive`, `admin_save_commission_service`, `admin_set_commission_service_archive`, `admin_replace_commission_service_prices`.
- Produces four idempotent seed albums with stable slugs.

- [ ] **Step 1: Write failing migration contract tests**

Assert table constraints, unique slugs, archive columns, public read RLS, admin-only RPC grants, audit inserts, snapshot-safe foreign-key behavior, and four seed slugs.

```ts
expect(sql).toMatch(/create table public\.commission_albums/);
expect(sql).toMatch(/'chibi'.*'illustration'.*'vtuber'.*'minecraft-skin'/s);
expect(sql).toMatch(/grant execute on function public\.admin_save_commission_album/);
expect(sql).toMatch(/revoke all on function public\.admin_save_commission_album.*from public/s);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/admin/catalog/__tests__/catalog-migration-contract.test.ts`

Expected: FAIL because migration does not exist.

- [ ] **Step 3: Implement migration**

Use JSONB localized fields with shape `{ "th": string, "en": string }`; lowercase URL-safe slug checks; `availability in ('open','limited','closed')`; non-negative satang; unique `(album_id, slug)` and `(service_id, usage, pace)`; nullable `archived_at`; admin mutation RPCs guarded by `private.is_admin()` and writing `audit_log`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/features/admin/catalog/__tests__/catalog-migration-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260810110000_commission_catalog.sql src/features/admin/catalog/__tests__/catalog-migration-contract.test.ts
git commit -m "feat(catalog): add commission catalog schema"
```

### Task 2: Catalog domain mapping and repositories

**Files:**
- Create: `src/features/catalog/domain/catalog.ts`
- Create: `src/features/catalog/data/public-catalog-repository.server.ts`
- Create: `src/features/admin/catalog/data/admin-catalog-repository.server.ts`
- Create: `src/features/catalog/data/__tests__/public-catalog-repository.test.ts`
- Create: `src/features/admin/catalog/data/__tests__/admin-catalog-repository.test.ts`
- Modify: `src/shared/types/public-content.ts`

**Interfaces:**
- Produces `listPublicAlbums(locale)`, `getPublicAlbum(locale, slug)`.
- Produces `listAdminAlbums()`, `getAdminAlbum(id)`, and typed admin mutation wrappers.
- Produces `AdminCatalogAlbum`, `AdminCatalogService`, and `CatalogPriceInput` types.

- [ ] **Step 1: Write failing repository tests**

Cover ordered public rows, archive filtering, service counts, exact satang-to-THB mapping, nullable cover mapping, malformed row rejection, admin authentication, and archived rows visible only to Admin.

```ts
expect(await listPublicAlbums("th")).toEqual([
  expect.objectContaining({ slug: "chibi", published: true, typeCount: 2 }),
]);
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/catalog/data/__tests__/public-catalog-repository.test.ts src/features/admin/catalog/data/__tests__/admin-catalog-repository.test.ts`

Expected: FAIL with missing modules.

- [ ] **Step 3: Implement domain schemas and repositories**

Validate all Supabase responses with Zod. Map absent cover to `undefined`; update `ServiceCategory.coverMedia` and `coverCrop` to optional. Keep `ServiceType.examples` empty until Portfolio owns examples.

- [ ] **Step 4: Verify GREEN**

Run focused tests. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog src/features/admin/catalog/data src/shared/types/public-content.ts
git commit -m "feat(catalog): add live catalog repositories"
```

### Task 3: Guarded Admin catalog API

**Files:**
- Create: `src/app/api/admin/catalog/albums/route.ts`
- Create: `src/app/api/admin/catalog/albums/[albumId]/route.ts`
- Create: `src/app/api/admin/catalog/albums/[albumId]/archive/route.ts`
- Create: `src/app/api/admin/catalog/albums/[albumId]/services/route.ts`
- Create: `src/app/api/admin/catalog/services/[serviceId]/route.ts`
- Create: `src/app/api/admin/catalog/services/[serviceId]/archive/route.ts`
- Create: `src/app/api/admin/catalog/services/[serviceId]/prices/route.ts`
- Create: `src/app/api/admin/catalog/__tests__/catalog-routes.test.ts`

**Interfaces:**
- Album create body: `{ slug, name, description, availability, published, recommended, displayOrder }`.
- Album update uses same fields and UUID route parameter.
- Service create/update body: `{ albumId, slug, name, description, timingGuidance, availability, revisionAllowance, published, displayOrder }`.
- Price replacement body: `{ prices: Array<{ usage: "personal" | "commercial"; pace: "normal" | "rush"; label; amountSatang; displayOrder }> }`.

- [ ] **Step 1: Write failing route tests**

Cover exact JSON content type, same-origin mutation, UUID parsing, unknown fields rejected, localized fields required, slug format, duplicate conflict as 409, archive/restore, price range, unauthorized 403, and route revalidation.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/app/api/admin/catalog/__tests__/catalog-routes.test.ts`

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement minimal routes**

Use strict Zod schemas, repository wrappers, safe Thai errors, and `revalidatePath` for `/th/commission`, `/en/commission`, and affected album routes.

- [ ] **Step 4: Verify GREEN**

Run focused route tests. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/catalog
git commit -m "feat(catalog): add admin catalog API"
```

### Task 4: Live Admin album list and editor

**Files:**
- Create: `src/features/admin/catalog/components/admin-catalog-page.tsx`
- Create: `src/features/admin/catalog/components/admin-catalog-page.module.css`
- Create: `src/features/admin/catalog/components/admin-album-editor.tsx`
- Create: `src/features/admin/catalog/components/admin-album-editor.module.css`
- Create: `src/features/admin/catalog/components/__tests__/admin-catalog-page.test.tsx`
- Create: `src/features/admin/catalog/components/__tests__/admin-album-editor.test.tsx`
- Modify: `src/app/(admin)/admin/catalog/page.tsx`
- Create: `src/app/(admin)/admin/catalog/new/page.tsx`
- Create: `src/app/(admin)/admin/catalog/[albumId]/page.tsx`
- Modify: `src/features/admin/components/admin-section-pages.tsx`

**Interfaces:**
- `AdminCatalogPage({ albums })` renders real rows and client search/filter/sort.
- `AdminAlbumEditor({ initialAlbum })` supports create/edit, nested service editing, price replacement, archive, and restore.

- [ ] **Step 1: Write failing UI tests**

Cover fixture names absent unless supplied, empty state, functional search/filter/sort, Add Album navigation, Edit navigation, archive confirmation, restore, validation, service add/edit, four price variants, retryable API errors, and success refresh.

```tsx
render(<AdminCatalogPage albums={[]} />);
expect(screen.getByText("ยังไม่มีอัลบั้ม")).toBeVisible();
expect(screen.queryByText("Kirana")).not.toBeInTheDocument();
```

- [ ] **Step 2: Verify RED**

Run focused component tests. Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement list and editor**

Preserve existing card dimensions/colors. Replace generic `PageHeader` no-op button with real Next links. Keep separate components; do not couple public layout to Admin layout.

- [ ] **Step 4: Verify GREEN**

Run focused component tests. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/catalog src/app/'(admin)'/admin/catalog src/features/admin/components/admin-section-pages.tsx
git commit -m "feat(admin): make album catalog editable"
```

### Task 5: Public commission pages use Supabase only

**Files:**
- Modify: `src/app/[locale]/commission/page.tsx`
- Modify: `src/app/[locale]/commission/[category]/page.tsx`
- Modify: `src/features/commission/components/album-tile.tsx`
- Modify: `src/features/commission/components/service-card.tsx`
- Modify: `src/features/commission/components/service-category-page.tsx`
- Create: `src/features/commission/__tests__/live-catalog-pages.test.tsx`
- Modify: `src/data/fixture-public-content-repository.ts`

**Interfaces:**
- Public routes call `listPublicAlbums` and `getPublicAlbum` only.
- Archived/unpublished slug returns `notFound()`.
- Missing covers render CSS neutral placeholders with accessible labels.

- [ ] **Step 1: Write failing public integration tests**

Prove published rows render, archived rows do not render, DB edits change Thai/English text, missing cover does not reference `/fixtures`, and category route has no fixture-based `generateStaticParams`.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/features/commission/__tests__/live-catalog-pages.test.tsx`

Expected: FAIL because routes still import fixture repository.

- [ ] **Step 3: Replace fixture imports and add neutral states**

Keep fixture repository for unrelated Home/Portfolio/Documents only. Commission routes and components must not import `src/data/fixtures/public-content.ts`.

- [ ] **Step 4: Verify GREEN**

Run public catalog tests plus existing commission tests. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/'[locale]'/commission src/features/commission src/data/fixture-public-content-repository.ts
git commit -m "feat(commission): render live album catalog"
```

### Task 6: Catalog cover upload, runtime apply, and final verification

**Files:**
- Modify: `src/features/collaboration/storage/r2-private-assets.server.ts`
- Create: `src/app/api/admin/catalog/media/route.ts`
- Create: `src/app/api/catalog/media/[mediaId]/route.ts`
- Create: `src/app/api/admin/catalog/__tests__/catalog-media-routes.test.ts`
- Modify: `src/features/admin/catalog/components/admin-album-editor.tsx`
- Modify: `.env.example`
- Modify: `docs/superpowers/plans/2026-08-10-commission-album-catalog.md`

**Interfaces:**
- Admin upload accepts PNG, JPEG, or WebP up to 5 MiB after magic-byte validation.
- R2 keys use `catalog-covers/<uuid>/<uuid>.<ext>`.
- Public media route streams only media attached to a published, non-archived album/service and sets cache headers.

- [ ] **Step 1: Write failing media tests**

Cover Admin-only upload, 5 MiB hard cap before R2 write, MIME/magic mismatch, safe generated key, DB attachment, public visibility boundary, and archived media 404.

- [ ] **Step 2: Verify RED**

Run focused media tests. Expected: FAIL because routes/path allowlist do not exist.

- [ ] **Step 3: Implement upload and serving**

Extend R2 path allowlist with `catalog-covers/`. Upload server-side, persist metadata only after successful R2 write, delete orphan on DB failure, and stream via signed GET without exposing R2 credentials.

- [ ] **Step 4: Apply migration to linked Supabase project**

Run: `npx supabase migration list --linked` then `npx supabase db push --linked`.

Expected: migration `20260810110000` applied once. Do not deploy Workers.

- [ ] **Step 5: Run verification**

```bash
npm test -- --maxWorkers=2
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0; no commission route imports fixtures; no Worker deployment occurs.

- [ ] **Step 6: Commit**

```bash
git add src/features/collaboration/storage/r2-private-assets.server.ts src/app/api/admin/catalog src/app/api/catalog src/features/admin/catalog .env.example docs/superpowers/plans/2026-08-10-commission-album-catalog.md
git commit -m "feat(catalog): complete live album management"
```

