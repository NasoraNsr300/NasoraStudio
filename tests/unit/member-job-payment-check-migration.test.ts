import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const grantSql = readFileSync("supabase/migrations/20260812105447_grant_member_job_payment_check.sql", "utf8");
const guardSql = readFileSync("supabase/migrations/20260812105925_guard_member_job_payment_check.sql", "utf8");

describe("member job payment check migration", () => {
  it("records the deployed permission repair before replacing it with an owner guard", () => {
    expect(grantSql).toMatch(/grant execute on function private\.job_is_fully_paid\(uuid\) to authenticated/i);
    expect(guardSql).toMatch(/revoke all on function private\.job_is_fully_paid\(uuid\)\s+from public, anon, authenticated, service_role/i);
  });

  it("limits the callable payment predicate to the signed-in member's own job", () => {
    expect(guardSql).toMatch(/create or replace function private\.member_job_is_fully_paid\(p_job_id uuid\)/i);
    expect(guardSql).toMatch(/job\.user_id = \(select auth\.uid\(\)\)/i);
    expect(guardSql).toMatch(/grant execute on function private\.member_job_is_fully_paid\(uuid\) to authenticated/i);
    expect(guardSql).toMatch(/admin_override or private\.member_job_is_fully_paid\(job_id\)/i);
  });
});
