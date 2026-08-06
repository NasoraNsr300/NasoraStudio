import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260806050235_core_commission_database.sql";

const tables = [
  "commission_requests",
  "request_answers",
  "quotes",
  "quote_items",
  "status_workflows",
  "status_definitions",
  "jobs",
  "job_charge_adjustments",
  "job_status_history",
  "queue_entries",
  "audit_logs",
] as const;

describe("core commission RLS", () => {
  it("enables RLS on every business table", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const table of tables) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  it("derives admin access only from app metadata", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create function private.is_admin()");
    expect(sql).toContain("'app_metadata'");
    expect(sql).not.toContain("raw_user_meta_data");
  });

  it("limits members to owned records", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("commission_requests_select_own");
    expect(sql).toContain("quotes_select_own");
    expect(sql).toContain("jobs_select_own");
    expect(sql).toContain("(select auth.uid())");
  });

  it("publishes a safe security-invoker queue projection", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create view public.public_queue");
    expect(sql).toContain("security_invoker = true");
    expect(sql).toContain("grant select on public.public_queue to anon, authenticated");

    const viewSql = sql.split("create view public.public_queue")[1] ?? "";
    expect(viewSql.split(";")[0]).not.toContain("job_id");
    expect(viewSql.split(";")[0]).not.toContain("contact_snapshot");
  });
});
