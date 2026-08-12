import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase", "migrations", "20260812214557_admin_managed_about_contact_settings.sql"), "utf8");

describe("Admin-managed About and contact migration", () => {
  it("adds constrained public fields and guarded Admin RPCs", () => {
    expect(sql).toMatch(/add column about_biography jsonb not null/i);
    expect(sql).toMatch(/add column contact_email text not null/i);
    expect(sql).toMatch(/grant select \(about_biography, about_contact, contact_email, instagram_url\)/i);
    expect(sql).toMatch(/if not \(select private\.is_admin\(\)\)/i);
    expect(sql).toMatch(/revoke all on function public\.admin_save_site_settings_v2/i);
    expect(sql).toMatch(/grant execute on function public\.admin_save_site_settings_v2[\s\S]*to authenticated/i);
  });
});
