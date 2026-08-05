import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : [".ts", ".tsx"].includes(extname(path))
        ? [path]
        : [];
  });
}

describe("localized source integrity", () => {
  it("contains valid Unicode instead of common UTF-8 mojibake or C1 controls", () => {
    const offenders = sourceFiles(join(process.cwd(), "src")).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return /[\u0080-\u009f]|(?:Ã.|Â.|à[¸¹]|â(?:€|™|˜|‰|€”|€“))|�/u.test(source)
        ? [file.replace(`${process.cwd()}\\`, "")]
        : [];
    });

    expect(offenders).toEqual([]);
  });
});
