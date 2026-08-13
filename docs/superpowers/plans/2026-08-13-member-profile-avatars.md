# Member profile avatars implementation plan

> Execute this plan inline in the current worktree. Do not delegate. Follow TDD for every behavior change and preserve the approved member layouts.

**Goal:** Let the signed-in member upload one private, center-cropped 512×512 WebP avatar that immediately synchronizes across Profile, member Sidebar, and the floating account menu.

**Architecture:** The browser creates the single 512×512 WebP derivative for Cloudflare Workers compatibility. The same-origin member gateway independently verifies its WebP bytes and exact dimensions, writes it to private R2, confirms metadata, then calls a service-only guarded Supabase command that atomically activates the new media row and schedules the previous object for cleanup. Browsers receive only an opaque media UUID and an authenticated same-origin media URL.

**Stack:** Next.js 16, React 19, Supabase Auth/Postgres/RLS, Cloudflare Workers/OpenNext, private R2, Vitest/Testing Library, Playwright.

---

## Task 1: Database ownership and atomic replacement

**Files**
- Create: `supabase/migrations/<timestamp>_member_profile_avatars.sql`
- Create: `src/features/member/data/__tests__/member-avatar-migration-contract.test.ts`

1. Write RED contract tests requiring:
   - `profile_avatar_media` stores opaque ID, owner ID, private `member-avatars/<uuid>.webp` key, WebP metadata, state, timestamps.
   - `profiles.avatar_media_id` references media but never stores an object key or URL.
   - authenticated users cannot directly mutate media metadata or invoke the service gateway.
   - service-only finalize locks the profile, verifies the media owner, activates the new row, updates the profile, marks the previous row pending cleanup, and enqueues an avatar cleanup task atomically.
   - owner-safe projection exposes only `avatar_media_id`.
2. Generate the migration with Supabase CLI and implement the smallest SQL that satisfies the contracts.
3. Run the focused contract test and `npm run typecheck`.
4. Commit the checkpoint.

## Task 2: Exact centered WebP derivative

**Files**
- Create: `src/features/member/domain/member-avatar.ts`
- Create: `src/features/member/client/normalize-member-avatar.ts`
- Create: `src/features/member/domain/__tests__/member-avatar.test.ts`
- Create: `src/features/member/client/__tests__/normalize-member-avatar.test.ts`

1. Write RED tests for file type/size checks, exact WebP header/dimensions, and centered square crop coordinates for landscape/portrait/square inputs.
2. Implement a pure crop calculator and avatar URL projector.
3. Implement browser conversion using `createImageBitmap` plus OffscreenCanvas/canvas: crop shortest centered square, resize to exactly 512×512, encode WebP, close bitmap, and inspect the output.
4. Run focused tests and typecheck.
5. Commit the checkpoint.

## Task 3: Private R2 upload and authenticated read gateways

**Files**
- Modify: `src/features/collaboration/storage/r2-private-assets.server.ts`
- Create: `src/features/member/data/member-avatar-repository.server.ts`
- Create: `src/features/member/server/persist-member-avatar.server.ts`
- Create: `src/app/api/member/profile/avatar/route.ts`
- Create: `src/app/api/member/profile/avatar/[mediaId]/route.ts`
- Create tests beside each route/repository/server module.

1. Write RED tests for exact same-origin multipart POST, authenticated user requirement, 5 MiB hard cap, WebP-only output, exact 512 dimensions, opaque attempt-specific key, R2 PUT/HEAD agreement, guarded finalize, and best-effort orphan cleanup.
2. Extend the R2 key allowlist with `member-avatars/` without exposing signing URLs to the client.
3. Implement the server repository using cookie-auth `getUser` plus service-role RPCs; never accept a client user ID.
4. Implement POST `/api/member/profile/avatar` returning only `{ avatarMediaId, avatarUrl }`.
5. Implement owner-only GET `/api/member/profile/avatar/[mediaId]` with safe content headers and private revalidation caching.
6. Run focused tests, typecheck, and lint for touched files.
7. Commit the checkpoint.

## Task 4: Shared avatar presentation and session synchronization

