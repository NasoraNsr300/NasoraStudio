import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("project toolchain", () => {
  it("runs TypeScript tests", () => {
    expect(true).toBe(true);
  });

  it("requires Node.js 22 LTS or newer", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      engines?: { node?: string };
    };

    expect(packageJson.engines?.node).toBe(">=22");
  });
});
