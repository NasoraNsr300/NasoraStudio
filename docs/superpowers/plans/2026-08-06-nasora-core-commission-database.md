# Nasora Core Commission Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Supabase foundation for commission requests, manual quote snapshots, jobs, public queue ordering, status history, adjustments, and audit history.

**Architecture:** One additive PostgreSQL migration creates normalized business tables in `public`, privileged transactional functions in a non-exposed `private` schema, and a security-invoker public queue view. Members receive ownership-scoped reads, Guest private data remains server-only, and administrator authority comes only from `raw_app_meta_data.role`.

**Tech Stack:** Supabase PostgreSQL 17, Row Level Security, PL/pgSQL, Vitest migration-contract tests, Supabase MCP/CLI.

## Global Constraints

- Store money as integer satang and timestamps as UTC `timestamptz`.
- Enable RLS on every table and view exposed through `public`.
- Grant Data API access explicitly; RLS and grants are separate controls.
- Never authorize from `raw_user_meta_data`; admin checks use `raw_app_meta_data` only.
- Members can read only their own private business records and cannot mutate quotes, jobs, queue order, status history, or audits.
- Guest private data is never readable by `anon` or ordinary `authenticated` roles.
- Preserve accepted quote, adjustment, status, and audit history permanently.
- Do not add payment, messaging, delivery, R2, or email tables in this migration.
- Do not modify approved UI files.

---

## File map

- Create through `npx supabase migration new core_commission_database`, then normalize the empty generated filename to `supabase/migrations/202608060002_core_commission_database.sql` — schema, constraints, indexes, RLS, view, functions, and workflow seed.
- Create: `tests/unit/core-commission-migration.test.ts` — static migration contract and safety assertions.
- Create: `tests/unit/core-commission-domain.test.ts` — TypeScript status and money-domain contract consumed by later feature repositories.
- Create: `src/features/commission/domain/core-commission.ts` — stable lifecycle constants and validation schemas without UI coupling.
- Modify: `DATABASE_SCHEMA.md` — mark the implemented core and name deferred migrations.

### Task 1: Freeze lifecycle and money contracts

**Files:**
- Create: `tests/unit/core-commission-domain.test.ts`
- Create: `src/features/commission/domain/core-commission.ts`

**Interfaces:**
- Produces `requestStatusSchema`, `quoteStatusSchema`, `jobTerminalStateSchema`, `moneySatangSchema`, `depositPercentSchema`, and their inferred types.
- Consumed by item 4 request repositories and item 5 administrator mutations.

- [ ] **Step 1: Write the failing domain tests**

```ts
import { describe, expect, it } from "vitest";
import {
  depositPercentSchema,
  moneySatangSchema,
  quoteStatusSchema,
  requestStatusSchema,
} from "@/features/commission/domain/core-commission";

describe("core commission domain", () => {
  it("accepts the persisted request and quote lifecycles", () => {
    expect(requestStatusSchema.parse("submitted")).toBe("submitted");
    expect(requestStatusSchema.parse("converted")).toBe("converted");
    expect(quoteStatusSchema.parse("draft")).toBe("draft");
    expect(quoteStatusSchema.parse("superseded")).toBe("superseded");
  });

  it("stores non-negative integer satang and a valid deposit percent", () => {
    expect(moneySatangSchema.parse(650000)).toBe(650000);
    expect(() => moneySatangSchema.parse(10.5)).toThrow();
    expect(() => moneySatangSchema.parse(-1)).toThrow();
    expect(depositPercentSchema.parse(50)).toBe(50);
    expect(() => depositPercentSchema.parse(101)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/core-commission-domain.test.ts`

Expected: FAIL because `src/features/commission/domain/core-commission.ts` does not exist.

- [ ] **Step 3: Implement the domain contract**

