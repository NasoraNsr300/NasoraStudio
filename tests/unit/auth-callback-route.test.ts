import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();

vi.mock("@/shared/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { exchangeCodeForSession } })),
}));

import { GET } from "@/app/auth/callback/route";

beforeEach(() => exchangeCodeForSession.mockReset());

describe("Google OAuth callback", () => {
  it("exchanges the code once and preserves a safe localized return path", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const response = await GET(new NextRequest("https://nasora.example/auth/callback?code=one-time&locale=en&next=%2Fen%2Fportfolio%3Ftag%3Dchibi"));

    expect(exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time");
    expect(response.headers.get("location")).toBe("https://nasora.example/en/portfolio?tag=chibi");
  });

  it("redirects missing or failed exchanges to the localized auth dialog", async () => {
    const missing = await GET(new NextRequest("https://nasora.example/auth/callback?locale=en"));
    expect(missing.headers.get("location")).toBe("https://nasora.example/en?auth=1&error=callback");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();

    exchangeCodeForSession.mockResolvedValueOnce({ error: { message: "expired" } });
    const failed = await GET(new NextRequest("https://nasora.example/auth/callback?code=bad&locale=th"));
    expect(failed.headers.get("location")).toBe("https://nasora.example/th?auth=1&error=callback");
  });

  it("falls back to the locale home for unsafe targets", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const response = await GET(new NextRequest("https://nasora.example/auth/callback?code=ok&locale=th&next=https%3A%2F%2Fattacker.example"));
    expect(response.headers.get("location")).toBe("https://nasora.example/th");
  });
});
