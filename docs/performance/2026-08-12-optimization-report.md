# Performance checkpoint — 2026-08-12

## Scope

- Skip particle canvases entirely when the operating system requests reduced motion.
- Give the first visible Home and Portfolio artwork high fetch priority; defer remaining gallery images.
- Give the pinned document cover explicit dimensions and eager asynchronous decoding.
- Keep using stored WebP derivatives and the existing immutable public-media cache headers.

## Build comparison

Both snapshots were built with `next build --webpack` so the temporary detached baseline worktree could share dependencies without Turbopack rejecting its external junction.

| Snapshot | JavaScript chunks | Total JavaScript bytes |
| --- | ---: | ---: |
| `4638a4b` baseline | 117 | 1,996,509 |
| optimized working tree | 117 | 1,997,098 |

The reduced-motion gate adds 589 bytes across the complete application chunk set. Its benefit is runtime: users requesting reduced motion do not mount either particle canvas, so they avoid animation CPU/GPU work rather than merely hiding the canvases with CSS.

## Browser measurements deferred

LCP, CLS, request count, and transferred image bytes were not recorded because the local page currently returns HTTP 500 against the linked Supabase project: remote migrations stop at `20260810165138`, while the UI requires the later site-settings, Home presentation, message-read, and ordinary-test-customer migrations. Applying remote migrations changes external state and needs separate approval. No metric was fabricated from the broken page.

## Verification target

After the four pending migrations are approved and applied, rerun the ordinary-customer browser flow with a real image from `E:\NasoraStudio\Img`, record Home/Portfolio LCP and CLS, and verify the public R2 derivative response remains cacheable.
