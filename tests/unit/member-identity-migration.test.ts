import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/202608060001_member_identity.sql";

describe("member identity migration", () => {
  it("creates owned profile and contact tables with RLS", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("create table public.profiles");
    expect(sql).toContain("create table public.contact_channels");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("(select auth.uid()) = user_id");
    expect(sql).toContain("create function public.set_default_contact_channel");
    expect(sql).toContain("grant select, update on public.profiles to authenticated");
    expect(sql).toContain("grant select, insert, update, delete on public.contact_channels to authenticated");
  });
});
