import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260809230000_admin_email_outbox.sql", "utf8");

describe("admin email outbox migration", () => {
  it("pins every email to the sole Admin recipient", () => {
    expect(sql).toMatch(/create table private\.email_outbox/i);
    expect(sql).toContain("nasora.nsr300@gmail.com");
    expect(sql).toMatch(/check \(lower\(recipient\) = 'nasora\.nsr300@gmail\.com'\)/i);
  });

  it("queues estimates, slips, member messages, delivery expiry, and terminal cleanup failures", () => {
    expect(sql).toMatch(/new_estimate/);
    expect(sql).toMatch(/new_slip/);
    expect(sql).toMatch(/new_member_message/);
    expect(sql).toMatch(/delivery_expiry/);
    expect(sql).toMatch(/scheduled_failure/);
  });

  it("exposes claim and completion only to service_role", () => {
    expect(sql).toMatch(/revoke all on function public\.claim_admin_email_batch\(integer\)[\s\S]*from public, anon, authenticated, service_role/i);
    expect(sql).toMatch(/grant execute on function public\.claim_admin_email_batch\(integer\), public\.complete_admin_email\(uuid, boolean, text\) to service_role/i);
    expect(sql).toMatch(/for update skip locked/i);
  });
});
