# Nasora Home Desktop Mockup-Fidelity Design

## Purpose

Bring the implemented Home page into close visual alignment with the approved desktop mockup at `E:\NasoraStudio\mockups\nasora-home-night-v1.png`. This iteration intentionally addresses one page at a time. It redesigns Home and removes the shared Navbar compact-on-scroll behavior; it does not redesign the other page layouts or add responsive adaptations.

## Approved direction

- Use the approved mockup as the primary source for composition, density, proportions, hierarchy, and surface treatment.
- Preserve Nasora's Night theme, content model, locale behavior, accessibility, static-first rendering, and Hero randomization contract.
- Reduce the excessive empty space in the current implementation.
- Keep the page centered in a narrower desktop container.
- Show four Featured artworks while additional items remain clipped outside the viewport and flow continuously in an infinite loop.

This design supersedes the earlier compact-on-scroll Navbar requirement and the seven-second stepped Featured carousel behavior for the Home experience.

## Scope

### Included

- Shared Floating Navbar remains full-size at every scroll position.
- Desktop Home composition and styling.
- Hero density, proportions, and media presentation.
- Continuous Featured artwork loop showing four items.
- Home Quick Info panel placement and styling.
- Desktop visual-regression baseline and focused interaction tests.

### Excluded

- Responsive, tablet, and mobile redesign.
- Visual redesign of Portfolio, Commission, Queue, Documents, Member, or Admin pages.
- Backend, authentication, forms, or content-management changes.
- Replacement production artwork; existing fixture derivatives remain valid until the user supplies final work.

The Navbar behavior change is shared and therefore appears on every public page, but other page compositions remain untouched.

## Desktop composition

The visual target is the approved `1920×1080` mockup.

- A centered shell uses approximately 88% of the viewport width with a maximum width near 1680px.
- Navbar, Hero, Featured strip, and Quick Info panel share the same horizontal alignment.
- The first viewport should contain the Navbar, complete Hero, Featured strip, and Quick Info panel with only modest safe spacing.
- Display typography is reduced from the oversized current implementation and follows the mockup hierarchy.
- Background stars remain atmospheric and must not create large layout gaps.

## Floating Navbar

- Retain the capsule structure shown in the mockup.
- Keep a constant height and padding while scrolling; remove compact state, compact attributes, and scroll listeners.
- Preserve menu, Nasora identity, contextual search, availability, Queue, language, and theme controls.
- Login remains exclusively in the bottom-right Floating Account Button.
- Maintain a minimum 44×44px target, visible focus, and correct nested-route active state in Sidebar.

## Hero

- Use a compact two-column layout: copy on the left and artwork on the right.
- Keep the mockup's visual balance, gold/lavender accents, short supporting paragraph, and two actions.
- The image frame uses the approved celestial border treatment without excessive glass blur.
- Randomly select one enabled Hero image once when the page opens or refreshes, then keep it stable for that visit.
- Preserve responsive derivative markup and the intended LCP preload contract even though responsive layout styling is deferred.
- Missing Hero data must continue to fail clearly rather than rendering a broken empty frame.

## Featured artwork loop

- Show four artwork cards within a clipped viewport on the desktop target.
- Render additional cards off-canvas in the same track.
- Move the track continuously at a slow, constant visual speed and loop without a visible jump.
- Duplicate only the minimum rendered sequence required for a seamless loop; do not duplicate repository records or React state.
- Pause while hovered, keyboard-focused, or when the document is hidden.
- Provide a small visible Play/Pause control near the section heading.
- With Reduced Motion, disable automatic movement and leave a stable four-item row that remains keyboard navigable.
- Artwork cards use stored thumbnail/card derivatives with reserved dimensions and no Worker-side image conversion.

## Quick Info panel

- Place the Home-only panel to the right of the Featured strip, matching the mockup.
- Preserve About, Queue, Terms, and Contact tabs.
- Keep text concise enough to avoid increasing the first-viewport height.
- Selected tabs have clear text, underline, and programmatic state.

## Component boundaries

- `HomePage` owns the desktop composition.
- `HomeHero` owns Hero selection and media presentation.
- `FeaturedCarousel` owns only the continuous loop, pause conditions, and Featured cards.
- `QuickInfoPanel` remains Home-owned.
- `FloatingNavbar` removes compact behavior without importing Home styles.
- No Home composite component may import Portfolio or Commission layout code.

## Testing and acceptance

- Unit/component tests confirm the Navbar never compacts after scroll.
- Featured loop tests confirm a four-item viewport contract, seamless duplicate track, Play/Pause control, hover/focus pause, hidden-document pause, and Reduced Motion behavior.
- Hero stability and responsive-derivative tests remain green.
- Desktop Playwright checks use the `1920×1080` target and confirm the primary Home regions fit the intended first viewport.
- A new Home visual baseline is compared directly against the approved mockup during visual QA.
- Existing accessibility, locale, static generation, privacy, Next build, and OpenNext gates remain green.
- Other public page visual baselines must not be intentionally redesigned in this iteration; only the shared constant-size Navbar difference is accepted.

## Completion boundary

After the Home implementation passes automated and visual checks, stop and present the Home page to the user. Do not begin the next page until the user reviews and approves Home.
