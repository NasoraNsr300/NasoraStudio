# Commission In-Page Albums and Shared CTA Labels

Date: 2026-08-06
Status: Approved

## Context

This design extends the approved Nasora specification and the existing public-foundation implementation plan. It does not replace or reduce the previously planned architecture, themes, public pages, account flows, administrator tools, or later implementation stages.

## Experience

The Commission page begins with the existing image-led category album overview. Selecting an album replaces that overview with the selected album's subtype cards inside the same Commission page. The browser remains on the same localized Commission URL, no new HTML document is loaded, and a visible back-to-albums control restores the overview.

The album transition may use a short reduced-motion-safe fade, but animation is optional and must not delay interaction. Missing or unpublished album data returns the visitor to the overview and shows a concise unavailable message.

## Service Card Actions

Every subtype card uses two shared actions. The labels are identical across services and never include or append the service name.

| Locale | Estimate action | Detail action |
| --- | --- | --- |
| Thai | `ประเมินราคา` | `ดูรายละเอียดและเรทราคา` |
| English | `Request Estimate` | `View Details & Rates` |

The service title remains visible in the card heading, so repeating it in either action is unnecessary. Closed services keep the detail action available but disable the estimate action according to the existing availability rules.

## Implementation Boundary

`CommissionAlbumsPage` owns the selected-album state and swaps between the overview and album content. Album tiles behave as accessible buttons. Shared locale message keys supply the two action labels to every `ServiceCard`; service records do not store custom action copy.

The album overview continues to omit service-level prices and request actions. Opening service details uses the previously planned dialog, while selecting an album itself does not use a route or modal.

## Verification

Component tests will verify in-page album selection, unchanged URL, return-to-overview behavior, exact Thai and English action labels, absence of appended service names, closed-service action state, and preservation of the existing album-overview rules. The public journey test will select an album, assert the URL is unchanged, and open the detail dialog through `ดูรายละเอียดและเรทราคา`.
