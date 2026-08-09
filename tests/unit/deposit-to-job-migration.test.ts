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

function replacementPrivateFunction(name: string) {
  const migration = sql();
  const start = migration.lastIndexOf(`create or replace function private.${name}`);
  if (start === -1) return "";
  return migration.slice(start, migration.indexOf("$$;", start) + 3);
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
    expect(createJob.indexOf("if v_job.id is not null then")).toBeLessThan(createJob.indexOf("if v_payment.kind <> 'deposit' then"));
    expect(createJob).not.toContain("queue.archived_at is null");
    expect(createJob.indexOf("from public.commission_requests request")).toBeLessThan(createJob.indexOf("from public.quotes quote"));
    const core = readFileSync("supabase/migrations/20260806050235_core_commission_database.sql", "utf8").toLowerCase();
    expect(core).toMatch(/unique index queue_entries_one_active_per_job/);
  });

  it("atomically verifies deposit slips and creates jobs in the same service RPC transaction", () => {
    const migration = sql();
    const wrapperStart = migration.lastIndexOf("create or replace function public.gateway_verify_payment_slip");
    const wrapper = migration.slice(wrapperStart, migration.indexOf("$$;", wrapperStart) + 3);
    expect(wrapper).toContain("private.verify_payment_slip");
    expect(wrapper).toContain("private.create_job_from_verified_deposit");
    expect(wrapper).toContain("payment.kind = 'deposit'");
    expect(wrapper.indexOf("private.verify_payment_slip")).toBeLessThan(wrapper.indexOf("private.create_job_from_verified_deposit"));
    const verifyStart = migration.lastIndexOf("create or replace function private.verify_payment_slip");
    const verify = migration.slice(verifyStart, migration.indexOf("$$;", verifyStart) + 3);
    expect(verify).toContain("from public.commission_requests request");
    expect(verify.indexOf("from public.commission_requests request")).toBeLessThan(verify.indexOf("from public.quotes quote"));
    expect(migration).toMatch(/revoke all on function[\s\S]*private\.verify_payment_slip\(uuid, uuid, text, text, uuid\)[\s\S]*from public, anon, authenticated, service_role/);
  });

  it("prevents a verified quote or request from being superseded during conversion", () => {
    const migration = sql();
    expect(migration).toContain("create function private.protect_verified_deposit_conversion");
    expect(migration).toContain("create trigger quotes_protect_verified_deposit");
    expect(migration).toContain("create trigger requests_protect_verified_deposit");
    expect(migration).toContain("verified_deposit_conversion_required");
  });

  it("keeps accepted job quotes payable for installment and final intents without reapplying expiry", () => {
    const eligibility = replacementPrivateFunction("payment_quote_is_payable");
    const createIntent = replacementPrivateFunction("create_payment_intent");
    const recoverIntent = replacementPrivateFunction("get_member_pending_payment_intent");
    const authorizeSlip = replacementPrivateFunction("authorize_payment_slip");
    const verifySlip = replacementPrivateFunction("verify_payment_slip");

    expect(eligibility).toContain("quote.status = 'accepted'");
    expect(eligibility).toContain("job.accepted_quote_id = quote.id");
    expect(eligibility).toContain("job.request_id = quote.request_id");
    expect(eligibility).toContain("job.user_id = p_user_id");
    expect(eligibility).toContain("payment.kind = 'deposit'");
    expect(eligibility).toContain("payment.request_id = quote.request_id");
    expect(eligibility).toContain("payment.user_id = p_user_id");
    expect(eligibility).toContain("p_intent_kind in ('installment', 'final')");
    expect(eligibility).toContain("quote.status = 'sent'");
    expect(eligibility).toContain("quote.expires_at > now()");
    for (const body of [createIntent, recoverIntent, authorizeSlip, verifySlip]) {
      expect(body).toContain("private.payment_quote_is_payable");
    }

    expect(createIntent).toContain("p_amount_satang < 10000");
    expect(createIntent).toContain("payment_below_minimum");
    expect(createIntent).toContain("v_quote.status = 'sent' and v_kind <> 'deposit'");
    expect(createIntent).toContain("payment.request_id = p_request_id");
    expect(createIntent).toContain("payment.user_id = auth.uid()");
    expect(recoverIntent).toContain("intent.user_id, intent.kind");
    expect(authorizeSlip).toContain("p_user_id, v_intent.kind");
    expect(verifySlip).toContain("v_intent.user_id, v_intent.kind");
    expect(authorizeSlip.indexOf("from public.commission_requests request")).toBeLessThan(authorizeSlip.lastIndexOf("from public.payment_intents intent"));
    expect(verifySlip.indexOf("from public.commission_requests request")).toBeLessThan(verifySlip.lastIndexOf("from public.payment_intents intent"));
    const migration = sql();
    const revokeStart = migration.lastIndexOf("revoke all on function private.create_job_from_verified_deposit");
    const revoke = migration.slice(revokeStart, migration.indexOf("from public, anon, authenticated, service_role", revokeStart));
    for (const signature of [
      "private.payment_quote_is_payable(uuid, uuid, uuid, text)",
      "private.create_payment_intent(uuid, uuid, bigint, uuid)",
      "private.get_member_pending_payment_intent(uuid, uuid)",
      "private.authorize_payment_slip(uuid, uuid, text, bigint, uuid, uuid)",
    ]) {
      expect(revoke).toContain(signature);
    }
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
    const jobsGrant = migration.match(/grant select \(([^)]+)\) on public\.jobs to authenticated/)?.[1] ?? "";
    expect(jobsGrant).toContain("guest_display_name");
    const core = readFileSync("supabase/migrations/20260806052810_consolidate_core_commission_policies.sql", "utf8").toLowerCase().replace(/\s+/g, " ");
    expect(core).toContain("jobs_select_own");
    expect(core).toContain("auth.uid()) = user_id");
  });

  it("uses customer-visible initial statuses and never publishes private status labels", () => {
    const migration = sql();
    const createJob = privateFunction("create_job_from_verified_deposit");
    expect(createJob).toContain("status.customer_visible");
    const changeStart = migration.lastIndexOf("create or replace function private.change_job_status");
    const changeStatus = migration.slice(changeStart, migration.indexOf("$$;", changeStart) + 3);
    expect(changeStatus).toContain("if v_status.customer_visible then");
    expect(changeStatus.indexOf("if v_status.customer_visible then")).toBeLessThan(changeStatus.indexOf("status_label_snapshot = v_status.label"));
    expect(changeStatus).toContain("if v_status.is_terminal then");
    expect(changeStatus.indexOf("if v_status.is_terminal then")).toBeGreaterThan(changeStatus.indexOf("end if;"));
    expect(changeStatus).toContain("set archived_at = coalesce(archived_at, now())");
  });

  it("adds the owner/time index used by the upload attempt quota", () => {
    expect(sql()).toMatch(/create index[^;]+payment_slip_upload_attempts[^;]+\(user_id, created_at desc\)/);
  });
});