```ts
import { z } from "zod";

export const requestStatusSchema = z.enum([
  "submitted", "reviewing", "quoted", "declined", "cancelled", "converted", "closed",
]);
export const quoteStatusSchema = z.enum([
  "draft", "sent", "accepted", "declined", "expired", "closed", "superseded",
]);
export const jobTerminalStateSchema = z.enum(["completed", "cancelled"]);
export const moneySatangSchema = z.number().int().nonnegative().max(2_147_483_647);
export const depositPercentSchema = z.number().int().min(0).max(100);

export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;
export type JobTerminalState = z.infer<typeof jobTerminalStateSchema>;
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/unit/core-commission-domain.test.ts`

Expected: 1 test file and 2 tests pass.

- [ ] **Step 5: Commit the domain contract**

```powershell
git add -- 'tests/unit/core-commission-domain.test.ts' 'src/features/commission/domain/core-commission.ts'
git commit -m "feat: define core commission lifecycle contracts"
```

### Task 2: Create the business tables and constraints

**Files:**
- Create through CLI: `supabase/migrations/202608060002_core_commission_database.sql`
- Create: `tests/unit/core-commission-migration.test.ts`

**Interfaces:**
- Produces `commission_requests`, `request_answers`, `quotes`, `quote_items`, `status_workflows`, `status_definitions`, `jobs`, `job_charge_adjustments`, `job_status_history`, `queue_entries`, and `audit_logs`.
- Later tasks add policies, the safe queue view, functions, and seed rows to the same migration.

- [ ] **Step 1: Create the empty migration with the CLI**

Run: `npx supabase migration new core_commission_database`

Expected: one new file ending in `_core_commission_database.sql`. Verify that its resolved parent is `supabase/migrations`, then rename the empty file to `supabase/migrations/202608060002_core_commission_database.sql` before adding SQL.

- [ ] **Step 2: Write the failing migration contract**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationName = readdirSync("supabase/migrations").find((name) =>
  name.endsWith("_core_commission_database.sql"),
);
if (!migrationName) throw new Error("core commission migration is missing");
const sql = readFileSync(`supabase/migrations/${migrationName}`, "utf8").toLowerCase();

describe("core commission migration", () => {
  it("creates every core business table", () => {
    for (const table of [
      "commission_requests", "request_answers", "quotes", "quote_items",
      "status_workflows", "status_definitions", "jobs", "job_charge_adjustments",
      "job_status_history", "queue_entries", "audit_logs",
    ]) expect(sql).toContain(`create table public.${table}`);
  });

  it("uses integer satang, constrained lifecycles, and ownership shapes", () => {
    expect(sql).toContain("total_satang bigint");
    expect(sql).toContain("current_total_satang bigint");
    expect(sql).toContain("requester_type in ('member', 'guest')");
    expect(sql).toContain("deposit_percent between 0 and 100");
    expect(sql).toContain("quote_request_version_unique");
  });
});
```

- [ ] **Step 3: Run the migration test and verify RED**

Run: `npm test -- tests/unit/core-commission-migration.test.ts`

Expected: FAIL because the new migration is empty.

- [ ] **Step 4: Implement tables, foreign keys, checks, and indexes**

Implement the exact columns from the approved design with these mandatory constraints:

```sql
constraint commission_requests_identity_check check (
  (requester_type = 'member' and user_id is not null and guest_display_name is null and guest_contact_snapshot is null)
  or
  (requester_type = 'guest' and user_id is null and guest_display_name is not null and guest_contact_snapshot is not null)
),
constraint commission_requests_budget_check check (
  budget_min_satang is null or budget_max_satang is null or budget_min_satang <= budget_max_satang
),
constraint quotes_deposit_percent_check check (deposit_percent between 0 and 100),
constraint quotes_amounts_check check (
  total_satang >= 0 and deposit_satang >= 0 and deposit_satang <= total_satang
),
constraint quote_request_version_unique unique (request_id, version),
constraint jobs_identity_check check (
  (user_id is not null and guest_display_name is null and guest_contact_snapshot is null)
  or
  (user_id is null and guest_display_name is not null and guest_contact_snapshot is not null)
),
constraint queue_entries_active_job_unique unique nulls not distinct (job_id, archived_at)
```

Create the indexes named in the approved design, including partial indexes for open requests, expiring quotes, active queue entries, and non-archived jobs.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- tests/unit/core-commission-migration.test.ts`

