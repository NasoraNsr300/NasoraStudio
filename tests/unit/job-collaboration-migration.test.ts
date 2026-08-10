import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260809220000_job_collaboration_delivery.sql", "utf8");

describe("job collaboration and delivery migration", () => {
  it("creates one member-only conversation per job with durable messages and read markers", () => {
    expect(sql).toMatch(/create table public\.conversations/i);
    expect(sql).toMatch(/unique\s*\(job_id\)/i);
    expect(sql).toMatch(/create table public\.messages/i);
    expect(sql).toMatch(/create table public\.conversation_reads/i);
    expect(sql).toMatch(/job\.customer_type = 'member'/i);
  });

  it("stores progress separately and permits message images only", () => {
    expect(sql).toMatch(/create table public\.job_progress_updates/i);
    expect(sql).toMatch(/create table public\.message_assets/i);
    expect(sql).toMatch(/image\/png[\s\S]*image\/jpeg[\s\S]*image\/webp/i);
  });

  it("keeps delivery history while enforcing full payment and 30-day expiry", () => {
    expect(sql).toMatch(/create table public\.deliveries/i);
    expect(sql).toMatch(/delivered_at \+ interval '30 days'/i);
    expect(sql).toMatch(/private\.job_is_fully_paid/i);
    expect(sql).toMatch(/hidden_at is null/i);
  });

  it("persists member in-site notifications", () => {
    expect(sql).toMatch(/create table public\.notifications/i);
    expect(sql).toMatch(/type text not null check \(type in \('quote', 'payment', 'status', 'message', 'progress', 'delivery'\)\)/i);
    expect(sql).not.toMatch(/email_outbox|enqueue_admin_email/i);
  });

  it("revokes direct mutation and exposes guarded RPC boundaries", () => {
    expect(sql).toMatch(/revoke all on public\.conversations, public\.messages, public\.message_assets, public\.conversation_reads, public\.job_progress_updates, public\.notifications, public\.deliveries/i);
    expect(sql).toMatch(/private\.is_admin\(\)/i);
    expect(sql).toMatch(/auth\.uid\(\)/i);
  });
});
