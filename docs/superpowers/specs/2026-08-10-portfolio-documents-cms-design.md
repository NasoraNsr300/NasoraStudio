# Portfolio and Documents CMS Design

## Goal

Replace the Admin Portfolio and Documents mockups with durable Supabase-backed tools while preserving the approved public UI. Admin changes must immediately become the source of truth for the public Portfolio and Document Center after revalidation. No fixture fallback is allowed.

This work is split into two bounded modules that share only the existing private R2 media service and common authorization patterns.

## Scope

### Portfolio

- Admin can create, edit, publish, archive, and restore portfolio items.
- Each item stores a Thai title, English title, one image, a linked commission album, featured state, display order, and publication state.
- Portfolio categories come from active commission albums rather than a second category table.
- The public Portfolio reads only published, non-archived rows.
- Public cards show only the image by default. The localized title appears on pointer hover or keyboard focus.
- Selecting a card opens the existing single-image lightbox. The lightbox does not become a carousel. Escape, close button, and backdrop click close it.

### Documents

- Admin can create, edit, pin, publish, archive, and restore documents.
- Each document stores slug, category, Thai and English title/summary, Thai and English rich-text documents, localized tags, optional cover image, display order, and publication state.
- Draft and archived documents remain invisible to public readers.
- Public Document Center and document routes read only published, non-archived rows.
- Existing document cards, filters, dialog reader, and route reader remain visually consistent.

## Out of Scope

- Multiple images or video in one portfolio item.
- Portfolio descriptions on the public page.
- Runtime image transformation.
- Collaborative document editing, revision comments, scheduled publishing, and document version history.
- Deployment, branch merge, or fixture cleanup outside Portfolio and Documents.

## Architecture

### Module boundaries

Portfolio and Documents use separate schemas, repositories, API routes, editor components, and tests. They must not share page-specific React components. Shared code is limited to authorization, localized value helpers, catalog album references, and private R2 media storage.

### Data flow

1. Admin server page reads the relevant admin repository.
2. Client editor submits to a same-origin Admin API route.
3. The route verifies the sole-admin account and validates a strict request schema.
4. A guarded database RPC performs the mutation and writes an audit record.
5. The route revalidates affected Admin and public paths.
6. Public server pages query their public repositories under RLS.

## Database Design

### `portfolio_items`

- `id uuid primary key`
- `album_id uuid not null references commission_albums(id)`
- `media_id uuid not null references commission_catalog_media(id)`
- `title jsonb not null` containing non-empty `th` and `en`
- `featured boolean not null default false`
- `display_order integer not null default 0`
- `published boolean not null default false`
- `archived_at timestamptz null`
- created/updated timestamps and actor IDs

The image dimensions already stored on media rows provide the aspect ratio used by the public layout.

### `public_documents`

- `id uuid primary key`
- `slug text unique not null`
- `category text not null` from an allow-list
- `title jsonb not null`
- `summary jsonb not null`
- `content jsonb not null` with `th` and `en` structured rich-text roots
- `tags jsonb not null default []`
- `cover_media_id uuid null references commission_catalog_media(id)`
- `pinned boolean not null default false`
- `display_order integer not null default 0`
- `published boolean not null default false`
- `archived_at timestamptz null`
- created/updated timestamps and actor IDs

### Access rules

- RLS is enabled on both tables.
- `anon` and ordinary members can select only published rows where `archived_at is null`.
- Admin reads all rows through the authenticated session and sole-admin predicate.
- Public roles receive no direct insert, update, or delete grants.
- Mutations use `security definer` RPCs with an empty `search_path`, an explicit `private.is_admin()` check, strict input validation, narrow grants, and audit logging.
- Archive is reversible and preferred over destructive deletion.

## Portfolio Public Layout

The gallery is a four-column dense CSS Grid on the approved desktop canvas.

- `grid-auto-flow: dense` fills available gaps.
- Image aspect ratio determines the safe row span.
- A deterministic hash of the portfolio item ID chooses between permitted one- and two-column variants.
- The same ID always produces the same variant, preventing random movement across reloads and hydration.
- Very narrow images remain one column; sufficiently wide images may span two columns.
- DOM order and keyboard order continue to follow `display_order`; visual dense placement must not change accessible reading order.
- Image dimensions are emitted before load to prevent layout shift.

The title overlay is hidden visually until hover or focus-within. It remains available to assistive technology. Reduced-motion users receive no animated transition.

## Rich Text Model

Document content is structured JSON rather than arbitrary stored HTML. The first version supports only:

- paragraph
- heading levels 2–4
- bold and underline
- text alignment
- approved text colors
- approved highlight colors
- bullet and ordered lists
- links using `http`, `https`, or site-relative paths
- horizontal divider

The editor runs only in Admin. Public rendering maps known node types and marks to React elements. Unknown nodes, raw HTML, scripts, inline event handlers, unsafe URLs, and arbitrary styles are rejected at validation time and ignored by the renderer as defense in depth.

Thai and English content are edited in separate tabs and must each contain a valid root document before publishing. Drafts may be incomplete.

## Admin UX

### Portfolio

- Existing page header and grid styling remain.
- Search and publication filters operate on real rows.
- Add and Edit open dedicated editor routes.
- Editor contains localized titles, commission album selector, image upload/preview, featured toggle, order, and publication state.
- Archive and Restore require confirmation and preserve the media row.

### Documents

- Existing table styling remains.
- Search and status/category filters operate on real rows.
- Add and Edit open dedicated editor routes.
- Editor contains metadata fields, optional cover upload, Thai/English tabs, rich-text toolbar, preview, draft save, and publish action.
- Archive and Restore require confirmation.

## Media

Portfolio images and optional document covers use private R2 object keys under separate prefixes. Upload routes enforce same-origin Admin access, a 5 MiB maximum, PNG/JPEG/WebP magic-byte validation, and bounded dimensions. Database metadata is registered only after successful upload; failed registration deletes the object best-effort. Public media routes resolve only media attached to visible public content and redirect to short-lived signed GET URLs.

## Validation and Errors

- Duplicate slugs return a localized conflict message.
- Invalid album references, unsafe rich-text nodes, malformed localized values, unsupported images, and invalid ordering return validation errors without partial writes.
- Database and R2 failures leave the editor open with entered values intact.
- Publishing a portfolio item requires a valid image and active album.
- Publishing a document requires valid Thai and English title, summary, and non-empty rich-text roots.
- Public repository failures do not fall back to fixtures.

## Testing

Implementation follows test-driven development.

- Migration contract tests cover tables, RLS, grants, RPC guards, archive behavior, and audit writes.
- Repository tests cover mapping, ordering, publication visibility, album joins, and rich-text data.
- API tests cover same-origin, sole-admin authorization, strict validation, conflicts, revalidation, and safe errors.
- Upload tests cover size, MIME/magic mismatch, R2 cleanup, and public visibility.
- Component tests cover Admin CRUD flows, editor state retention, deterministic Portfolio layout, hover/focus title behavior, lightbox behavior, rich-text toolbar output, and unsafe content rejection.
- Public route tests prove fixture repositories are no longer imported.
- Final verification includes the full test suite, typecheck, lint, production build, migration dry-run/push, RLS queries, and one temporary R2 upload/delete check.

## Delivery Order

1. Portfolio database, repository, Admin CRUD, R2 media, and public sync.
2. Documents database, rich-text schema/renderer, Admin CRUD, optional cover media, and public sync.
3. Apply migrations and perform cross-module verification.

No deploy, push, or merge is part of this design.
