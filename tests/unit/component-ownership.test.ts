import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("component ownership boundaries", () => {
  it("keeps Core independent from product features", () => {
    const violations = sourceFiles(join(process.cwd(), "src/shared"))
      .filter((path) => readFileSync(path, "utf8").includes("@/features/"))
      .map((path) => path.replace(`${process.cwd()}\\`, ""));

    expect(violations).toEqual([]);
  });

  it("keeps the privileged Supabase client in shared infrastructure", () => {
    const source = readFileSync("src/shared/supabase/service-role-client.server.ts", "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toContain("SUPABASE_SECRET_KEY");
    expect(source).not.toContain("payment");
  });
});

