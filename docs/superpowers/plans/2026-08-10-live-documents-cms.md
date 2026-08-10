# Live Documents CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Admin Documents mockup and public document fixtures with a Supabase-backed bilingual rich-text CMS that safely renders approved formatting.

**Architecture:** Documents owns its schema, rich-text validator/renderer, repositories, routes, Admin editor, and public mapping. Lexical exists only in the Admin client bundle; public pages render validated JSON through server-compatible React components without shipping the editor.

**Tech Stack:** Next.js 16.3, React 19.2, TypeScript 6, Supabase/Postgres JSONB and RLS, Cloudflare R2, Lexical 0.48.0, Zod 4, Vitest.

## Global Constraints

- Thai and English metadata/content are separate and required for publish.
- Rich text permits only approved nodes, colors, highlights, alignment, lists, and safe links.
- Public pages receive no Lexical editor bundle and no arbitrary HTML.
- Draft and archived documents are private.
- Existing Document Center and reader visual identity remains.
- Optional cover images use private R2.
- No fixture fallback, deploy, push, or merge.
- Use RED-GREEN-REFACTOR for every production behavior.

---

### Task 1: Rich-text domain, validation, and safe renderer

**Files:**
- Create: `src/features/documents/domain/rich-text.ts`
- Create: `src/features/documents/domain/__tests__/rich-text.test.ts`
- Create: `src/features/documents/components/rich-text-renderer.tsx`
- Create: `src/features/documents/components/__tests__/rich-text-renderer.test.tsx`
- Modify: `src/shared/types/public-content.ts`

**Interfaces:**
- Produces `SafeRichTextDocument`, `parseSafeRichText(value)`, `hasRichTextContent(value)`, and `RichTextRenderer({document})`.
- Allowed nodes: root, paragraph, heading h2-h4, text, list, listitem, link, linebreak, horizontalrule.
- Allowed text marks: bold, underline; allowed alignment: left, center, right.
- Allowed colors: default, red, gold, violet; highlights: none, yellow, rose.

- [ ] **Step 1: Write failing validator tests**

```ts
expect(parseSafeRichText(validDocument)).toEqual(validDocument);
expect(() => parseSafeRichText(rawHtmlNode)).toThrow("invalid_rich_text");
expect(() => parseSafeRichText(javascriptLink)).toThrow("invalid_rich_text_link");
expect(() => parseSafeRichText(arbitraryStyle)).toThrow("invalid_rich_text_style");
```

Renderer tests assert headings, lists, center alignment, red text, highlight, safe links, and no `dangerouslySetInnerHTML`.

- [ ] **Step 2: Run RED**

```powershell
npm test -- src/features/documents/domain src/features/documents/components/__tests__/rich-text-renderer.test.tsx
```

Expected: FAIL because validator/renderer do not exist.

- [ ] **Step 3: Implement recursive discriminated Zod schemas**

Limit depth to 12, total nodes to 2,000, and text to 100,000 characters per language. Normalize links to only `http:`, `https:`, and site-relative paths. Renderer switches on known nodes and maps approved tokens to CSS classes.

- [ ] **Step 4: Replace document string rendering**

Change `DocumentSummary.content` to `Record<Locale, SafeRichTextDocument>` and render through `RichTextRenderer` in the reader.

- [ ] **Step 5: Run GREEN and commit**

```powershell
npm test -- src/features/documents/domain src/features/documents/components
git add src/features/documents src/shared/types/public-content.ts
git commit -m "feat(documents): add safe rich text model"
```

---

### Task 2: Documents schema, RLS, and guarded mutations

**Files:**
- Create via CLI: timestamped `documents_cms.sql` under `supabase/migrations`
- Create: `src/features/admin/documents/__tests__/documents-migration-contract.test.ts`

**Interfaces:**
- Produces `public.public_documents`, `admin_save_public_document(...)`, and `admin_set_public_document_archive(...)`.

- [ ] **Step 1: Generate migration**

```powershell
npx supabase migration new documents_cms
```

- [ ] **Step 2: Write failing SQL contract test**

```ts
expect(sql).toMatch(/create table public\.public_documents/i);
expect(sql).toMatch(/content jsonb not null/i);
expect(sql).toMatch(/published[\s\S]+archived_at is null/i);
expect(sql).toMatch(/private\.is_admin\(\)/i);
expect(sql).toMatch(/insert into public\.audit_logs/i);
```

Also assert unique slug, allow-listed category, cover-media FK, RLS, indexes, audit, explicit revokes, and authenticated-only grants.

- [ ] **Step 3: Run RED**

