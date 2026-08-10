import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260810110000_commission_catalog.sql";
const accessMigrationPath = "supabase/migrations/20260810141015_restrict_catalog_rpc_access.sql";
const sql = `${existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : ""}\n${existsSync(accessMigrationPath) ? readFileSync(accessMigrationPath, "utf8") : ""}`;

describe("commission catalog migration", () => {
  it("creates albums, services, prices, and media with archive-safe relationships", () => {
    expect(sql).toMatch(/create table public\.commission_albums/i);
    expect(sql).toMatch(/create table public\.commission_services/i);
    expect(sql).toMatch(/create table public\.commission_service_prices/i);
    expect(sql).toMatch(/create table public\.commission_catalog_media/i);
    expect(sql).toMatch(/references public\.commission_albums\(id\) on delete restrict/i);
    expect(sql).toMatch(/references public\.commission_services\(id\) on delete restrict/i);
    expect(sql).toMatch(/archived_at timestamptz/i);
  });

  it("constrains stable slugs, availability, localized fields, and satang", () => {
    expect(sql).toMatch(/slug ~ '\^\[a-z0-9\].*\$'/i);
    expect(sql).toMatch(/availability in \('open', 'limited', 'closed'\)/i);
    expect(sql).toMatch(/jsonb_typeof\(name\) = 'object'/i);
    expect(sql).toMatch(/amount_satang bigint not null check \(amount_satang >= 0/i);
    expect(sql).toMatch(/unique \(service_id, usage, pace\)/i);
  });

  it("exposes only published active catalog rows publicly and all rows to admin", () => {
    expect(sql).toMatch(/alter table public\.commission_albums enable row level security/i);
    expect(sql).toMatch(/published = true[\s\S]*archived_at is null/i);
    expect(sql).toMatch(/private\.is_admin\(\)/i);
    expect(sql).toMatch(/grant select on public\.commission_albums[\s\S]*to anon, authenticated/i);
    expect(sql).toMatch(/revoke insert, update, delete on public\.commission_albums[\s\S]*from anon, authenticated/i);
  });

  it("provides guarded save, archive, restore, and price replacement RPCs", () => {
    for (const name of [
      "admin_save_commission_album",
      "admin_set_commission_album_archive",
      "admin_save_commission_service",
      "admin_set_commission_service_archive",
      "admin_replace_commission_service_prices",
      "admin_create_commission_catalog_media",
    ]) {
      expect(sql).toMatch(new RegExp(`create (?:or replace )?function public\\.${name}`, "i"));
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${name}[\\s\\S]*from public`, "i"));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*to authenticated`, "i"));
    }
    expect(sql).toMatch(/insert into public\.audit_logs/i);
  });

  it("seeds the four real albums idempotently", () => {
    expect(sql).toMatch(/insert into public\.commission_albums/i);
    for (const slug of ["chibi", "illustration", "vtuber", "minecraft-skin"]) {
      expect(sql).toContain(`'${slug}'`);
    }
    expect(sql).toMatch(/on conflict \(slug\) do update/i);
  });

  it("explicitly denies every catalog mutation RPC to anon and service_role", () => {
    for (const name of [
      "admin_save_commission_album", "admin_set_commission_album_archive", "admin_save_commission_service",
      "admin_set_commission_service_archive", "admin_replace_commission_service_prices", "admin_create_commission_catalog_media",
    ]) expect(sql).toMatch(new RegExp(`revoke execute on function public\\.${name}[\\s\\S]*from anon, service_role`, "i"));
  });
});
