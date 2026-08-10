# Estimate Request Identity Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate the member and Guest identity sections of the existing estimate modal while retaining automatic auth-derived mode selection and the approved UI layout.

**Architecture:** Keep one estimate workflow and one submission contract. Move member and Guest identity markup into focused components with an identity-only CSS module; the parent dialog derives `member` or `guest` exclusively from the auth session and passes normalized props to the matching component.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, Vitest, Testing Library.

## Global Constraints

- A signed-in user always submits as `member` and cannot switch to Guest.
- A signed-out user always submits as `guest`; signing in is handled outside the identity fields.
- Keep one modal, one three-step workflow, and one repository submission path.
- Do not change the approved visual geometry or the existing Supabase RPC payload.
- Preserve immutable member and Guest identity snapshots at submission time.

---

### Task 1: Extract isolated member and Guest identity components

**Files:**
- Create: `src/features/commission/components/estimate-request-identity.tsx`
- Create: `src/features/commission/components/estimate-request-identity.module.css`
- Create: `tests/components/estimate-request-identity.test.tsx`
- Modify: `src/features/commission/components/commission.module.css`

**Interfaces:**
- Consumes: localized identity labels and auth-derived identity values from `EstimateRequestDialog`.
- Produces: `MemberEstimateIdentity` and `GuestEstimateIdentity` React components.

- [ ] **Step 1: Write failing component tests**

```tsx
render(<MemberEstimateIdentity contact="@nasora" labels={labels} loading={false} nickname="Nasora" />);
expect(screen.getByText("Nasora")).toBeVisible();
expect(screen.getByText("@nasora")).toBeVisible();

render(<GuestEstimateIdentity disabled={false} labels={labels} />);
expect(screen.getByRole("textbox", { name: labels.nickname })).toHaveAttribute("name", "guestDisplayName");
expect(screen.getByRole("combobox", { name: `${labels.contact} method` })).toHaveValue("discord");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run tests/components/estimate-request-identity.test.tsx`

Expected: FAIL because `estimate-request-identity.tsx` does not exist.

- [ ] **Step 3: Implement the two components**

```ts
export type EstimateIdentityLabels = {
  contact: string;
  contactHint: string;
  guestNameHint: string;
  identityLoading: string;
  nickname: string;
};

export function MemberEstimateIdentity(props: {
  contact: string;
  labels: EstimateIdentityLabels;
  loading: boolean;
  nickname: string;
}): React.ReactNode;

export function GuestEstimateIdentity(props: {
  disabled: boolean;
  labels: EstimateIdentityLabels;
}): React.ReactNode;
```

Move only `.memberIdentity`, `.guestIdentity`, `.contactFields`, and `.discordMark` styling into the new CSS module. Keep dimensions and declarations unchanged.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --run tests/components/estimate-request-identity.test.tsx`

Expected: PASS.

### Task 2: Connect auth-derived identity components to the existing modal

**Files:**
- Modify: `src/features/commission/components/estimate-request-dialog.tsx`
- Modify: `tests/components/estimate-request-dialog.test.tsx`

**Interfaces:**
- Consumes: `MemberEstimateIdentity`, `GuestEstimateIdentity`, and the existing `AuthSessionSnapshot`.
- Produces: unchanged `EstimateRequestDialog` props and unchanged RPC payload shape.

- [ ] **Step 1: Add failing behavior assertions**

```tsx
expect(screen.getByRole("button", { name: "Member" })).toBeDisabled();
expect(screen.getByRole("button", { name: "Guest" })).toBeDisabled();
expect(screen.queryByRole("textbox", { name: "Nickname" })).not.toBeInTheDocument();
```

For the signed-out case, assert the inverse: Guest is pressed, Guest fields exist, and no member identity card is rendered.

- [ ] **Step 2: Run the focused test and verify the extraction breaks before integration**

Run: `npm test -- --run tests/components/estimate-request-dialog.test.tsx`

Expected: FAIL after the local identity functions are removed and before imports are connected.

- [ ] **Step 3: Replace local identity functions with focused imports**

```tsx
const customerMode: CustomerMode = session.status === "signedIn" ? "member" : "guest";

{customerMode === "member" ? (
  <MemberEstimateIdentity contact={identity.contact} labels={labels} loading={identityLoading} nickname={identity.nickname} />
) : (
  <GuestEstimateIdentity disabled={disabled} labels={labels} />
)}
```

Keep both visual mode buttons disabled and preserve their `aria-pressed` state. Do not introduce mutable customer-mode state.

- [ ] **Step 4: Run focused regression tests**

Run: `npm test -- --run tests/components/estimate-request-identity.test.tsx tests/components/estimate-request-dialog.test.tsx`

Expected: both files PASS.

### Task 3: Verify the unchanged workflow

**Files:**
- No production file changes expected.

**Interfaces:**
- Consumes: completed identity extraction.
- Produces: verification evidence that submission and UI contracts remain stable.

- [ ] **Step 1: Run all tests with bounded concurrency**

Run: `npm test -- --run --maxWorkers=2`

Expected: all tests PASS without Canvas warnings.

- [ ] **Step 2: Run static verification**

Run: `npm run typecheck` and `npm run lint`

Expected: both commands exit 0.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: all static and dynamic routes build successfully.

- [ ] **Step 4: Review scope**

Run: `git diff --check` and inspect `git diff -- src/features/commission/components tests/components/estimate-request-identity.test.tsx`.

Expected: no whitespace errors, no RPC payload changes, and no unrelated UI changes.