```powershell
npm test -- src/features/admin/documents/__tests__/documents-migration-contract.test.ts
```

Expected: FAIL because schema is absent.

- [ ] **Step 4: Implement minimal migration**

Use columns from the approved spec. RPC input is strict JSONB for localized metadata/content/tags. RPC rejects unsafe shape at the DB boundary using bounded object/array/type checks; application validator remains the detailed format authority. Publishing requires both locales, summaries, and non-empty roots. Drafts may be incomplete.

- [ ] **Step 5: Run GREEN and commit**

```powershell
npm test -- src/features/admin/documents/__tests__/documents-migration-contract.test.ts
git add supabase/migrations src/features/admin/documents/__tests__
git commit -m "feat(documents): add documents cms schema"
```

---

### Task 3: Documents repositories

**Files:**
- Create: `src/features/documents/data/public-documents-repository.server.ts`
- Create: `src/features/documents/data/__tests__/public-documents-repository.test.ts`
- Create: `src/features/admin/documents/data/admin-documents-repository.server.ts`
- Create: `src/features/admin/documents/data/__tests__/admin-documents-repository.test.ts`
- Modify: `src/data/public-content-repository.ts`

**Interfaces:**
- Produces `listPublicDocuments(locale, query?)`, `getPublicDocument(slug)`, `listAdminDocuments()`, `getAdminDocument(id)`, `saveAdminDocument(input)`, `archiveAdminDocument(id, archived, reason)`.

- [ ] **Step 1: Write failing repository tests**

Assert pinned-first/display-order sorting, RLS-visible mapping, rich-text parsing, optional cover URL, archived Admin rows, slug conflicts, and missing/invalid JSON failure without fixture fallback.

- [ ] **Step 2: Run RED**

```powershell
npm test -- src/features/documents/data src/features/admin/documents/data
```

Expected: FAIL because live repositories do not exist.

- [ ] **Step 3: Implement strict mapping**

Public query asks for required columns only. Parse both rich-text roots with `parseSafeRichText`. Admin repository verifies sole-admin identity and exposes draft/archive state without leaking raw rows to clients.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm test -- src/features/documents/data src/features/admin/documents/data
git add src/features/documents/data src/features/admin/documents/data src/data/public-content-repository.ts
git commit -m "feat(documents): add live repositories"
```

---

### Task 4: Admin document and cover APIs

**Files:**
- Create: `src/features/admin/documents/api/documents-route.ts`
- Create: `src/app/api/admin/documents/route.ts`
- Create: `src/app/api/admin/documents/[documentId]/route.ts`
- Create: `src/app/api/admin/documents/[documentId]/archive/route.ts`
- Create: `src/app/api/admin/documents/media/route.ts`
- Create: `src/app/api/documents/media/[mediaId]/route.ts`
- Create route tests beside these routes.
- Modify: `src/features/collaboration/storage/r2-private-assets.server.ts`

**Interfaces:**
- Save body includes slug, category, localized title/summary/content/tags, optional coverMediaId, pinned, displayOrder, published.
- Cover upload matches Portfolio upload response `{mediaId,src}`.

- [ ] **Step 1: Write failing route tests**

Cover same-origin, UUIDs, strict body, rich-text rejection, draft allowance, publish requirements, conflicts, revalidation, cover limits/magic, cleanup, and public cover visibility.

- [ ] **Step 2: Run RED**

```powershell
npm test -- src/app/api/admin/documents src/app/api/documents
```

Expected: FAIL because routes are absent.

- [ ] **Step 3: Implement routes**

Validate body before RPC. Allow `document-covers/{uuid}.{png|jpg|webp}`. Resolve public cover only when attached to a published/non-archived document. Revalidate both locales, list route, slug routes, and Admin routes.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm test -- src/app/api/admin/documents src/app/api/documents
git add src/app/api/admin/documents src/app/api/documents src/features/admin/documents/api src/features/collaboration/storage/r2-private-assets.server.ts
git commit -m "feat(documents): add admin and cover api"
```

---

