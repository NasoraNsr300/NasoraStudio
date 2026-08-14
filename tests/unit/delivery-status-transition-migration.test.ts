import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260814061948_delivery_updates_job_status.sql";
const sql = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

describe("delivery status transition migration", () => {
  it("moves file and Google Drive deliveries into the delivery workflow status atomically", () => {
    expect(sql).toMatch(/create or replace function public\.admin_create_drive_delivery/i);
    expect(sql).toMatch(/create or replace function public\.admin_create_file_delivery/i);
    expect(sql.match(/perform private\.change_job_status\(/gi)).toHaveLength(2);
    expect(sql.match(/status\.stable_key = 'delivery'/gi)).toHaveLength(2);
  });

  it("keeps completed and cancelled jobs terminal while allowing another delivery record", () => {
    expect(sql.match(/not v_current_status_terminal and v_current_status_key <> 'delivery'/gi)).toHaveLength(2);
  });
});
