import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260810090928_repair_legacy_thai_labels.sql";

describe("legacy Thai label repair migration", () => {
  it("replaces mojibake workflow and status labels without touching member data", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("update public.status_workflows");
    expect(sql).toContain("ขั้นตอนงานมาตรฐาน");
    expect(sql).toContain("update public.status_definitions");
    expect(sql).toContain("รอเริ่มงาน");
    expect(sql).toContain("เสร็จสิ้น");
    expect(sql).toContain("create trigger normalize_request_answer_label_before_insert");
    expect(sql).toContain("เวอร์ชันแบบประเมิน");
    expect(sql).toContain("ยอมรับนโยบายและข้อกำหนด");
    expect(sql).not.toContain("delete from public.profiles");
    expect(sql).not.toContain("delete from auth.users");
  });
});
