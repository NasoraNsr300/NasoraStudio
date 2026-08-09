# Task 4 — Customer Quote and Deposit Instructions

## Status

Complete. Member request rows with a sent quote now link to a member-only quote detail. The detail loads the request ownership row and quote snapshots through the authenticated browser Supabase client and existing RLS policies. It exposes the total, deposit, outstanding amount, scope, items, expiry, and a payment-handoff CTA.

## Files

- Created `src/features/member/data/member-quote-repository.ts`
- Created `src/features/member/components/member-quote-panel.tsx`
- Created `src/features/member/components/member-request-quote-page.tsx`
- Created `src/app/[locale]/member/requests/[requestId]/page.tsx`
- Updated `src/features/member/components/member-requests-page.tsx`
- Updated `src/features/member/components/member-pages.module.css`
- Created `tests/unit/member-quote-repository.test.ts`
- Created `tests/components/member-quote-panel.test.tsx`
- Updated `tests/components/member-requests-page.test.tsx`

## TDD evidence

1. RED: `npm test -- tests/unit/member-quote-repository.test.ts tests/components/member-quote-panel.test.tsx` failed because the new repository and panel modules did not exist.
2. GREEN: the same focused suite passed after the minimal repository and panel implementation.
3. RED: `npm test -- tests/components/member-requests-page.test.tsx` failed because the sent-quote navigation link did not exist.
4. GREEN: the request-page test passed after adding the link.

## Tests and results

- `npm test -- tests/components/member-requests-page.test.tsx tests/unit/member-quote-repository.test.ts tests/components/member-quote-panel.test.tsx` — PASS, 3 files / 11 tests.
- `npm test` — PASS, 62 files / 254 tests.
- `npm run typecheck` — PASS.
- `npx eslint src/features/member/data/member-quote-repository.ts src/features/member/components/member-quote-panel.tsx src/features/member/components/member-request-quote-page.tsx src/features/member/components/member-requests-page.tsx tests/unit/member-quote-repository.test.ts tests/components/member-quote-panel.test.tsx tests/components/member-requests-page.test.tsx` — PASS.
- `git diff --check` — PASS.

## Self-review

- The repository rejects non-UUID request IDs without making a query, checks RLS-visible request ownership before any quote query, and never uses a service role or browser secret.
- It reads only `sent` quotes ordered by descending version, then fetches immutable `quote_items` snapshots. A Guest request produces no RLS-visible ownership row and therefore triggers no quote/item access.
- THB/satang remains authoritative. USD is explicitly approximate display-only.
- Expired (including a sent quote past `expiresAt`) and superseded quote states never present a payment action. There is no separate acceptance control.
- The payment CTA accepts a typed `{ quoteId, requestId, depositSatang }` callback. With no handler (Task 5 absent), it is disabled and explains that payment is not yet available; it neither navigates to a missing route nor records a payment.
- No Guest token portal was added.

## Concerns / handoff

- Task 5 should supply `onPayDeposit` from the payment-intent flow to `MemberQuotePanel` (or the containing page). No payment API, intent creation, or transaction state is included in Task 4.
- Quote status transitions to `expired` are not added here; the UI also defensively treats `expiresAt <= now` as expired.

## Commit

`feat(member): show sent quote and deposit instructions`
