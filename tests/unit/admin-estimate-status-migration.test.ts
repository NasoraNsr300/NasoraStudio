import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260809120000_admin_estimate_status_workflow.sql";

describe("admin estimate status workflow migration", () => {
  it("implements the status change and audit log in one locked admin-only transaction", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");
    const functionSql = sql.split("create function public.admin_transition_commission_request")[1] ?? "";

    expect(functionSql.split("as $$")[0]).toContain("security definer");
    expect(functionSql.split("as $$")[0]).toContain("set search_path = ''");
    expect(functionSql).toContain("private.is_admin()");
    expect(functionSql).toContain("for update");
    expect(functionSql).toContain("v_before.status = 'submitted'");
    expect(functionSql).toContain("v_before.status = 'reviewing'");
    expect(functionSql).toContain("insert into public.audit_logs");
    expect(functionSql).toContain("update public.commission_requests");
    expect(functionSql).toContain("closed_at");
  });

  it("exposes only the guarded RPC to authenticated callers", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");

    expect(sql).toContain("revoke all on function public.admin_transition_commission_request(uuid, text, text)");
    expect(sql).toContain("grant execute on function public.admin_transition_commission_request(uuid, text, text) to authenticated");
    expect(sql).toContain("revoke update on public.commission_requests from authenticated");
  });
});