**Files**
- Modify: `src/shared/auth/auth-types.ts`
- Modify: `src/shared/auth/auth-session-provider.tsx`
- Create: `src/shared/components/member-avatar/member-avatar.tsx`
- Create: `src/shared/components/member-avatar/member-avatar.module.css`
- Create: `src/shared/components/member-avatar/__tests__/member-avatar.test.tsx`
- Modify auth session tests.

1. Write RED tests for `avatarMediaId` projection from authenticated profile state, success-only local updates, URL rendering, and fallback to nickname initial after image error.
2. Add `avatarMediaId` and `updateAvatarMediaId` to the session without changing admin authorization metadata.
3. Implement `MemberAvatar` as presentation only; it must not own Sidebar/account/Profile layout.
4. Run focused tests and typecheck.
5. Commit the checkpoint.

## Task 5: Approved Profile-card editor and all consumers

**Files**
- Create: `src/features/member/components/member-avatar-editor.tsx`
- Create: `src/features/member/components/__tests__/member-avatar-editor.test.tsx`
- Modify: `src/features/member/components/member-profile-form.tsx`
- Modify: `src/features/member/components/member-profile-page.tsx`
- Modify: `src/features/member/components/member-sidebar.tsx`
- Modify: `src/shared/components/public-shell/account-menu.tsx`
- Modify: `src/shared/components/public-shell/account-button.tsx`
- Modify only the related avatar rules in existing CSS modules.

1. Write RED component tests for drag/drop/select, local preview, disabled busy state, localized validation/upload errors, retry, success sync, and fallback.
2. Add the compact editor beside the existing Profile avatar; do not redesign the card.
3. Replace fallback-only renderers in Sidebar and account menu with `MemberAvatar` while preserving their independent layouts and existing dimensions.
4. Load the profile avatar ID once into session state and update it after successful upload without sign-out or reload.
5. Run focused component/auth tests, typecheck, and lint.
6. Commit the checkpoint.

## Task 6: Maintenance cleanup integration

**Files**
- Modify: `src/features/collaboration/cleanup/collaboration-cleanup.server.ts`
- Modify cleanup migration/RPC contract through the new avatar migration (do not edit already-applied migrations).
- Modify cleanup tests.

1. Write RED tests for claimed avatar cleanup tasks deleting only `member-avatars/` keys and completing metadata state after R2 deletion.
2. Extend cleanup task claim/complete behavior through the new migration and update the service schema.
3. Verify cleanup failure remains retryable and never rolls back the new avatar.
4. Run focused cleanup tests and typecheck.
5. Commit the checkpoint.

## Task 7: Browser lifecycle and live migration

**Files**
- Modify/create: `e2e/member-profile-avatar.spec.ts`
- Modify: `scripts/reset-test-customer.mjs` only if deterministic avatar cleanup is required.

1. Add E2E for the single ordinary customer account: upload from Profile, see Profile/Sidebar/account menu, reload, replace, and restore/clean state.
2. Apply the generated migration to linked Supabase only after unit/route/component tests pass.
3. Run the live E2E with a workspace image fixture and verify private media access rejects another/no session.
4. Do not deploy production.

## Task 8: Full verification

1. Run `npm test -- --maxWorkers=2`.
2. Run `npm run typecheck` and `npm run lint`.
3. Run `npm run build`.
4. Run `npx opennextjs-cloudflare build`.
5. Run the relevant Browser E2E.
6. Inspect `git diff --check`, confirm no object keys/secrets/public URLs reach client bundles, and commit the final verified checkpoint.

## Acceptance checklist

- PNG/JPEG/WebP ≤5 MiB accepted; malformed or oversized files rejected.
- Stored derivative is exactly 512×512 WebP and original is not retained.
- Only the owner can upload/read; client never receives R2 object key or credentials.
- Replacement is atomic; old object cleanup is retryable.
- Profile, Sidebar, and floating account menu synchronize immediately and survive reload.
- Existing nickname initial remains the fallback.
- Approved layout remains intact and surrounding components remain independent.
- No production deploy is performed while readiness blockers remain.
