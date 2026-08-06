# DESIGN SYSTEM — Nasora

## Design intent

Nasora should feel celestial, warm, crafted, and alive without imitating the reference website. Artwork remains the visual focus. Interface effects support orientation and atmosphere rather than competing with the work.

## Principles

1. Artwork first: UI surfaces frame the work and do not overpower it
2. Two worlds, one identity: Night and Autumn share spacing, typography, components, and interaction rules
3. Clear before clever: prices, availability, queue, and actions must remain readable over ambient backgrounds
4. Motion has a budget: effects adapt to device capability and accessibility preferences
5. Page-specific composition: Home, Portfolio, and Commission own independent layouts
6. Stable primitives: reuse small controls with explicit contracts, not composite page layouts

## Color system

### Shared brand colors

| Token | Value | Use |
|---|---|---|
| `brand-gold` | `#F6C85F` | Primary accent, active status, celestial highlight |
| `brand-violet` | `#C4B5FD` | Night secondary accent, focus glow |
| `success` | `#22C55E` | Open status, approved payment |
| `warning` | `#F59E0B` | Expiry, pending review |
| `danger` | `#EF4444` | Rejected slip, destructive action |
| `info` | `#38BDF8` | Neutral informational state |

### Night theme

| Token | Value |
|---|---|
| `background` | `#090D1F` |
| `background-elevated` | `#111831` |
| `surface` | `rgba(23, 37, 84, 0.62)` |
| `surface-strong` | `rgba(17, 24, 49, 0.88)` |
| `border` | `rgba(196, 181, 253, 0.22)` |
| `text-primary` | `#F8FAFC` |
| `text-secondary` | `#B8C1D9` |
| `star-primary` | `#C4B5FD` |
| `star-warm` | `#F6C85F` |

### Autumn theme

| Token | Value |
|---|---|
| `background` | `#FFF7E8` |
| `background-elevated` | `#FFFDF7` |
| `surface` | `rgba(255, 253, 247, 0.72)` |
| `surface-strong` | `rgba(255, 250, 239, 0.92)` |
| `border` | `rgba(138, 83, 42, 0.22)` |
| `text-primary` | `#2A1A12` |
| `text-secondary` | `#6F5142` |
| `leaf-rust` | `#C65D32` |
| `leaf-amber` | `#E9A23B` |

Text and control colors must pass WCAG AA contrast against their actual rendered surface, including transparency over background art.

## Typography

### Families

- Display and Latin headings: Sora
- Thai UI and body: Noto Sans Thai
- Numbers in queue, pricing, and payment ledgers use tabular numerals

### Scale

| Style | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Hero | 56 px | 36 px | 700 |
| H1 | 40 px | 30 px | 700 |
| H2 | 30 px | 24 px | 650 |
| H3 | 22 px | 20 px | 600 |
| Body large | 18 px | 17 px | 400 |
| Body | 16 px | 16 px | 400 |
| Small | 14 px | 14 px | 400 |
| Label | 12 px | 12 px | 600 |

Thai line height must be at least 1.55 for body copy. English body line height is at least 1.5.

## Spacing and sizing

Base spacing unit is 4 px.

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

- Minimum pointer target: 44 × 44 px
- Main content maximum width: 1440 px
- Reading content maximum width: 760 px
- Floating Navbar desktop horizontal margin: 16–32 px depending on viewport
- Modal safe margin: at least 16 px on mobile and 32 px on desktop

## Radius, border, and elevation

| Token | Value | Use |
|---|---:|---|
| `radius-sm` | 10 px | Inputs, compact controls |
| `radius-md` | 16 px | Cards |
| `radius-lg` | 24 px | Panels and Navbar |
| `radius-xl` | 32 px | Major modal surfaces |
| `border-subtle` | 1 px | Default surface edge |
| `border-focus` | 2 px | Keyboard focus |

Glass surfaces use restrained backdrop blur. A solid fallback is mandatory for unsupported browsers, reduced transparency settings, and areas where contrast would be unreliable.

## Global shell

### Floating Navbar

- Sticky near the top rather than touching the viewport edge
- Full form at page start; compact form after scroll
- Contains menu trigger, Nasora identity, contextual search, availability, language, and theme
- Does not contain login
- Never covers focused content; anchor navigation accounts for its height

### Sidebar

- Hidden until activated
- Slides in as an overlay on desktop and mobile
- Shows active item with a strong surface state
- Closes by close control, Escape, or backdrop
- Contains login as a secondary access route
- Store and Review are hidden or explicitly unavailable until Phase 2

### Floating Button

- Fixed bottom-right with safe-area spacing
- Signed out: account/login icon
- Signed in: avatar and unread badge
- Opens an origin-aware panel from the trigger
- Admin receives a dashboard shortcut
- Does not obscure critical form actions on small screens

## Page layouts

### Home

- Uses `HomeFeaturedLayout`
- Hero, brand introduction, featured art, and Home-only Quick Info Panel
- Hero randomly selects one enabled image when the page opens or refreshes, then keeps it stable for that visit
- Featured work uses a separate automatic carousel with visible manual controls and position feedback
- Featured autoplay pauses on hover, focus or interaction, hidden tab, and reduced-motion preference
- Does not import Portfolio grid or Commission album layout

### Portfolio

