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

## Production browser measurements â€” 14 Aug 2026

Measured with Chromium against `next start`, reduced motion enabled, linked non-production Supabase data, and the same script at `scripts/measure-public-performance.mjs`. Values are local production-build evidence, not field data.

| Route | Viewport | LCP | CLS | Requests | Transfer |
| --- | --- | ---: | ---: | ---: | ---: |
| Home | 1440Ã—900 | 1,868 ms | 0.00004 | 22 | 858 KB |
| Portfolio | 1440Ã—900 | 284 ms | 0.00004 | 23 | 856 KB |
| Home | 390Ã—844 | 232 ms | 0 | 22 | 858 KB |
| Portfolio | 390Ã—844 | 260 ms | 0 | 23 | 856 KB |

All runs stay below the checked local thresholds of LCP 2.5 s and CLS 0.1. No source optimization was justified by this measurement, so Desktop UI and loading behavior remain unchanged. Repeat with Vercel Web Analytics after deployment because local results do not include real user network latency.
