import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260810091943_repair_payment_function_ambiguity.sql";

describe("payment runtime lint repair migration", () => {
  it("replaces both deployed functions with unambiguous column references", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ");

    expect(sql).toContain("create or replace function private.finalize_payment_slip");
    expect(sql).toContain("attempt.slip_id = v_slip.id");
    expect(sql).toContain("create or replace function private.verify_payment_slip");
    expect(sql).toContain("on conflict on constraint payments_intent_id_key do nothing");
  });
});
