# Nasora Authentication, Session, and Member Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the authentication preview with working Supabase email/password authentication, protect member routes with server-validated sessions, and persist member profile and contact data.

**Architecture:** Public pages keep their static-friendly shell and obtain auth state through a client-side `AuthSessionProvider`; protected member routes validate `auth.getUser()` in a dedicated server layout. Profile and contact persistence lives behind a focused repository, while UI components retain the approved layouts and call small auth/profile operations.

**Tech Stack:** Next.js 16 App Router and `proxy.ts`, React 19, TypeScript 6, Supabase Auth/PostgreSQL/RLS, `@supabase/ssr` 0.12, `@supabase/supabase-js` 2.112, Zod 4, Vitest, Testing Library, Playwright

## Global Constraints

- Email/password sign-up is immediately usable in the temporary development environment without email confirmation.
- Google OAuth remains visibly unavailable until provider credentials are configured.
- Avatar uploads, account deletion automation, customer email notifications, and administrator authentication are excluded.
- Existing public, member, and administrator page layouts must not be redesigned.
- Authenticated member responses must be dynamic and never publicly cached.
- Browser code must never receive a Supabase service-role key.
- Every behavior change follows red-green-refactor and receives a focused test before implementation.

---

## File Structure

- `supabase/migrations/202608060001_member_identity.sql` — profiles, contacts, trigger, default-contact function, indexes, and RLS.
- `src/shared/auth/auth-types.ts` — serializable session identity and auth state types.
- `src/shared/auth/auth-errors.ts` — bilingual, non-enumerating error mapping.
- `src/shared/auth/return-target.ts` — safe same-origin member return-target parsing.
- `src/shared/auth/auth-session-provider.tsx` — browser session lifecycle and auth operations.
- `src/shared/auth/auth-dialog.tsx` — accessible sign-in/sign-up UI only.
- `src/shared/auth/auth-dialog.module.css` — authentication-specific layout and states.
- `src/app/auth/callback/route.ts` — OAuth code exchange and safe redirect.
- `src/proxy.ts` — Supabase cookie refresh for application requests.
- `src/app/[locale]/member/layout.tsx` — server-side member-route protection and cache boundary.
- `src/features/member/data/member-profile-repository.ts` — typed profile/contact reads and mutations.
- `src/features/member/components/member-profile-form.tsx` — nickname and language form.
- `src/features/member/components/member-contact-list.tsx` — contact CRUD and default selection.
- `src/features/member/components/member-password-form.tsx` — password reauthentication and update.
- Existing public shell and profile page files remain composition owners; they do not absorb persistence logic.

---

### Task 1: Member identity schema and row ownership

**Files:**
- Create: `supabase/migrations/202608060001_member_identity.sql`
- Create: `tests/unit/member-identity-migration.test.ts`

**Interfaces:**
- Produces: `public.profiles`, `public.contact_channels`, `public.set_default_contact_channel(uuid)`
- Consumes: Supabase `auth.users` and `auth.uid()`

- [ ] **Step 1: Write the failing migration contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202608060001_member_identity.sql", "utf8");

describe("member identity migration", () => {
  it("creates owned profile and contact tables with RLS", () => {
    expect(sql).toContain("create table public.profiles");
    expect(sql).toContain("create table public.contact_channels");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).toContain("create function public.set_default_contact_channel");
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- tests/unit/member-identity-migration.test.ts`

Expected: FAIL with `ENOENT` because the migration does not exist.

- [ ] **Step 3: Add the migration**

```sql
create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 60),
  preferred_locale text not null default 'th' check (preferred_locale in ('th', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  value text not null check (char_length(value) between 1 and 200),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index contact_channels_one_default_per_user
  on public.contact_channels(user_id) where is_default;

create function public.create_member_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id, nickname, preferred_locale)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''), split_part(new.email, '@', 1), 'Member'),
    case when new.raw_user_meta_data ->> 'preferred_locale' = 'en' then 'en' else 'th' end
  );
  return new;
end;
$$;

create trigger create_member_profile_after_signup
after insert on auth.users for each row execute function public.create_member_profile();

