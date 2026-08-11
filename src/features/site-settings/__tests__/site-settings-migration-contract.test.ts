import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function migrationSql() {
  const directory = join(process.cwd(), "supabase", "migrations");
  const matches = readdirSync(directory).filter((name) => name.endsWith("_live_site_settings.sql"));
  expect(matches).toHaveLength(1);
  return readFileSync(join(directory, matches[0]!), "utf8");
}

describe("live site settings migration", () => {
  it("creates one RLS-protected settings row with strict public privileges", () => {
    const sql = migrationSql();
    expect(sql).toMatch(/create table public\.site_settings/i);
    expect(sql).toMatch(/alter table public\.site_settings enable row level security/i);
    expect(sql).toMatch(/grant select \([^)]+\) on public\.site_settings to anon, authenticated/i);
    expect(sql).not.toMatch(/grant select on public\.site_settings to anon, authenticated/i);
    expect(sql).toMatch(/revoke insert, update, delete on public\.site_settings from anon, authenticated/i);
  });

  it("guards Admin writes and prevents submission while commissions are closed", () => {
    const sql = migrationSql();
    expect(sql).toMatch(/create or replace function public\.admin_save_site_settings/i);
    expect(sql).toMatch(/private\.is_admin\(\)/i);
    expect(sql).toMatch(/revoke all on function public\.admin_save_site_settings/i);
    expect(sql).toMatch(/grant execute on function public\.admin_save_site_settings[\s\S]*to authenticated/i);
    expect(sql).toMatch(/create trigger enforce_commissions_open_before_request/i);
    expect(sql).toMatch(/commissions_closed/i);
  });
});
