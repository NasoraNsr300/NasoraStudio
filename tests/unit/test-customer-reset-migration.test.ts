import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260812004355_ordinary_test_customer_reset.sql"), "utf8");
const script = readFileSync(join(process.cwd(), "scripts/reset-test-customer.mjs"), "utf8");

describe("ordinary test customer reset migration", () => {
  it("is service-only and hard-codes the sole approved test identity", () => {
    expect(sql).toMatch(/create function public\.gateway_reset_test_customer/i);
    expect(sql).toContain("customer.test@nasora.local");
    expect(sql).toMatch(/auth\.jwt\(\)[\s\S]*service_role/i);
    expect(sql).toMatch(/revoke all on function public\.gateway_reset_test_customer[\s\S]*from public, anon, authenticated, service_role/i);
    expect(sql).toMatch(/grant execute on function public\.gateway_reset_test_customer[\s\S]*to service_role/i);
  });

  it("refuses an Admin identity and resets only rows owned by the target user", () => {
    expect(sql).toMatch(/raw_app_meta_data[\s\S]*admin/i);
    expect(sql).toMatch(/where user_id = p_user_id/i);
    expect(sql).toMatch(/where recipient_user_id = p_user_id/i);
    expect(sql).toMatch(/delete from public\.commission_requests/i);
    expect(sql).not.toMatch(/delete from auth\.users/i);
  });

  it("keeps immutable-ledger bypasses scoped to the service reset session", () => {
    expect(sql).toMatch(/payments_prevent_mutation[\s\S]*service_role[\s\S]*nasora\.test_reset_user_id[\s\S]*customer\.test@nasora\.local/i);
    expect(sql).toMatch(/enforce_quote_item_immutability[\s\S]*service_role[\s\S]*nasora\.test_reset_user_id[\s\S]*customer\.test@nasora\.local/i);
  });

  it("creates or updates only an ordinary member without printing its password", () => {
    expect(script).toMatch(/app_metadata:\s*\{ role: "member" \}/);
    expect(script).toContain("gateway_reset_test_customer");
    expect(script).not.toMatch(/JSON\.stringify\([\s\S]*password[,}]/);
  });
});
