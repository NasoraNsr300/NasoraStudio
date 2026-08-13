# Member profile avatar design

## Goal

Allow an authenticated member to replace their profile image from the existing Profile card. The image must update consistently across the member Sidebar, floating account menu, and every member-area surface without redesigning the approved layout.

## User experience

- Keep the current Profile card and add one compact avatar upload control beside the existing avatar preview.
- Accept drag-and-drop or file selection for PNG, JPEG, and WebP files up to 5 MiB.
- Show an immediate local preview while the file is being processed and uploaded.
- Crop from the center to a square automatically. The user does not manually pan or zoom.
- Produce one 512×512 WebP avatar and discard the original upload.
- Disable the save/upload action while processing. Show a clear localized error if validation, conversion, upload, or persistence fails.
- After success, update the current screen immediately and synchronize the image to the member Sidebar and floating account menu without requiring sign-out.
- If no avatar exists or the image cannot load, preserve the existing nickname-initial fallback.

## Data and storage

- Add a nullable avatar reference to the existing owned `profiles` row. It stores an opaque media identifier, not a public URL or R2 object key.
- Add an owned avatar-media record containing the member ID, private R2 object key, content type, byte size, normalized ETag, creation time, and replacement/deletion state.
- Store the generated file in the existing private-assets R2 bucket under an attempt-specific, unguessable member-avatar key.
- Serve avatars through an authenticated same-origin media route. The browser never receives R2 credentials or an object key.
- A successful replacement atomically points the profile at the new media record and marks the previous record for cleanup. Failed or abandoned uploads must not replace the current avatar.
- The existing maintenance cleanup path removes superseded avatar objects. Database history may retain non-sensitive audit metadata, but not a public bearer URL.

## Security and validation

- Only the authenticated profile owner can authorize, finalize, read, or replace their avatar.
- RLS and guarded database commands enforce ownership; client-provided user IDs are never trusted.
- The same-origin upload route enforces a 5 MiB streaming hard limit, declared MIME validation, decoded image validation, and output WebP verification.
- Image processing rejects malformed, truncated, oversized-dimension, or unsupported files before persistence.
- The public UI receives only a same-origin avatar route containing an opaque media ID.
- Admin-only authorization remains based on `app_metadata.role`; avatar metadata never affects authorization.

## Image processing

- Decode the source image, honor its orientation, and calculate a centered square crop using the shortest source dimension.
- Resize the crop to exactly 512×512 pixels and encode as WebP with a balanced quality setting.
- Perform conversion once during upload; page requests serve the stored derivative and do not invoke runtime transforms.
- Do not retain the original upload.

## Component boundaries

- `MemberAvatarEditor`: file selection, drag-and-drop, local preview, progress, validation feedback, and retry state inside the existing Profile card.
- Avatar upload gateway: authenticated streaming upload, server-side conversion, private R2 write, metadata verification, and guarded finalize/cleanup behavior.
- Avatar media route: authenticated owner read with immutable caching keyed by media ID.
- `MemberAvatar`: shared presentation component used independently by member Sidebar and account menu, with an initial fallback and image-error recovery.
- Auth session: carries the opaque avatar media ID and exposes a success-only local update so all mounted consumers synchronize immediately.

The shared avatar presentation component does not combine the surrounding Sidebar, account menu, or Profile layouts. Those layouts remain independent.

## Failure behavior

- Invalid type, excessive size, or unreadable image: reject before replacing the existing avatar.
- Conversion or R2 failure: keep the current avatar, preserve a retryable local file state where safe, and show localized feedback.
- Database finalization failure after an R2 write: mark the attempt for cleanup and keep the old avatar authoritative.
- Old-object cleanup failure: do not roll back the new avatar; retry cleanup through maintenance.
- Media read failure: render the nickname initial without exposing storage details.

## Tests and acceptance

- Unit tests cover centered-square crop calculations, file/type/size rejection, and avatar URL projection.
- Component tests cover drag-and-drop, preview, busy/error states, successful synchronization, and fallback after an image error.
- Route and migration contract tests cover owner-only access, upload limits, opaque identifiers, atomic replacement, and cleanup marking.
- Browser E2E uses the single ordinary customer test account to upload an image, observes it in Profile, Sidebar, and account menu, reloads to confirm persistence, replaces it, and restores/cleans the test state.
- Full Vitest, typecheck, lint, Next build, OpenNext build, and Browser E2E gates must pass before deployment.
- No production deployment is part of this feature while the existing readiness blockers remain unresolved.

## Non-goals

- Manual crop, pan, zoom, filters, animation, multiple avatar sizes, public avatar URLs, social-avatar import, and avatar history UI.
- Redesigning the member area, Sidebar, account menu, or Profile card.
