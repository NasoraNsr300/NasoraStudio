import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260810160428_portfolio_cms.sql";
const sql = readFileSync(migrationPath, "utf8");

describe("portfolio cms migration", () => {
  it("creates portfolio rows with archive-safe album and media relationships", () => {
    expect(sql).toMatch(/create table public\.portfolio_items/i);
    expect(sql).toMatch(/album_id uuid not null references public\.commission_albums\(id\) on delete restrict/i);
    expect(sql).toMatch(/media_id uuid not null references public\.commission_catalog_media\(id\) on delete restrict/i);
    expect(sql).toMatch(/title jsonb not null/i);
    expect(sql).toMatch(/display_order integer not null default 0 check \(display_order >= 0\)/i);
    expect(sql).toMatch(/archived_at timestamptz/i);
  });

  it("exposes only published rows connected to active published albums", () => {
    expect(sql).toMatch(/alter table public\.portfolio_items enable row level security/i);
    expect(sql).toMatch(/published = true[\s\S]*archived_at is null[\s\S]*commission_albums/i);
    expect(sql).toMatch(/a\.published = true[\s\S]*a\.archived_at is null/i);
    expect(sql).toMatch(/grant select on public\.portfolio_items to anon, authenticated/i);
    expect(sql).toMatch(/revoke insert, update, delete on public\.portfolio_items from anon, authenticated/i);
  });

  it("provides sole-admin save and reversible archive RPCs with audit records", () => {
    for (const name of ["admin_save_portfolio_item", "admin_set_portfolio_item_archive", "admin_create_portfolio_media"]) {
      expect(sql).toMatch(new RegExp(`create (?:or replace )?function public\\.${name}`, "i"));
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${name}[\\s\\S]*from public`, "i"));
      expect(sql).toMatch(new RegExp(`revoke execute on function public\\.${name}[\\s\\S]*from anon, service_role`, "i"));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*to authenticated`, "i"));
    }
    expect(sql).toMatch(/private\.is_admin\(\)/i);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/insert into public\.audit_logs/i);
  });
});