- Uses `PortfolioGalleryLayout`
- Dense but calm gallery optimized for browsing
- Page-scoped category controls and search
- Image click opens single-image lightbox without carousel navigation

### Commission

- Uses `CommissionAlbumLayout`
- Category layer, subtype layer, then service detail
- Category album tiles are image-led with a dark bottom gradient, title at bottom-left, item-count pill at bottom-right, and optional recommended badge
- Album selection swaps the category overview for the selected subtype collection in place; the Commission URL remains unchanged and a visible back-to-albums control restores the overview
- Category tiles prioritize recognition and navigation; pricing and request actions begin at the subtype or service layer
- Subtype cards prioritize availability, service identity, reference price access, and request action
- Subtype card actions use shared localized labels rather than service-specific copy: `ประเมินราคา` / `Request Estimate` and `ดูรายละเอียดและเรทราคา` / `View Details & Rates`
- Detail view separates reference pricing, additions, timing, linked documents, examples, and request button

### Queue

- Responsive table on desktop
- On narrow screens each row becomes a compact record without hiding name, status, service, or deadline
- Status uses text plus color; color alone is insufficient

### Document Center

- Searchable listing with pinned items and category filters
- Document opens as a large route-aware modal or direct route
- Reading surface favors legibility over glass effects

### Member and Admin

- Operational screens use clearer, less decorative surfaces
- Payment totals, deadlines, and statuses remain visible without relying on hover
- Member Profile supports nickname editing, password management, and multiple saved contact channels with one default
- Authenticated request forms use a distinct Member module populated from Profile; Guest fields render only while signed out
- Admin desktop layout may be denser but must still work on mobile for urgent actions

## Core components

### Buttons

- Primary: one clear action per panel
- Secondary: neutral supporting action
- Destructive: danger token plus confirmation
- Ghost/icon: only with accessible label and tooltip when meaning is not obvious
- Loading state preserves width and prevents duplicate action

### Forms

- Labels remain visible above fields
- Required status is textual and programmatic
- Inline validation appears beside the affected field
- Form error summary links to invalid fields
- File upload shows type, size limit, progress, retry, and removal
- Service type inherited from the originating page is visible but not silently changeable

### Cards

- Media aspect ratio is explicit to prevent layout shift
- Text remains outside complex artwork when contrast cannot be guaranteed
- Availability badge has label and icon
- Hover never reveals information that touch users cannot access

### Modal and lightbox

- Focus is trapped while open and restored to the trigger on close
- Escape closes unless a destructive operation needs explicit choice
- General modals close from backdrop only when doing so cannot lose unsaved work
- Image lightbox closes from backdrop and contains one image only
- Long document and request modals keep title/actions reachable while content scrolls

### Tables and ledgers

- Use tabular numbers
- Align money values consistently
- Provide status text and timestamps
- Mobile transformation preserves all critical fields

## Motion system

### Timing

- Micro feedback: 120–180 ms
- Panel and modal transitions: 180–260 ms
- Sidebar: 240–320 ms
- Page transitions: subtle and under 300 ms
- Use ease-out for direct responses and ease-in-out for on-screen movement

### Interactive particle field

Desktop Night layers:

1. Low-density ambient star field
2. Twinkle/float layer
3. Cursor particle trail
4. Local pointer-repulsion field when pointer settles
5. Intermittent starfall event layer

Autumn replaces stars and starfall with restrained drifting leaves. It does not merely recolor the Night particles.

Performance rules:

- One canvas per ambient system, not one DOM node per particle
- Cap device pixel ratio used by canvas
- Adaptive particle count based on viewport and measured frame stability
- Pause on `visibilitychange`
- No pointer physics on touch-first/mobile layouts
- Do not run animation inside React render state on every frame
- Reduced Motion disables trail, repulsion, and event bursts, leaving a static or very subtle background

## Media presentation

- Public artwork uses WebP thumbnail, card, and detail variants
- Browser selects size through `srcset` and `sizes`
- Dimensions or aspect ratio are always reserved before load
- Hero uses an intentional LCP candidate and selective preload
- Gallery media below the fold is lazy loaded
- MP4 uses poster art, controls when needed, and `preload="none"`
- Originals are not served in public grids

## Responsive behavior

Desktop is the design source, followed by explicit tablet and mobile adaptations.

Suggested layout breakpoints:

- Compact mobile: below 480 px
- Mobile/tablet: 480–767 px
- Tablet/small desktop: 768–1023 px
- Desktop: 1024–1439 px
- Wide desktop: 1440 px and above

Breakpoints are layout decisions, not device detection. Content must remain usable at intermediate widths and browser zoom up to 200%.

## Accessibility

- WCAG 2.2 AA target
- Visible focus indicator on every interactive control
- Full keyboard access for Navbar, Sidebar, Floating Button, tabs, modal, forms, and tables
- Semantic landmarks and heading order
- Thai and English `lang` values update correctly
- Decorative particles are hidden from assistive technology
- All meaningful artwork has localized alternative text
- Status and validation never rely on color alone
- Reduced Motion and sufficient contrast are mandatory

## Layout regression policy

- Home, Portfolio, and Commission each have their own visual regression baseline
- A change to one page layout must not update another page's baseline unless intentionally reviewed
- Shared primitive changes require impact review across all consuming features
- Global Shell changes are tested across public, member, and admin shells
