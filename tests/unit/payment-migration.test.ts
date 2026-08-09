import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260809200000_payment_deposit_workflow.sql";

function sql() {
  return readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");
}

function privateFunction(name: string) {
  const migration = sql();
  const start = migration.indexOf(`create function private.${name}`);
  const end = migration.indexOf("create function", start + 20);
  return migration.slice(start, end === -1 ? undefined : end);
}

describe("payment deposit workflow migration", () => {
  it("creates permanent payment ledgers and private expiring slip metadata", () => {
    const migration = sql();
    expect(migration).toContain("create table public.payment_intents");
    expect(migration).toContain("create table public.payments");
    expect(migration).toContain("create table public.payment_slips");
    expect(migration).toContain("object_key text not null");
    expect(migration).toContain("delete_after timestamptz not null");
    expect(migration).toContain("uploaded_at = now(), delete_after = now() + interval '30 days'");
  });

  it("enforces one pending deposit intent per quote and immutable verified payments", () => {
    const migration = sql();
    expect(migration).toMatch(/unique index[^;]+payment_intents[^;]+quote_id[^;]+where[^;]+status = 'pending'/);
    expect(migration).toContain("v_intent.amount_satang > v_quote.total_satang - v_paid");
    expect(migration).toContain("payments_prevent_mutation");
    expect(migration).toContain("raise exception 'verified_payments_are_append_only'");
    expect(migration).toMatch(/unique index payments_one_deposit_per_request[^;]+request_id[^;]+where kind = 'deposit'/);
    expect(privateFunction("create_payment_intent")).toContain("raise exception 'payment_intent_pending'");
    const createIntent = privateFunction("create_payment_intent");
    expect(createIntent).toContain("idempotency_key = p_idempotency_key");
    expect(createIntent).toContain("if v_existing.status <> 'pending' then");
    expect(createIntent.indexOf("update public.payment_intents intent set status = 'closed'")).toBeLessThan(createIntent.indexOf("if v_existing.id is not null then"));
    expect(createIntent).not.toContain("intent.payload_fingerprint = v_fingerprint and intent.kind = 'deposit'");
    expect(createIntent).toContain("payment.request_id = p_request_id and payment.kind = 'deposit'");
  });

  it("locks and revalidates the current sent non-expired quote when creating and approving", () => {
    const createIntent = privateFunction("create_payment_intent");
    const verify = privateFunction("verify_payment_slip");
    for (const contract of [createIntent, verify]) {
      expect(contract).toContain("for update");
      expect(contract).toContain("status = 'sent'");
      expect(contract).toMatch(/expires_at is null[^)]+expires_at > now\(\)/);
      expect(contract).toContain("newer.version >");
    }
    expect(createIntent).toContain("deposit_already_verified_for_request");
    expect(verify).toContain("set status = 'closed'");
    expect(verify).toContain("'stale'::text");
  });

  it("allocates private object keys in the trusted database and limits active/rate-limited slips", () => {
    const migration = sql();
    const authorize = privateFunction("authorize_payment_slip");
    expect(authorize).not.toContain("p_object_key");
    expect(authorize).toContain("v_slip_id uuid := gen_random_uuid()");
    expect(authorize).toContain("'payment-slips/' || gen_random_uuid()::text");
    expect(sql()).not.toMatch(/create function public\.member_authorize_payment_slip[^$]+object_key text/);
    expect(sql()).toContain("auth.jwt()) ->> 'role', '') <> 'service_role'");
    expect(sql()).toMatch(/grant execute on function public\.gateway_authorize_payment_slip[^;]+to service_role/);
    expect(migration).toMatch(/object_key[^,]+check[^,]+payment-slips\/\[0-9a-f\]/);
    expect(migration).toMatch(/unique index payment_slips_one_active_per_intent[^;]+status in \('authorized', 'pending_review'\)/);
    expect(authorize).toContain("slip_upload_rate_limited");
    expect(authorize).toContain("created_at > now() - interval '1 hour'");
    expect(authorize).toContain("pg_advisory_xact_lock");
    expect(authorize).toContain("created_at <= now() - interval '10 minutes'");
    expect(authorize).toContain("set status = 'failed'");
    expect(privateFunction("fail_payment_slip")).toContain("status in ('authorized', 'failed')");
  });

  it("exposes only a member-owned current pending intent for reload recovery", () => {
    const migration = sql();
    const recovery = privateFunction("get_member_pending_payment_intent");
    expect(recovery).toContain("request.user_id = auth.uid()");
    expect(recovery).toContain("intent.status = 'pending'");
    expect(recovery).toContain("quote.status = 'sent'");
    expect(recovery).toContain("newer.version > quote.version");
    expect(migration).toContain("create function public.member_get_pending_payment_intent");
    const memberGrant = migration.match(/grant execute on function public\.member_create_payment_intent[^;]+to authenticated/)?.[0] ?? "";
    expect(memberGrant).toContain("public.member_get_pending_payment_intent(uuid, uuid)");
    const exposed = migration.match(/create function public\.member_get_pending_payment_intent[^$]+returns table\(([^)]+)\)/)?.[1] ?? "";
    expect(exposed).toContain("intent_id uuid");
    expect(exposed).not.toMatch(/object_key|etag|fingerprint|idempotency/);
  });

  it("keeps public tables under RLS with explicit grants and no anonymous access", () => {
    const migration = sql();
    for (const table of ["payment_intents", "payments", "payment_slips"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("revoke all on public.payment_intents, public.payments, public.payment_slips from public, anon, authenticated, service_role");
    expect(migration).not.toMatch(/grant [^;]+ to anon/);
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("private.is_admin()");
    expect(migration).toContain("nasora.nsr300@gmail.com");
    const memberSlipGrant = migration.match(/grant select \(([^)]+)\) on public.payment_slips to authenticated/)?.[1] ?? "";
    expect(memberSlipGrant).not.toContain("object_key");
    expect(memberSlipGrant).not.toContain("etag");
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).not.toMatch(/grant execute on function private\.[^;]+to authenticated/);
  });

  it("uses guarded security-definer RPCs with idempotent approval and rejection semantics", () => {
    const migration = sql();
    expect(migration).toContain("create function private.verify_payment_slip");
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toContain("if not private.is_admin() then");
    expect(migration).toContain("verification_key");
    expect(migration).toContain("verification_payload_fingerprint");
    expect(migration).toContain("idempotency_payload_mismatch");
    expect(migration).toContain("on conflict");
    expect(migration).toContain("set status = 'pending'");
    expect(migration).toContain("set status = 'verified'");
    expect(migration).not.toContain("insert into public.jobs");
    expect(migration).not.toContain("create function public.admin_verify_payment_slip");
    expect(migration).toContain("create function public.gateway_verify_payment_slip");
    expect(migration).toContain("gateway_get_payment_verification_result");
    expect(privateFunction("get_payment_verification_result")).toContain("raise exception 'idempotency_key_mismatch'");
    const serviceGrant = migration.match(/grant execute on function public\.gateway_authorize_payment_slip[^;]+to service_role/)?.[0] ?? "";
    expect(serviceGrant).toContain("public.gateway_verify_payment_slip");
    expect(migration).not.toMatch(/grant execute on function public\.gateway_verify_payment_slip[^;]+to authenticated/);
    expect(privateFunction("verify_payment_slip")).toContain("from auth.users");
  });

  it("requires a non-empty persisted ETag before review and exposes bounded admin RPC pages", () => {
    const migration = sql();
    expect(privateFunction("finalize_payment_slip")).toContain("nullif(btrim(p_etag), '')");
    expect(privateFunction("finalize_payment_slip")).toContain("cleanup_required = false");
    expect(migration).toContain("etag_required_for_review");
    expect(migration).toContain("admin_list_pending_payment_slips");
    expect(migration).toContain("least(greatest(p_limit, 1), 50)");
    expect(migration).toContain("(slip.uploaded_at, slip.id) < (p_before_uploaded_at, p_before_id)");
    expect(migration).toContain("order by slip.uploaded_at desc, slip.id desc");
    expect(migration).toContain("admin_get_payment_slip_for_review");
  });

  it("documents the private R2 prefix lifecycle without pretending to deploy it", () => {
    const migration = sql();
    expect(migration).toContain("payment-slips/");
    expect(migration).toContain("r2 lifecycle");
    expect(migration).toContain("30 days");
  });
});
