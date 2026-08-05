import { describe, expect, it, vi } from "vitest";

const { notoLoader, soraLoader } = vi.hoisted(() => ({
  notoLoader: vi.fn(() => ({ variable: "font-noto-sans-thai-variable" })),
  soraLoader: vi.fn(() => ({ variable: "font-sora-variable" })),
}));

vi.mock("next/font/google", () => ({
  Noto_Sans_Thai: notoLoader,
  Sora: soraLoader,
}));

import { notoSansThai as notoFont, sora as soraFont } from "@/app/fonts";

describe("Nasora fonts", () => {
  it("loads Sora and Noto Sans Thai through Next font variables", () => {
    expect(soraLoader).toHaveBeenCalledWith({ subsets: ["latin"], variable: "--font-sora" });
    expect(notoLoader).toHaveBeenCalledWith({ subsets: ["thai"], variable: "--font-noto-sans-thai" });
    expect(soraFont.variable).toBe("font-sora-variable");
    expect(notoFont.variable).toBe("font-noto-sans-thai-variable");
  });
});
