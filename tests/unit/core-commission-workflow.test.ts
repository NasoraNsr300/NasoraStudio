import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260806050235_core_commission_database.sql";

describe("core commission workflow operations", () => {
  it("seeds the editable default workflow", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    for (const status of [
      "waiting",
      "sketching",
      "coloring",
      "review",
      "delivery",
      "completed",
      "cancelled",
    ]) {
      expect(sql).toContain(`'${status}'`);
    }

    expect(sql).toContain("nasora_default");
  });

  it("provides audited transactional admin functions", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create function private.adjust_job_total");
    expect(sql).toContain("create function private.change_job_status");
    expect(sql).toContain("create function private.reorder_queue_entry");
    expect(sql).toContain("insert into public.job_charge_adjustments");
    expect(sql).toContain("insert into public.job_status_history");
    expect(sql).toContain("insert into public.audit_logs");
    expect(sql).toContain("for update");
  });

  it("protects accepted quote snapshots and append-only ledgers", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create function private.enforce_quote_immutability");
    expect(sql).toContain("quote_snapshot_is_immutable");
    expect(sql).toContain(
      "revoke update, delete on public.job_charge_adjustments",
    );
    expect(sql).toContain("revoke update, delete on public.job_status_history");
    expect(sql).toContain("revoke update, delete on public.audit_logs");
  });
});
