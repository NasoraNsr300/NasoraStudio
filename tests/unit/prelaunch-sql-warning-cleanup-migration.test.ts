import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  import.meta.dirname,
  "../../supabase/migrations/20260814120000_prelaunch_sql_warning_cleanup.sql",
);

describe("prelaunch SQL warning cleanup migration", () => {
  it("replaces only the five unused declarations in the linked function definitions", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("pg_get_functiondef");
    expect(sql).toContain("private.save_and_send_quote(uuid, jsonb)");
    expect(sql).toContain("private.authorize_payment_slip(uuid, uuid, text, bigint, uuid, uuid)");
    expect(sql).toContain("private.create_payment_intent(uuid, uuid, bigint, uuid)");
    expect(sql).toContain("v_quantity integer;");
    expect(sql).toContain("v_unit_amount_satang bigint;");
    expect(sql).toContain("v_line_total_satang bigint;");
    expect(sql).toContain("v_quote public.quotes%rowtype;");
    expect(sql).toContain("v_request public.commission_requests%rowtype;");
    expect(sql.match(/execute v_definition;/g)).toHaveLength(3);
    expect(sql.match(/if v_definition = v_original then/g)).toHaveLength(3);
    expect(sql).not.toMatch(/\b(drop|alter)\s+(table|policy|function)\b/i);
    expect(sql).not.toMatch(/\b(grant|revoke)\b/i);
  });
});
