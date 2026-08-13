import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function migrationSql() {
  const directory = join(process.cwd(), "supabase", "migrations");
  const file = readdirSync(directory).find((name) => name.endsWith("_member_profile_avatars.sql"));
  return file ? readFileSync(join(directory, file), "utf8").toLowerCase() : "";
}

describe("member avatar migration contract", () => {
  const sql = migrationSql();

  it("stores private owner media while profiles retain only an opaque media id", () => {
    expect(sql).toContain("create table public.profile_avatar_media");
    expect(sql).toMatch(/alter table public\.profiles[\s\S]*add column avatar_media_id uuid/);
    expect(sql).toContain("references public.profile_avatar_media(id)");
    expect(sql).toMatch(/object_key text not null[\s\S]*member-avatars/);
    expect(sql).toMatch(/content_type text not null[\s\S]*image\/webp/);
    expect(sql).toMatch(/width integer not null[\s\S]*width = 512/);
    expect(sql).toMatch(/height integer not null[\s\S]*height = 512/);
    expect(sql).toContain("constraint profile_avatar_media_lifecycle_check");
    expect(sql).not.toContain("constraint profile_avatar_media_state_check");
  });

  it("keeps media metadata private and service gateway guarded", () => {
    expect(sql).toContain("alter table public.profile_avatar_media enable row level security");
    expect(sql).toMatch(/revoke all on public\.profile_avatar_media from public, anon, authenticated, service_role/);
    expect(sql).toContain("create function public.gateway_finalize_profile_avatar");
    expect(sql).toMatch(/revoke all on function public\.gateway_finalize_profile_avatar[\s\S]*from public, anon, authenticated, service_role/);
    expect(sql).toMatch(/grant execute on function public\.gateway_finalize_profile_avatar[\s\S]*to service_role/);
    expect(sql).toContain("revoke update on public.profiles from authenticated");
    expect(sql).toMatch(/grant update \(nickname, preferred_locale, updated_at\) on public\.profiles to authenticated/);
  });

  it("atomically activates replacement and schedules old media cleanup", () => {
    expect(sql).toMatch(/select \*[\s\S]*from public\.profiles[\s\S]*for update/);
    expect(sql).toMatch(/insert into public\.profile_avatar_media/);
    expect(sql).toMatch(/update public\.profiles[\s\S]*avatar_media_id = p_media_id/);
    expect(sql).toMatch(/update public\.profile_avatar_media[\s\S]*state = 'pending_cleanup'/);
    expect(sql).toMatch(/insert into private\.cleanup_tasks[\s\S]*'profile_avatar'/);
  });

  it("resolves avatar object keys only through a service-only owner lookup", () => {
    expect(sql).toContain("create function public.gateway_get_profile_avatar");
    expect(sql).toMatch(/where media\.id = p_media_id[\s\S]*media\.user_id = p_user_id[\s\S]*profile\.avatar_media_id = media\.id/);
    expect(sql).toMatch(/grant execute on function public\.gateway_get_profile_avatar[\s\S]*to service_role/);
  });
});