Expected: both migration tests pass.

- [ ] **Step 6: Commit the table foundation**

```powershell
git add -- 'tests/unit/core-commission-migration.test.ts' 'supabase/migrations/202608060002_core_commission_database.sql'
git commit -m "feat: add core commission business tables"
```

### Task 3: Add RLS and the public queue projection

**Files:**
- Modify: `tests/unit/core-commission-migration.test.ts`
- Modify: `supabase/migrations/202608060002_core_commission_database.sql`

**Interfaces:**
- Produces `public.public_queue_entries` as the only anonymous queue data source.
- Produces ownership-scoped member reads and admin-scoped management policies.

- [ ] **Step 1: Add failing authorization assertions**

```ts
it("enables RLS, grants explicit access, and exposes only the safe queue view", () => {
  expect((sql.match(/enable row level security/g) ?? [])).toHaveLength(11);
  expect(sql).toContain("raw_app_meta_data ->> 'role'");
  expect(sql).not.toContain("raw_user_meta_data ->> 'role'");
  expect(sql).toContain("(select auth.uid()) = user_id");
  expect(sql).toContain("create view public.public_queue_entries with (security_invoker = true)");
  expect(sql).toContain("grant select on public.public_queue_entries to anon, authenticated");
  expect(sql).toContain("revoke all on public.audit_logs from anon, authenticated");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/core-commission-migration.test.ts`

Expected: FAIL on missing RLS and view statements.

- [ ] **Step 3: Implement grants, RLS, and policies**

Create a stable admin predicate in a non-exposed schema and ensure every policy combines role and ownership:

```sql
create schema if not exists private;

create function private.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin', false)
$$;

revoke all on schema private from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
```

