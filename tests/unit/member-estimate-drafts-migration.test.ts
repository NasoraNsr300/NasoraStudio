import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const path = resolve(import.meta.dirname, "../../supabase/migrations/20260814130000_member_estimate_drafts.sql");

describe("member estimate draft migration", () => {
  it("creates an owner-only bounded draft store without anonymous access", () => {
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, "utf8");
    expect(sql).toMatch(/create table public\.estimate_request_drafts/i);
    expect(sql).toMatch(/unique\s*\(user_id, service_type_slug\)/i);
    expect(sql).toMatch(/enable row level security/i);
    expect(sql.match(/\(select auth\.uid\(\)\) = user_id/gi)?.length).toBeGreaterThanOrEqual(3);
    expect(sql).toMatch(/octet_length\(payload::text\) <= 16384/i);
    expect(sql).toMatch(/grant select, insert, update, delete on public\.estimate_request_drafts to authenticated/i);
    expect(sql).toMatch(/revoke all on public\.estimate_request_drafts from anon/i);
    expect(sql).toMatch(/updated_at/i);
  });
});
