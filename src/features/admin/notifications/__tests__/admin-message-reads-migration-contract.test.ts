import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function migrationSql() {
  const directory = join(process.cwd(), "supabase", "migrations");
  const file = readdirSync(directory).find((name) => name.endsWith("_admin_message_reads.sql"));
  expect(file).toBeTruthy();
  return readFileSync(join(directory, file!), "utf8");
}

describe("Admin notification and conversation read state", () => {
  it("stores RLS-protected read markers and exposes guarded commands", () => {
    const sql = migrationSql();
    expect(sql).toMatch(/create table public\.admin_notification_reads/i);
    expect(sql).toMatch(/alter table public\.admin_notification_reads enable row level security/i);
    expect(sql).toMatch(/private\.is_admin\(\)/i);
    expect(sql).toMatch(/create or replace function public\.admin_mark_notification_reads/i);
    expect(sql).toMatch(/create or replace function public\.admin_mark_conversation_read/i);
    expect(sql).toMatch(/revoke all on function public\.admin_mark_notification_reads/i);
  });
});