Enable RLS on all 11 tables. Grant members SELECT only on owned request/quote/job/history rows. Grant no Guest-private reads. Grant administrator CRUD only where mutable; history and audits are insert/select only through server-side operations. Add a `queue_entries_select_visible` policy, then define the security-invoker view with only `position`, display name, service labels, status labels, deadline, and ordering fields.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/unit/core-commission-migration.test.ts`

Expected: all migration contract tests pass.

- [ ] **Step 5: Commit authorization boundaries**

```powershell
git add -- 'tests/unit/core-commission-migration.test.ts' 'supabase/migrations/202608060002_core_commission_database.sql'
git commit -m "feat: secure core commission records with RLS"
```

### Task 4: Add transactional history functions and workflow seed

**Files:**
- Modify: `tests/unit/core-commission-migration.test.ts`
- Modify: `supabase/migrations/202608060002_core_commission_database.sql`

**Interfaces:**
- Produces `private.adjust_job_total(uuid,bigint,text,text,text)`, `private.change_job_status(uuid,uuid,text,text)`, and `private.reorder_queue_entry(uuid,integer,text)`.
- Produces one `default_commission` workflow with seven ordered definitions.

- [ ] **Step 1: Add failing function and seed assertions**

```ts
it("adds guarded transactional mutations and a default workflow", () => {
  expect(sql).toContain("create function private.adjust_job_total");
  expect(sql).toContain("create function private.change_job_status");
  expect(sql).toContain("create function private.reorder_queue_entry");
  expect(sql).toContain("if not private.is_admin() then");
  expect(sql).toContain("insert into public.job_status_history");
  expect(sql).toContain("insert into public.audit_logs");
  expect(sql).toContain("'default_commission'");
  expect(sql).toContain("'sketching'");
  expect(sql).toContain("'completed'");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/unit/core-commission-migration.test.ts`

Expected: FAIL on missing private functions and seed statements.

- [ ] **Step 3: Implement guarded functions**

Each function must:

1. Raise `admin_required` before reading or changing business rows when `private.is_admin()` is false.
2. Lock the target job or queue row using `for update`.
3. Validate the requested state and amounts.
4. Update the current projection.
5. Append the corresponding history and redacted audit row in the same transaction.
6. Use `security invoker`, `set search_path = ''`, schema-qualified objects, and no dynamic SQL.
7. Revoke execution from `PUBLIC` and `anon`, grant it to `authenticated`, and require `private.is_admin()` inside every function so an admin JWT can call the operations while RLS remains enforced.

Seed the workflow with stable keys `waiting`, `sketching`, `coloring`, `review`, `delivery`, `completed`, and `cancelled`, including Thai/English private and public labels.

- [ ] **Step 4: Verify GREEN and the full local suite**

Run: `npm test -- tests/unit/core-commission-migration.test.ts tests/unit/core-commission-domain.test.ts`

Expected: all focused tests pass.

Run: `npm test -- --reporter=dot`

Expected: all existing and new tests pass.

- [ ] **Step 5: Commit transactional operations**

```powershell
git add -- 'tests/unit/core-commission-migration.test.ts' 'supabase/migrations/202608060002_core_commission_database.sql'
git commit -m "feat: add commission history transactions"
```

### Task 5: Deploy, validate, and document the schema

**Files:**
- Modify: `DATABASE_SCHEMA.md`
- Verify: `supabase/migrations/202608060002_core_commission_database.sql`

**Interfaces:**
- Produces the deployed schema in Supabase project `rmcxkrqgbggaxqptxubd`.
- Produces advisor and query evidence for the next feature implementation.

- [ ] **Step 1: Apply the SQL iteratively to the project**

Use Supabase MCP `execute_sql` with the full migration SQL. If PostgreSQL rejects a statement, fix the migration locally first, rerun the migration contract, and apply the corrected SQL only after understanding the failure.

Expected: all tables, view, functions, policies, indexes, and seed rows are created without partial leftovers.

- [ ] **Step 2: Verify schema and RLS with read-only SQL**

Run queries that assert:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'commission_requests','request_answers','quotes','quote_items','status_workflows',
    'status_definitions','jobs','job_charge_adjustments','job_status_history',
    'queue_entries','audit_logs'
  )
order by relname;

select workflow_id, stable_key, display_order
from public.status_definitions
order by workflow_id, display_order;

select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('commission_requests','quotes','jobs','public_queue_entries')
order by table_name, grantee, privilege_type;
```

Expected: 11 RLS-enabled tables, seven seeded statuses, anonymous SELECT only on the safe queue view, and no anonymous private-table grants.

- [ ] **Step 3: Exercise constraints inside a rolled-back transaction**

Use SQL fixtures inside `begin; ... rollback;` to prove rejection of an invalid member/Guest identity, negative satang, duplicate quote version, and invalid deposit percent. Insert two synthetic auth users only inside the transaction, set JWT claims for each user, and confirm each member can select only their own request/job rows.

Expected: every invalid insert raises its named check or unique constraint, and cross-member selects return zero rows.

- [ ] **Step 4: Run Supabase advisors**

Use `get_advisors` for both `security` and `performance`.

Expected: no actionable schema warnings. The known Free-plan leaked-password warning is unrelated to this migration and must be recorded separately rather than treated as a schema failure.

- [ ] **Step 5: Update the database documentation**

Add an implementation-status note under Requests and Quotes and Jobs/Queue naming the migration file, the deployed project, the implemented tables, and the explicitly deferred payment/message/delivery tables.

- [ ] **Step 6: Run final verification**

```powershell
npm test -- --reporter=dot
npm run lint
npm run typecheck
npm run build
git diff --check
```

Expected: zero failed tests, zero lint errors, successful typecheck and production build, and no whitespace errors.

- [ ] **Step 7: Commit deployment documentation**

```powershell
git add -- 'DATABASE_SCHEMA.md' 'supabase/migrations/202608060002_core_commission_database.sql' 'tests/unit/core-commission-migration.test.ts' 'tests/unit/core-commission-domain.test.ts' 'src/features/commission/domain/core-commission.ts'
git commit -m "docs: record core commission schema deployment"
```
