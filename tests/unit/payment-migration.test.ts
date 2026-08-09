import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260809200000_payment_deposit_workflow.sql";

function sql() {
  return readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");
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
  });

  it("keeps public tables under RLS with explicit grants and no anonymous access", () => {
    const migration = sql();
    for (const table of ["payment_intents", "payments", "payment_slips"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("revoke all on public.payment_intents, public.payments, public.payment_slips from public, anon, authenticated");
    expect(migration).not.toMatch(/grant [^;]+ to anon/);
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("private.is_admin()");
  });

  it("uses guarded security-definer RPCs with idempotent approval and rejection semantics", () => {
    const migration = sql();
    expect(migration).toContain("create function private.verify_payment_slip");
    expect(migration).toContain("security definer set search_path = ''");
    expect(migration).toContain("if not private.is_admin() then");
    expect(migration).toContain("verification_key");
    expect(migration).toContain("on conflict");
    expect(migration).toContain("set status = 'pending'");
    expect(migration).toContain("set status = 'verified'");
    expect(migration).not.toContain("insert into public.jobs");
  });

  it("documents the private R2 prefix lifecycle without pretending to deploy it", () => {
    const migration = sql();
    expect(migration).toContain("payment-slips/");
    expect(migration).toContain("r2 lifecycle");
    expect(migration).toContain("30 days");
  });
});