create function public.set_default_contact_channel(contact_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  update public.contact_channels set is_default = false, updated_at = now()
  where user_id = auth.uid();
  update public.contact_channels set is_default = true, updated_at = now()
  where id = contact_id and user_id = auth.uid();
  if not found then raise exception 'contact_not_found'; end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.contact_channels enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using (auth.uid() = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy contacts_select_own on public.contact_channels for select to authenticated
using (auth.uid() = user_id);
create policy contacts_insert_own on public.contact_channels for insert to authenticated
with check (auth.uid() = user_id);
create policy contacts_update_own on public.contact_channels for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy contacts_delete_own on public.contact_channels for delete to authenticated
using (auth.uid() = user_id);

grant execute on function public.set_default_contact_channel(uuid) to authenticated;
```

- [ ] **Step 4: Run the contract test and apply the migration to the connected development project**

Run: `npm test -- tests/unit/member-identity-migration.test.ts`

Expected: PASS.

Apply the exact file contents in the Supabase SQL editor for project `zrqndtlyojgxjijznlre`, then verify `profiles` and `contact_channels` appear with RLS enabled.

- [ ] **Step 5: Commit the schema**

```powershell
git add -- supabase/migrations/202608060001_member_identity.sql tests/unit/member-identity-migration.test.ts
git commit -m "feat: add member identity schema"
```

---

### Task 2: Auth utilities, session provider, and cookie refresh

**Files:**
- Create: `src/shared/auth/auth-types.ts`
- Create: `src/shared/auth/auth-errors.ts`
- Create: `src/shared/auth/return-target.ts`
- Create: `src/shared/auth/auth-session-provider.tsx`
- Create: `src/proxy.ts`
- Create: `src/app/auth/callback/route.ts`
- Test: `tests/unit/auth-errors.test.ts`
- Test: `tests/unit/return-target.test.ts`
- Test: `tests/components/auth-session-provider.test.tsx`

**Interfaces:**
- Produces: `AuthIdentity`, `AuthSessionProvider`, `useAuthSession()`, `safeMemberReturnTarget(value, locale)`, `localizeAuthError(error, locale)`
- Consumes: `createSupabaseBrowserClient()` and `getSupabaseServerClient()`

- [ ] **Step 1: Write failing tests for safe redirects and auth error copy**

```ts
expect(safeMemberReturnTarget("/th/member/profile", "th")).toBe("/th/member/profile");
expect(safeMemberReturnTarget("https://attacker.example", "th")).toBe("/th/member/requests");
expect(safeMemberReturnTarget("//attacker.example", "en")).toBe("/en/member/requests");
expect(localizeAuthError({ message: "Invalid login credentials" }, "th")).toBe("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
```

- [ ] **Step 2: Run the utility tests and confirm RED**

Run: `npm test -- tests/unit/auth-errors.test.ts tests/unit/return-target.test.ts`

Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement the minimal utility contracts**

```ts
export function safeMemberReturnTarget(value: string | null | undefined, locale: Locale) {
  const fallback = `/${locale}/member/requests`;
  if (!value?.startsWith(`/${locale}/member/`) || value.startsWith("//")) return fallback;
  return value;
}

export function localizeAuthError(error: { message?: string }, locale: Locale) {
  const invalid = locale === "th" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : "Incorrect email or password";
  if (error.message?.toLowerCase().includes("invalid login")) return invalid;
  return locale === "th" ? "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง" : "Something went wrong. Please try again";
}
```

- [ ] **Step 4: Write a failing provider test**

Test that `AuthSessionProvider` exposes `status: "loading" | "signedOut" | "signedIn"`, updates after `onAuthStateChange`, and calls `signOut()` through its injected auth client.

- [ ] **Step 5: Run the provider test and confirm RED**

Run: `npm test -- tests/components/auth-session-provider.test.tsx`

Expected: FAIL because the provider does not exist.

- [ ] **Step 6: Implement the session provider, proxy, and callback**

The provider must call `auth.getUser()` once, subscribe with `auth.onAuthStateChange`, expose `signIn`, `signUp`, `signOut`, and `updatePassword`, and unsubscribe on unmount. `src/proxy.ts` must refresh cookies through `createServerClient` and match all routes except static assets. The callback exchanges `code` and redirects only through `safeMemberReturnTarget`.

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- tests/unit/auth-errors.test.ts tests/unit/return-target.test.ts tests/components/auth-session-provider.test.tsx`

Expected: PASS.

```powershell
git add -- src/shared/auth src/proxy.ts src/app/auth/callback/route.ts tests/unit/auth-errors.test.ts tests/unit/return-target.test.ts tests/components/auth-session-provider.test.tsx
git commit -m "feat: add Supabase auth session lifecycle"
```

---

### Task 3: Real authentication dialog and floating-account states

**Files:**
- Create: `src/shared/auth/auth-dialog.tsx`
- Create: `src/shared/auth/auth-dialog.module.css`
- Modify: `src/shared/components/public-shell/public-shell.tsx`
- Modify: `src/shared/components/public-shell/account-button.tsx`
- Modify: `src/shared/components/public-shell/account-menu.tsx`
- Modify: `src/shared/components/public-shell/sidebar.tsx`
- Delete: `src/shared/components/public-shell/auth-preview.tsx`
- Modify: `tests/components/public-shell.test.tsx`
- Create: `tests/components/auth-dialog.test.tsx`

**Interfaces:**
- Consumes: `useAuthSession()`, `localizeAuthError()`, `safeMemberReturnTarget()`
- Produces: `AuthDialog({ locale, onClose, returnTarget })`

- [ ] **Step 1: Replace preview assertions with failing authentication behavior tests**

Cover these separate cases: signed-out Account opens the login dialog; the dialog switches to sign-up; blank fields are rejected; a valid sign-in calls `signIn`; sign-up passes `{ nickname, preferred_locale }`; Google is rendered disabled with “ยังไม่เปิดใช้งาน”; signed-in Account shows nickname, Notifications, Member Area, and Sign out.

- [ ] **Step 2: Run focused component tests and confirm RED**

Run: `npm test -- tests/components/auth-dialog.test.tsx tests/components/public-shell.test.tsx`

Expected: FAIL because the preview still renders and real auth controls are absent.

- [ ] **Step 3: Implement `AuthDialog` with accessible form states**

Use one dialog component with `mode: "signIn" | "signUp"`, Zod validation, disabled pending controls, `aria-live="polite"` feedback, Escape close, focus restoration, and the existing public-shell visual language. Sign-up calls:

```ts
await signUp({
  email,
  password,
  options: { data: { nickname, preferred_locale: locale } },
});
```

- [ ] **Step 4: Replace `AuthPreviewProvider` with `AuthSessionProvider`**

`PublicShell` wraps its content in `AuthSessionProvider`. `AccountButton` renders `AuthDialog` when signed out and `AccountMenu` when signed in. Sidebar “เข้าสู่ระบบ” opens the same dialog state through a small shared auth-dialog controller rather than importing layout code.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- tests/components/auth-dialog.test.tsx tests/components/public-shell.test.tsx`

Expected: PASS.

```powershell
git add -- src/shared/auth src/shared/components/public-shell tests/components/auth-dialog.test.tsx tests/components/public-shell.test.tsx
git commit -m "feat: connect floating account authentication"
```

---

### Task 4: Server-protected member routes

**Files:**
- Create: `src/app/[locale]/member/layout.tsx`
- Create: `tests/unit/member-route-guard.test.ts`
- Modify: `src/shared/auth/return-target.ts`

**Interfaces:**
- Consumes: `getSupabaseServerClient()`, `safeMemberReturnTarget()`
- Produces: a dynamic member layout that renders children only for `auth.getUser()` success

- [ ] **Step 1: Extract and test the guard decision**

```ts
expect(memberAccessDecision(null, "th", "/th/member/profile")).toEqual({
  allowed: false,
  redirectTo: "/th?auth=1&next=%2Fth%2Fmember%2Fprofile",
});
expect(memberAccessDecision({ id: "user-1" }, "th", "/th/member/profile")).toEqual({ allowed: true });
```

- [ ] **Step 2: Run the guard test and confirm RED**

Run: `npm test -- tests/unit/member-route-guard.test.ts`

Expected: FAIL because `memberAccessDecision` is missing.

- [ ] **Step 3: Implement the guard and member layout**

Export `dynamic = "force-dynamic"` and `revalidate = 0`. Resolve the current localized member path from request headers set by `proxy.ts`, call `auth.getUser()`, and redirect signed-out visitors to the localized entry with encoded `next`. Do not trust a client cookie as user identity without `getUser()` verification.

- [ ] **Step 4: Verify member and public route behavior**

Run: `npm test -- tests/unit/member-route-guard.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: all member routes are dynamic and the build succeeds.

- [ ] **Step 5: Commit**

```powershell
git add -- src/app/[locale]/member/layout.tsx src/shared/auth/return-target.ts tests/unit/member-route-guard.test.ts
git commit -m "feat: protect member routes with Supabase session"
```

---

### Task 5: Profile and contact persistence

**Files:**
- Create: `src/features/member/data/member-profile-repository.ts`
- Create: `src/features/member/components/member-profile-form.tsx`
- Create: `src/features/member/components/member-contact-list.tsx`
- Create: `src/features/member/components/member-password-form.tsx`
- Modify: `src/features/member/components/member-profile-page.tsx`
- Modify: `src/features/member/components/member-pages.module.css`
- Create: `tests/unit/member-profile-repository.test.ts`
- Create: `tests/components/member-profile-forms.test.tsx`

**Interfaces:**
- Produces: `MemberProfile`, `ContactChannel`, `loadMemberProfile(userId)`, `updateMemberProfile(input)`, `addContact(input)`, `updateContact(input)`, `removeContact(id)`, `setDefaultContact(id)`
- Consumes: authenticated `AuthIdentity`, Supabase browser client, and `useAuthSession().updatePassword`

- [ ] **Step 1: Write failing repository tests**

Assert that profile reads filter by `user_id`, profile writes never accept a different owner ID, contact inserts always use the current authenticated user ID, and setting a default calls `rpc("set_default_contact_channel", { contact_id })`.

- [ ] **Step 2: Run repository tests and confirm RED**

Run: `npm test -- tests/unit/member-profile-repository.test.ts`

Expected: FAIL because the repository is missing.

- [ ] **Step 3: Implement typed repository methods**

Validate nickname, locale, contact kind, and contact value with Zod before sending mutations. Return discriminated results:

```ts
type MutationResult<T> = { ok: true; data: T } | { ok: false; message: string };
```

- [ ] **Step 4: Write failing form tests**

Cover nickname save, locale save, contact add/edit/remove/default, password mismatch, current-password reauthentication, successful password update, retained field values on failure, and localized success/error announcements.

- [ ] **Step 5: Run form tests and confirm RED**

Run: `npm test -- tests/components/member-profile-forms.test.tsx`

Expected: FAIL because the form components are missing.

- [ ] **Step 6: Implement focused forms and compose the approved profile page**

Keep the existing card layout and fixture avatar. Replace `defaultValue` fixtures with authenticated email/profile/contact props and focused client forms. Password change first calls `signInWithPassword` with the current email/password, then `updateUser({ password: newPassword })`.

- [ ] **Step 7: Run tests and commit**

Run: `npm test -- tests/unit/member-profile-repository.test.ts tests/components/member-profile-forms.test.tsx`

Expected: PASS.

```powershell
git add -- src/features/member/data src/features/member/components/member-profile-page.tsx src/features/member/components/member-profile-form.tsx src/features/member/components/member-contact-list.tsx src/features/member/components/member-password-form.tsx src/features/member/components/member-pages.module.css tests/unit/member-profile-repository.test.ts tests/components/member-profile-forms.test.tsx
git commit -m "feat: persist member profile and contacts"
```

---

### Task 6: Connected-project verification and production checks

**Files:**
- Modify: `.env.example` only if an auth redirect variable is required
- Create: `tests/e2e/auth-member-profile.spec.ts`
- Modify: `docs/testing/public-preview-checklist.md`

**Interfaces:**
- Consumes: deployed development schema, Supabase email/password Auth, protected routes, and profile UI
- Produces: repeatable end-to-end authentication verification

- [ ] **Step 1: Configure development auth behavior**

In Supabase Auth settings for project `zrqndtlyojgxjijznlre`, keep email sign-ups enabled, disable mandatory email confirmation for the development phase, set the local Site URL to `http://localhost:3000`, and add `http://localhost:3000/auth/callback` to allowed redirects. Keep Google disabled.

- [ ] **Step 2: Write the end-to-end auth flow**

Use a unique test email supplied through `E2E_MEMBER_EMAIL` and `E2E_MEMBER_PASSWORD`. Cover sign-in, opening `/th/member/profile`, updating nickname, adding a Discord contact, refreshing to confirm persistence, changing back to the original nickname, signing out, and verifying the protected route redirects to auth.

- [ ] **Step 3: Run all focused checks**

```powershell
npm test -- tests/unit/auth-errors.test.ts tests/unit/return-target.test.ts tests/unit/member-route-guard.test.ts tests/unit/member-profile-repository.test.ts tests/unit/member-identity-migration.test.ts tests/components/auth-session-provider.test.tsx tests/components/auth-dialog.test.tsx tests/components/public-shell.test.tsx tests/components/member-profile-forms.test.tsx
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit 0. If the repository-wide lint still reports an unrelated legacy error, run ESLint on every file changed by this plan and record the exact legacy path separately.

- [ ] **Step 4: Run browser verification**

Run: `npx playwright test tests/e2e/auth-member-profile.spec.ts`

Expected: PASS with configured test credentials. Also inspect Thai and English dialog copy at 1920×1080 and verify the approved public/member layouts are unchanged.

- [ ] **Step 5: Commit verification assets**

```powershell
git add -- .env.example tests/e2e/auth-member-profile.spec.ts docs/testing/public-preview-checklist.md
git commit -m "test: verify member authentication flow"
```

---

## Final Acceptance Gate

- [ ] Email/password sign-up, sign-in, refresh persistence, and sign-out work against the connected Supabase project.
- [ ] Signed-out users cannot render member route content.
- [ ] Profile nickname, locale, contacts, default contact, and password mutations work for the signed-in user.
- [ ] RLS prevents cross-user profile and contact access.
- [ ] Google is present but unavailable while the provider is disabled.
- [ ] Floating account state reflects the real session without redesigning approved pages.
- [ ] Focused tests, typecheck, lint for changed files, production build, and browser verification pass.
