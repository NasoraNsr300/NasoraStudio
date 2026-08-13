import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260813172631_reset_test_customer_avatar.sql"), "utf8").toLowerCase();

describe("test customer avatar reset migration", () => {
  it("only resets the approved ordinary account through service role", () => {
    expect(sql).toMatch(/auth\.jwt\(\)[\s\S]*service_role/);
    expect(sql).toContain("customer.test@nasora.local");
    expect(sql).toMatch(/raw_app_meta_data[\s\S]*role[\s\S]*member/);
  });

  it("detaches the active avatar and schedules private object cleanup", () => {
    expect(sql).toMatch(/select[\s\S]*avatar_media_id[\s\S]*from public\.profiles[\s\S]*for update/);
    expect(sql).toMatch(/update public\.profiles[\s\S]*avatar_media_id = null/);
    expect(sql).toMatch(/update public\.profile_avatar_media[\s\S]*pending_cleanup/);
    expect(sql).toMatch(/insert into private\.cleanup_tasks[\s\S]*profile_avatar/);
  });

  it("keeps the reset gateway service-only", () => {
    expect(sql).toMatch(/revoke all on function public\.gateway_reset_test_customer_avatar[\s\S]*public, anon, authenticated, service_role/);
    expect(sql).toMatch(/grant execute on function public\.gateway_reset_test_customer_avatar[\s\S]*service_role/);
  });
});
