# Nasora Authentication, Session, and Member Profile Design

## Goal

Replace the authentication preview with working Supabase authentication and connect the existing member area to a real signed-in session and member-owned profile data without changing the approved public or member layouts.

## Scope

This increment includes email/password sign-up, sign-in, sign-out, server-validated sessions, protected member routes, profile editing, multiple contact channels, preferred language, and password changes. Email sign-up is immediately usable during the temporary development phase because custom SMTP and a production domain are not available yet.

Google OAuth is represented in the UI and its callback route is prepared, but the action remains unavailable while the Google provider is disabled in Supabase. Enabling it later only requires provider credentials and redirect configuration; it does not require a UI redesign.

Avatar uploads, account deletion automation, customer email notifications, and administrator authentication are outside this increment. The existing fixture avatar remains visible.

## User Experience

### Signed-out state

- The floating account button opens a real authentication dialog instead of the Stage 2 preview.
- The dialog offers sign-in and sign-up modes in Thai and English.
- Email and password are required. Sign-up also requires a nickname.
- Successful authentication closes the dialog and returns the user to the page they intended to open.
- Google appears as an unavailable option with an explanatory label until the provider is enabled.
- Validation and Supabase errors are translated into concise, actionable messages.

### Signed-in state

- The floating account button opens the existing account menu with Notifications and Member Area.
- The account menu displays the member nickname and offers Sign out.
- Member Area opens `/{locale}/member/requests`.
- Signing out returns the user to the current public locale and removes access to private member routes.

### Protected member area

- Every `/{locale}/member/*` route checks the Supabase session on the server.
- A signed-out visitor is redirected to the localized public page with an auth return target.
- A signed-in member sees the existing approved member UI populated with their identity where applicable.
- Authenticated member responses are dynamic and are never publicly cached.

### Profile

- The profile page reads the authenticated email and member profile.
- Members can update nickname and preferred language.
- Members can add, edit, remove, and choose a default contact channel.
- Members can update their password after confirming the new password in the UI.
- The existing fixture avatar remains until the separate avatar-upload increment.

## Architecture

### Supabase boundary

- `src/shared/supabase/client.ts` remains the browser-client factory.
- `src/shared/supabase/server.ts` remains the cookie-aware server-client factory.
- A request proxy refreshes expired auth cookies before protected routes render.
- Auth actions live in a focused auth feature rather than inside public-shell components.
- Profile queries and mutations live in a focused member profile data module rather than inside page layout components.

### UI boundary

- `AccountButton` only chooses the signed-in or signed-out panel based on session state.
- `AuthDialog` owns sign-in/sign-up form state and accessible dialog behavior.
- `AccountMenu` owns signed-in navigation, notification entry, identity summary, and sign-out.
- `MemberProfilePage` keeps its existing layout and delegates mutations to small profile form components.
- Public, member, and admin layouts remain independent.

## Data Model

### `profiles`

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `nickname text not null`
- `preferred_locale text not null check (preferred_locale in ('th', 'en'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

A database trigger creates a profile from auth metadata after sign-up. A fallback upsert handles older users that predate the trigger.

### `contact_channels`

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `kind text not null`
- `value text not null`
- `is_default boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

A partial unique index allows only one default contact channel per member. The application changes the default in a transaction-safe database function.

## Authorization

- Row Level Security is enabled for `profiles` and `contact_channels`.
- Authenticated members may select and update only the profile whose `user_id` equals `auth.uid()`.
- Authenticated members may select, insert, update, and delete only their own contact channels.
- Public and Guest users cannot read either table.
- Service-role credentials are never exposed to the browser.

## Session and Redirect Flow

1. The browser submits credentials to Supabase Auth.
2. Supabase stores the session in SSR-compatible cookies.
3. The request proxy refreshes cookies when necessary.
4. Protected member route layouts call `auth.getUser()` on the server.
5. Missing users are redirected to the localized public entry with a validated relative return target.
6. Successful sign-in consumes that return target and navigates back to the intended member route.

Only same-origin relative member paths are accepted as return targets to prevent open redirects.

## Error Handling

- Forms disable duplicate submissions and show an in-panel pending state.
- Invalid credentials use a neutral message that does not disclose whether an email exists.
- Weak passwords and duplicate registrations receive localized guidance.
- Profile mutations retain unsaved values when Supabase returns an error.
- Network errors show a retryable message and never clear the existing session.
- Google remains visibly unavailable rather than initiating a provider flow that cannot complete.

## Testing

- Unit tests cover safe return-target parsing and localized auth error mapping.
- Component tests cover sign-in/sign-up modes, validation, pending states, signed-in account menu, sign-out, and profile forms.
- Integration tests cover protected-route redirects and profile/contact ownership behavior against Supabase-compatible clients.
- Browser tests cover sign-up, sign-in, member-route access, profile update, password update, and sign-out when test credentials are available.
- `lint`, `typecheck`, production build, and focused authentication tests must pass before handoff.

## Acceptance Criteria

- The Stage 2 authentication preview no longer appears.
- A visitor can create and use an email/password account immediately in the development environment.
- A signed-in session survives navigation and refresh.
- Signed-out visitors cannot render private member pages.
- A member can update nickname, preferred language, contact channels, and password.
- One member cannot read or mutate another member's profile or contacts.
- The floating account control reflects the real authentication state.
- Google is clearly marked unavailable until its provider credentials are configured.
- Approved public, member, and admin layouts remain visually unchanged outside authentication-specific states.