### Task 5: Lexical Admin editor and real Documents list

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/app/(admin)/admin/documents/page.tsx`
- Create: `src/app/(admin)/admin/documents/new/page.tsx`
- Create: `src/app/(admin)/admin/documents/[documentId]/page.tsx`
- Create: `src/features/admin/documents/components/admin-documents-page.tsx`
- Create: `src/features/admin/documents/components/admin-documents-page.module.css`
- Create: `src/features/admin/documents/components/admin-document-editor.tsx`
- Create: `src/features/admin/documents/components/admin-document-editor.module.css`
- Create: `src/features/admin/documents/components/document-rich-text-editor.tsx`
- Create component tests.
- Modify: `src/features/admin/components/admin-section-pages.tsx`

**Interfaces:**
- Editor owns separate Thai/English Lexical states and emits safe serialized JSON.
- Toolbar supports h2-h4, paragraph, bold, underline, alignment, approved colors/highlights, lists, links, divider, undo/redo.

- [ ] **Step 1: Install exact editor packages**

```powershell
npm install --save-exact lexical@0.48.0 @lexical/react@0.48.0 @lexical/rich-text@0.48.0 @lexical/list@0.48.0 @lexical/link@0.48.0 @lexical/selection@0.48.0 @lexical/history@0.48.0
```

Expected: package and lockfile contain exact `0.48.0` entries.

- [ ] **Step 2: Write failing UI tests**

Assert no fixture rows, real Add/Edit IDs, filters, separate locale states, toolbar commands, validated save payload, failed-save retention, preview, cover upload, draft save, publish rejection for missing locale, and archive/restore.

- [ ] **Step 3: Run RED**

```powershell
npm test -- src/features/admin/documents/components
```

Expected: FAIL against mock page.

- [ ] **Step 4: Implement focused components**

Keep Lexical imports inside Admin client modules. Register only approved nodes/plugins. Validate serialized state with `parseSafeRichText` before save. Build custom toolbar buttons using Lexical commands; do not enable raw HTML import/export. Preserve existing table/header styling and use dedicated editor routes.

- [ ] **Step 5: Run GREEN and commit**

```powershell
npm test -- src/features/admin/documents/components
git add package.json package-lock.json "src/app/(admin)/admin/documents" src/features/admin/documents/components src/features/admin/components/admin-section-pages.tsx
git commit -m "feat(admin): add bilingual document editor"
```

---

### Task 6: Public Document Center and reader live sync

**Files:**
- Modify: `src/app/[locale]/documents/page.tsx`
- Modify: `src/app/[locale]/documents/[slug]/page.tsx`
- Modify: `src/features/documents/components/document-center-page.tsx`
- Modify: `src/features/documents/components/document-search.tsx`
- Modify: `src/features/documents/components/document-reader.tsx`
- Modify: `src/features/documents/components/documents.module.css`
- Create: `src/features/documents/__tests__/public-document-routes.test.tsx`

**Interfaces:**
- Routes call `listPublicDocuments` and `getPublicDocument`; no static document enumeration from fixtures.

- [ ] **Step 1: Write failing route/component tests**

Prove no fixture import, only published rows render, pin/order/category/search remain, localized rich content renders, unsafe JSON becomes not-found/safe error, dialog and route reader share renderer, and close/focus behavior remains.

- [ ] **Step 2: Run RED**

```powershell
npm test -- src/features/documents src/app/[locale]/documents
```

Expected: FAIL until live repository is wired.

- [ ] **Step 3: Implement live routes and safe rendering**

Remove fixture repository imports and static slug generation. Use dynamic server routes. Render rich JSON through `RichTextRenderer`; keep list/dialog visual layout and localized metadata.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npm test -- src/features/documents
git add "src/app/[locale]/documents" src/features/documents
git commit -m "feat(documents): serve live document center"
```

---

### Task 7: Apply and verify Documents

- [ ] **Step 1: Run focused and full verification**

```powershell
npm test -- src/features/admin/documents src/features/documents src/app/api/admin/documents src/app/api/documents
npm test -- --maxWorkers=2 --reporter=dot
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: all exit 0 and public build does not load Lexical in document reader chunks.

- [ ] **Step 2: Check dependency and Supabase advisories**

Run `npm audit --omit=dev`, inspect official Lexical release notes if audit reports an editor package, run `npx supabase db advisors --help`, then the supported advisors command. Fix scoped high-confidence findings.

- [ ] **Step 3: Dry-run and push migration**

Discover current flags with `npx supabase db push --help`, dry-run, push, and confirm local/remote migration histories match.

- [ ] **Step 4: Verify live behavior**

Verify draft/archive invisibility, public bilingual rendering, sole-admin CRUD, unsafe link/style rejection, temporary cover R2 upload/signed GET/delete, and public 404 after archive.

- [ ] **Step 5: Commit only scoped verification fixes if needed**

```powershell
git add src/app/api/admin/documents src/app/api/documents "src/app/(admin)/admin/documents" "src/app/[locale]/documents" src/features/admin/documents src/features/documents src/features/collaboration/storage/r2-private-assets.server.ts supabase/migrations package.json package-lock.json
git diff --cached --check
git commit -m "fix(documents): address integration verification"
```

Do not deploy, push the Git branch, or merge.

