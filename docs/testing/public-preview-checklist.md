# Nasora Stage 1 public preview checklist

Review both `http://localhost:3000/th` and `http://localhost:3000/en` at Desktop 1440×900 and Mobile 390×844. Use the Vercel Preview URL in place of `http://localhost:3000` when reviewing the deployed build.

## Approved screen checkpoints

| # | Screen | Exact public URL / action | Review checkpoint |
|---|---|---|---|
| 01 | Home | `/th`, `/en` | Hero frame reserves its aspect ratio; a single enabled Hero is selected on load and remains unchanged for the visit. Refresh may select another enabled image. |
| 02 | Queue | `/th/queue`, `/en/queue` | Public name, service, textual status, and deadline remain legible; no private identifiers, payment, quote, contact, or delivery data appears. |
| 03 | Portfolio | `/th/portfolio`, `/en/portfolio` | Filters, sorting, image/video tiles, focus rings, and responsive gallery layout match the approved direction. |
| 04 | Commission Albums | `/th/commission`, `/en/commission` | Tiles are image-led with bottom gradient, bottom-left title, count pill, recommendation, and textual availability. No service pricing or request action appears here. |
| 05 | Illustration Album | `/th/commission/illustration`, `/en/commission/illustration` | Service filters/cards retain media aspect ratios, textual status, THB/USD guidance, and 44px mobile controls. |
| 06 | Service Details & Price | Open “View details for Illustration Half Body” from `/en/commission/illustration` (Thai equivalent from `/th/commission/illustration`) | Dialog header/footer remain above Navbar/Account controls; close, Escape, backdrop, pricing, modifiers, timing, revisions, and document links work. |
| 07 | Estimate Form | From screen 06 choose “Request estimate” | Stage 1 shows the non-submitting preview notice only. Member/Guest fields and submission are explicitly deferred to Stage 2. |
| 08 | Document Center | `/th/documents`, `/en/documents`; direct route `/th/documents/commission-terms`, `/en/documents/commission-terms` | Search/filter/list and direct route render localized published content; dialog and route reading modes close/return correctly. |
| 09 | Member Job | Account floating button on any public URL | Stage 1 exposes the signed-out authentication preview only. Member job/profile implementation is deferred to Stage 2+. |
| 10 | Admin Dashboard | No Stage 1 public URL | Explicitly deferred to Stage 4; verify no broken or placeholder Admin link leaks into the public Navbar. |

## Cross-screen review

- Theme: clear `nasora-theme`, confirm local-time automatic choice, then manually switch Night ↔ Autumn and reload to confirm persistence.
- Night/Autumn: text contrast and ambient treatment remain readable; reduced-motion mode removes nonessential animation.
- Desktop/Mobile: test 1440×900 and 390×844, 200% zoom, no horizontal overflow, preserved media ratios, and minimum 44×44px visible controls.
- Navigation: Sidebar opens into focus, traps Tab/Shift+Tab, closes via close button, Escape, backdrop, or navigation, and restores focus.
- Hero stability: note Hero artwork after initial paint, wait and interact, and confirm it does not change during the visit.
- Featured autoplay: confirm automatic advance; hover/focus, hidden-tab, reduced-motion, and manual controls pause it; previous/next/position controls remain operable.
- Album tiles: confirm cover, bottom gradient, title, item-count pill, recommendation, and non-color availability label.
- Lightbox: a Portfolio tile opens exactly one image/video; no previous/next controls; close button, Escape, and backdrop close it and restore focus.
- Shell: no footer and no login control inside the Navbar. The bottom-right Account button remains separate.

## Automated evidence

- `npm test`
- `npm run test:e2e` (behavioral journeys plus 12 deterministic route baselines and one import-boundary test)
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run build`
