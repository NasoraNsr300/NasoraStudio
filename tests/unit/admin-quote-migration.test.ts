import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260809190000_admin_estimate_workflow.sql";
const coreMigrationPath = "supabase/migrations/20260806050235_core_commission_database.sql";

function migrationSql() {
  return readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");
}

describe("admin quote workflow migration", () => {
  it("creates sequential immutable quote snapshots in one locked admin-only transaction", () => {
    const sql = migrationSql();
    const functionSql = sql.split("create function private.save_and_send_quote")[1] ?? "";

    expect(functionSql.split("as $$")[0]).toContain("security definer");
    expect(functionSql.split("as $$")[0]).toContain("set search_path = ''");
    expect(functionSql).toContain("private.is_admin()");
    expect(functionSql).toContain("from public.commission_requests");
    expect(functionSql).toContain("for update");
    expect(functionSql).toMatch(/coalesce\s*\(\s*max\((?:q\.)?version\),\s*0\s*\)\s*\+\s*1/);
    expect(functionSql).toContain("insert into public.quotes");
    expect(functionSql).toContain("insert into public.quote_items");
    expect(functionSql).toContain("insert into public.audit_logs");
  });

  it("requires line totals to equal the authoritative THB total and derives the deposit", () => {
    const sql = migrationSql();
    const functionSql = sql.split("create function private.save_and_send_quote")[1] ?? "";

    expect(functionSql).toContain("quote_total_mismatch");
    expect(functionSql).toContain("line_total_satang");
    expect(functionSql).toContain("unit_amount_satang");
    expect(functionSql).toContain("quantity");
    expect(functionSql).toContain("deposit_percent");
    expect(functionSql).toMatch(/deposit_satang[\s\S]*total_satang[\s\S]*deposit_percent/);
  });

  it("supersedes the previous sent version without weakening the existing snapshot trigger", () => {
    const sql = migrationSql();
    const coreSql = readFileSync(coreMigrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");
    const functionSql = sql.split("create function private.save_and_send_quote")[1] ?? "";

    expect(functionSql).toContain("status = 'superseded'");
    expect(functionSql).toContain("status = 'sent'");
    expect(functionSql).toContain("update public.commission_requests");
    expect(functionSql).toContain("status = 'quoted'");
    expect(sql).not.toContain("drop trigger quotes_enforce_immutability");
    expect(sql).not.toContain("drop trigger quote_items_enforce_immutability");
    expect(coreSql).toContain("if old.status <> 'draft'");
    expect(coreSql).toContain("raise exception 'quote_snapshot_is_immutable'");
    expect(coreSql).toContain("create trigger quote_items_enforce_immutability");
  });

  it("deduplicates a repeated submission key and keeps direct quote writes unavailable", () => {
    const sql = migrationSql();
    const functionSql = sql.split("create function private.save_and_send_quote")[1] ?? "";

    expect(sql).toContain("quote_request_submission_unique");
    expect(functionSql).toContain("submission_key");
    expect(functionSql).toContain("return query");
    expect(sql).toContain("revoke insert, update, delete on public.quotes from authenticated");
    expect(sql).toContain("revoke insert, update, delete on public.quote_items from authenticated");
  });
});
