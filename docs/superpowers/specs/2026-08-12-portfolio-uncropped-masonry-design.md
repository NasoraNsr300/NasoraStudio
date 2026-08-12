# Portfolio Uncropped Masonry Design

## Goal

The public Portfolio keeps the approved four-column dense composition while showing every uploaded artwork without cropping its content.

## Layout

- Desktop uses four equal columns and dense placement.
- Portrait and near-square images occupy one column.
- Sufficiently wide images may occupy two columns using the existing deterministic item-ID rule, so reloads do not reshuffle the gallery.
- Tile height is derived from the source image width and height. The card therefore preserves the original aspect ratio instead of forcing a fixed row height.
- Filtered results rebuild the same deterministic layout from database order.

## Image presentation

- Gallery images render at their natural aspect ratio and are never cropped.
- The card has no artificial empty frame around the image.
- The title remains hidden until hover or keyboard focus.
- Clicking a card continues to open the existing single-image lightbox, which uses `object-fit: contain`.

## Responsive behavior

- The current two-column tablet and one-column mobile breakpoints remain.
- Two-column wide items span the available row on tablet.
- Mobile items become one column and preserve their image ratio.

## Accessibility and performance

- DOM and keyboard order continue to follow database `display_order` even when dense visual placement fills gaps.
- Intrinsic image dimensions remain in markup to prevent layout shift.
- The first visible image stays eager/high-priority; later images remain lazy-loaded.
- Reduced-motion behavior and focus outlines remain unchanged.

## Verification

- Unit contracts verify width-span selection stays deterministic.
- Component tests verify intrinsic aspect-ratio data reaches each tile.
- A CSS contract prevents `object-fit: cover` and fixed grid-row cropping from returning.
- Typecheck, focused tests, and browser inspection cover the final implementation.
