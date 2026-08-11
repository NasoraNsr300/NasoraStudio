import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Portfolio Home presentation migration", () => {
  it("adds Hero selection and a guarded save signature", () => {
    const migrations = fs.readdirSync(path.join(process.cwd(), "supabase", "migrations"));
    const filename = migrations.find((name) => name.endsWith("_portfolio_home_presentation.sql"));
    expect(filename).toBeTruthy();
    const sql = fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", filename!), "utf8");

    expect(sql).toMatch(/add column show_in_hero boolean not null default false/i);
    expect(sql).toMatch(/p_show_in_hero boolean/i);
    expect(sql).toMatch(/private\.is_admin\(\)/i);
    expect(sql).toMatch(/where published = true and archived_at is null/i);
  });
});
