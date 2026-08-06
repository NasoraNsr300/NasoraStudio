# Commission Request Submission Implementation Plan

> **Goal:** Make the approved member and Guest estimate form persist real, private commission requests in Supabase without changing its layout or uploading reference images yet.

**Architecture:** Keep the browser on the publishable Supabase client and expose narrowly scoped PostgreSQL RPCs for atomic submission and member cancellation. Put reusable validation and mapping in the commission feature, keep database access behind a repository, and replace only the static data inside the existing member-request UI.

**Tech stack:** Next.js 16, React 19, TypeScript, Zod 4, Supabase PostgreSQL/Auth/RLS, Vitest, Testing Library.

---

## Task 1: Define the form contract and validation

**Files:**

- Create: `src/features/commission/domain/estimate-request.ts`
- Create: `tests/unit/estimate-request.test.ts`

**Steps:**

1. Write failing tests for required fields, THB-to-satang conversion, budget ordering, deadline validation, text/count limits, legal consent, and RPC payload mapping.
2. Run `npm test -- tests/unit/estimate-request.test.ts` and confirm the expected failures.
3. Implement Zod schemas and typed mapping helpers with no UI dependency.
4. Re-run the focused test until green.
5. Commit only the contract and its test.

## Task 2: Add atomic Supabase submission and cancellation RPCs

**Files:**

- Create: `supabase/migrations/20260806xxxxxx_submit_commission_requests.sql`
- Create: `tests/unit/commission-request-submission-migration.test.ts`
- Update: `tests/unit/core-commission-rls.test.ts`

**Steps:**

1. Write failing migration contract tests for request codes, idempotency keys, function security, member identity derivation, Guest validation, atomic answer insertion, and guarded cancellation.
2. Run the focused migration tests and confirm failure.
3. Add request reference/idempotency columns and indexes.
4. Add `public.submit_commission_request(jsonb)` as a fixed-search-path security-definer function callable only by `anon` and `authenticated`.
5. Derive member profile/contact snapshots inside PostgreSQL; validate Guest identity when unauthenticated.
6. Insert the request and version/legal answers in one transaction; return the stable request ID and public reference code.
7. Add `public.cancel_own_commission_request(uuid)` for authenticated owners in `submitted` or `reviewing` state only.
8. Preserve existing table RLS and avoid granting direct customer writes.
9. Run the focused migration and RLS tests until green.
10. Apply the migration to the linked Supabase project and run security/performance advisors.
11. Commit the migration and tests.

## Task 3: Add the commission-request repository

**Files:**

- Create: `src/features/commission/data/commission-request-repository.ts`
- Create: `tests/unit/commission-request-repository.test.ts`

**Steps:**

1. Write failing tests for RPC submission, current-member listing, profile/default-contact loading, cancellation, and normalized errors.
2. Run the focused repository test and confirm failure.
3. Implement a client-injected repository around the existing browser Supabase client.
4. Keep Supabase row shapes private to the repository and expose domain-level results.
5. Re-run the focused test until green.
6. Commit the repository and test.

## Task 4: Connect authentication and real submission to the existing modal

**Files:**

- Update: `src/features/commission/components/estimate-request-dialog.tsx`
- Update: `src/features/commission/components/commission.module.css`
- Update: `tests/components/service-detail-dialog.test.tsx`
- Create: `tests/components/estimate-request-dialog.test.tsx`

**Steps:**

1. Write failing component tests for automatic member/Guest mode, member identity loading, Guest fields, validation, single-submit locking, error preservation, and success reference code.
2. Confirm the focused component tests fail for behavior rather than environment setup.
3. Convert existing uncontrolled inputs and counters into a typed form state while retaining the exact DOM layout and CSS geometry.
4. Use the existing auth provider to select member or Guest mode automatically; remove mode-changing behavior while preserving the approved visual treatment.
5. Load member nickname/default contact through the repository and use email fallback when necessary.
6. Hide the reference upload area and disable or hide draft behavior for this phase.
7. Submit through the repository, guard duplicate clicks, and render inline loading/error/success states without resizing the modal unexpectedly.
8. Re-run focused tests until green.
9. Commit the modal integration and tests.

## Task 5: Replace static member request data with real history

**Files:**

- Update: `src/features/member/components/member-requests-page.tsx`
- Update: `src/features/member/components/member-pages.module.css`
- Create: `tests/components/member-requests-page.test.tsx`

**Steps:**

1. Write failing tests for loading, empty, error, populated, and cancellable states.
2. Confirm the focused test fails.
3. Load only the authenticated member's requests through the repository, newest first.
4. Populate existing cards, counters, budget text, service snapshot, reference code, and localized status labels with real data.
5. Add cancellation only for `submitted` and `reviewing`, with confirmation and optimistic locking but no layout redesign.
6. Re-run the focused test until green.
7. Commit the member history integration and tests.

## Task 6: Verify the completed phase

**Files:**

- Update if necessary: `ACCEPTANCE_CRITERIA.md`
- Update if necessary: `MIGRATION_PLAN.md`

**Steps:**

1. Run all unit/component tests with `npm test`.
2. Run `npm run typecheck`.
3. Run `npm run lint` and confirm no new warnings or errors.
4. Run `npm run build`.
5. Exercise one Guest and one authenticated member submission against the linked Supabase project using non-production test records, then remove only those exact test records through a safe scoped operation.
6. Verify member history and cancellation while confirming Guest/private cross-user reads fail.
7. Re-run Supabase security and performance advisors.
8. Review the final diff to confirm no unrelated UI changes were introduced.
9. Update roadmap/acceptance documentation only where the implemented behavior changes project status.
10. Commit verification documentation separately if changed.
