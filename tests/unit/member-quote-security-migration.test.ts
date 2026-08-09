import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260809200000_harden_member_quote_visibility.sql";
const coreMigrationPath = "supabase/migrations/20260806050235_core_commission_database.sql";

function migrationSql() {
  return readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");
}

function coreMigrationSql() {
  return readFileSync(coreMigrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");
}

describe("member quote visibility migration", () => {
  it("limits owner quote reads to customer-visible lifecycle states while retaining every state for admins", () => {
    const sql = migrationSql();

    expect(sql).toContain("alter policy quotes_select_own");
    expect(sql).toContain("private.is_admin()) or");
    expect(sql).toMatch(/status in \('sent', 'accepted', 'declined', 'expired', 'closed'\)/);
    expect(sql).toContain("request.user_id = (select auth.uid())");
    expect(sql).not.toContain("'draft', 'superseded'");
  });

  it("makes item visibility inherit the customer-visible parent quote", () => {
    const sql = migrationSql();

    expect(sql).toContain("alter policy quote_items_select_own");
    expect(sql).toMatch(/quote\.status in \('sent', 'accepted', 'declined', 'expired', 'closed'\)/);
    expect(sql).toContain("join public.commission_requests request on request.id = quote.request_id");
  });

  it("removes broad quote select grants and grants only customer-safe quote columns", () => {
    const sql = migrationSql();

    expect(sql).toContain("revoke select on public.quotes from authenticated");
    expect(sql).toContain("grant select (");
    expect(sql).not.toContain("submission_key");
    expect(sql).not.toContain("submission_payload_fingerprint");
    expect(sql).not.toContain("created_by");
    expect(sql).not.toContain("valid_from");
    expect(sql).toContain("revoke select on public.quote_items from authenticated");
    expect(sql).toContain("grant select ( id, quote_id, item_type, label_snapshot, description_snapshot, quantity, unit_amount_satang, line_total_satang, display_order ) on public.quote_items to authenticated");
  });

  it("keeps owner, other-member, guest, anonymous, and admin boundaries explicit in SQL", () => {
    const sql = migrationSql();
    const coreSql = coreMigrationSql();

    expect(sql).toContain("request.user_id = (select auth.uid())");
    expect(sql).toContain("(select private.is_admin()) or");
    expect(coreSql).toContain("requester_type = 'guest' and user_id is null");
    expect(coreSql).toContain("revoke all on public.commission_requests, public.request_answers, public.quotes, public.quote_items");
    expect(sql).not.toContain("to anon");
  });

  it("documents that runtime role simulation is unavailable to this unit test suite", () => {
    expect(migrationSql()).toContain("runtime rls role simulation is verified in deployed supabase environments");
  });
});
