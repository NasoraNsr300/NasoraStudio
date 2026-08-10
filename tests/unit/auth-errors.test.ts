import { describe, expect, it } from "vitest";

import { localizeAuthError } from "@/shared/auth/auth-errors";

describe("localizeAuthError", () => {
  it("does not expose Supabase credential details", () => {
    expect(localizeAuthError({ message: "Invalid login credentials" }, "th")).toBe("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    expect(localizeAuthError({ message: "Invalid login credentials" }, "en")).toBe("Incorrect email or password");
  });

  it("uses a safe localized fallback", () => {
    expect(localizeAuthError({ message: "internal details" }, "th")).toBe("ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง");
    expect(localizeAuthError({}, "en")).toBe("Something went wrong. Please try again");
  });
});
