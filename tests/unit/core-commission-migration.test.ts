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

describe("core commission database migration", () => {
  it("creates every core business table", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const table of tables) {
      expect(sql).toContain(`create table public.${table}`);
    }
  });

  it("stores money as satang and preserves quote versions", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("total_satang bigint");
    expect(sql).toContain("current_total_satang bigint");
    expect(sql).toContain("quote_request_version_unique");
    expect(sql).toMatch(/deposit_percent[^,]+between 0 and 100/);
  });

  it("enforces member and guest request ownership shapes", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("requester_type text");
    expect(sql).toContain("commission_request_identity_check");
    expect(sql).toContain("requester_type = 'member'");
    expect(sql).toContain("requester_type = 'guest'");
  });

  it("indexes foreign keys used by admin and history queries", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const index of [
      "audit_logs_actor_user_idx",
      "job_charge_adjustments_job_idx",
      "job_charge_adjustments_created_by_idx",
      "job_status_history_changed_by_idx",
      "job_status_history_from_status_idx",
      "job_status_history_to_status_idx",
      "jobs_request_idx",
      "jobs_status_idx",
      "jobs_workflow_idx",
      "quotes_created_by_idx",
    ]) {
      expect(sql).toContain(`create index ${index}`);
    }
  });
});
