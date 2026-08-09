import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260809210000_deposit_to_job_workflow.sql";

function sql() {
  return readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");
}

function privateFunction(name: string) {
  const migration = sql();
  const start = migration.indexOf(`create function private.${name}`);
  const end = migration.indexOf("create function", start + 20);
  return migration.slice(start, end === -1 ? undefined : end);
}

describe("verified deposit to job migration", () => {
  it("atomically converts one verified deposit into the accepted quote, job, history, queue, and audit", () => {
    const migration = sql();
    const createJob = privateFunction("create_job_from_verified_deposit");
    expect(createJob).toContain("from public.payments");
    expect(createJob).toContain("payment.kind <> 'deposit'");
    expect(createJob).toContain("quote.status = 'sent'");
    expect(createJob).toContain("update public.quotes set status = 'accepted'");
    expect(createJob).toContain("update public.commission_requests set status = 'converted'");
    expect(createJob).toContain("insert into public.jobs");
    expect(createJob).toContain("deposit_verified_at");
    expect(createJob).toContain("insert into public.job_status_history");
    expect(createJob).toContain("insert into public.queue_entries");
    expect(createJob).toContain("default_order_at");
    expect(createJob).toContain("v_payment.verified_at");
    expect(createJob).toContain("insert into public.audit_logs");
    expect(migration).not.toMatch(/\bcommit\b|\brollback\b/);
  });

  it("locks the payment and returns the existing job and queue row on replay", () => {
    const createJob = privateFunction("create_job_from_verified_deposit");
    expect(createJob).toContain("for update");
    expect(createJob).toContain("accepted_quote_id = v_payment.quote_id");
    expect(createJob).toContain("if v_job.id is not null then");
    expect(createJob).toContain("return query select v_job.id, v_queue.id");
    const core = readFileSync("supabase/migrations/20260806050235_core_commission_database.sql", "utf8").toLowerCase();
    expect(core).toMatch(/unique index queue_entries_one_active_per_job/);
  });

  it("rejects missing, non-deposit, and non-verified ledgers before any job insert", () => {
    const createJob = privateFunction("create_job_from_verified_deposit");
    const insertIndex = createJob.indexOf("insert into public.jobs");
    expect(createJob.indexOf("verified_deposit_not_found")).toBeLessThan(insertIndex);
    expect(createJob.indexOf("payment.kind <> 'deposit'")).toBeLessThan(insertIndex);
    expect(createJob.indexOf("payment_intent.status <> 'verified'")).toBeLessThan(insertIndex);
  });

  it("keeps the private function uncallable and exposes only a service gateway with explicit grants", () => {
    const migration = sql();
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toMatch(/revoke all on function private\.create_job_from_verified_deposit\(uuid\)[^;]+from public, anon, authenticated, service_role/);
    expect(migration).toMatch(/grant execute on function public\.gateway_create_job_from_verified_deposit\(uuid, uuid\) to service_role/);
    expect(migration).not.toMatch(/grant execute on function private\.create_job_from_verified_deposit[^;]+to authenticated/);
  });

  it("publishes only rank, display name, service, public status, and deadline", () => {
    const migration = sql();
    const view = migration.slice(migration.indexOf("create view public.public_queue"), migration.indexOf("grant select on public.public_queue"));
    expect(view).toContain("security_invoker = true");
    expect(migration).toContain("create function public.read_public_queue");
    expect(migration).toMatch(/public\.read_public_queue\(\)[^$]+security definer set search_path = ''/);
    expect(view).toContain("position");
    expect(view).toContain("customer_display_name");
    expect(view).toContain("service_type_name_snapshot");
    expect(view).toContain("status_label_snapshot");
    expect(view).toContain("deadline");
    expect(view).not.toContain("category_name_snapshot");
    expect(view).not.toMatch(/job_id|user_id|contact|payment|quote/);
  });

  it("removes member access to private notes and Guest jobs while retaining owner history", () => {
    const migration = sql();
    expect(migration).toContain("revoke all on public.jobs, public.job_status_history from authenticated");
    const historyGrant = migration.match(/grant select \(([^)]+)\) on public\.job_status_history to authenticated/)?.[1] ?? "";
    expect(historyGrant).toContain("public_note");
    expect(historyGrant).not.toContain("private_note");
    const core = readFileSync("supabase/migrations/20260806052810_consolidate_core_commission_policies.sql", "utf8").toLowerCase().replace(/\s+/g, " ");
    expect(core).toContain("jobs_select_own");
    expect(core).toContain("auth.uid()) = user_id");
  });

  it("adds the owner/time index used by the upload attempt quota", () => {
    expect(sql()).toMatch(/create index[^;]+payment_slip_upload_attempts[^;]+\(user_id, created_at desc\)/);
  });
});
