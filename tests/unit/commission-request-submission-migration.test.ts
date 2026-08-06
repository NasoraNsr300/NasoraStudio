import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPaths = [
  "supabase/migrations/20260806133000_submit_commission_requests.sql",
  "supabase/migrations/20260806134500_harden_commission_request_rpc_grants.sql",
];

function readMigrationSql() {
  return migrationPaths.map((path) => readFileSync(path, "utf8")).join("\n").toLowerCase();
}

describe("commission request submission migration", () => {
  it("adds stable request references and idempotency", () => {
    const sql = readMigrationSql();

    expect(sql).toContain("add column request_code text");
    expect(sql).toContain("add column submission_key uuid");
    expect(sql).toContain("create unique index commission_requests_request_code_uidx");
    expect(sql).toContain("create unique index commission_requests_submission_key_uidx");
    expect(sql).toContain("pg_advisory_xact_lock");
  });

  it("submits the request and its answers in one guarded function", () => {
    const sql = readMigrationSql();
    const functionSql = sql.split("create function public.submit_commission_request")[1] ?? "";

    expect(functionSql.split("as $$")[0]).toContain("security definer");
    expect(functionSql.split("as $$")[0]).toContain("set search_path = ''");
    expect(functionSql).toContain("auth.uid()");
    expect(functionSql).toContain("join public.profiles");
    expect(functionSql).toContain("from public.contact_channels");
    expect(functionSql).toContain("insert into public.commission_requests");
    expect(functionSql).toContain("insert into public.request_answers");
    expect(functionSql).toContain("form_version");
    expect(functionSql).toContain("accepted_legal");
  });

  it("allows only explicit RPC execution and no direct customer writes", () => {
    const sql = readMigrationSql();

    expect(sql).toContain("revoke all on function public.submit_commission_request(jsonb) from public");
    expect(sql).toContain("from public, anon, authenticated, service_role");
    expect(sql).toContain("grant execute on function public.submit_commission_request(jsonb) to anon, authenticated");
    expect(sql).not.toContain("grant insert on public.commission_requests to anon");
    expect(sql).not.toContain("grant insert on public.request_answers to anon");
  });

  it("guards member cancellation by owner and lifecycle", () => {
    const sql = readMigrationSql();
    const functionSql = sql.split("create function public.cancel_own_commission_request")[1] ?? "";

    expect(functionSql.split("as $$")[0]).toContain("security definer");
    expect(functionSql).toContain("user_id = auth.uid()");
    expect(functionSql).toContain("status in ('submitted', 'reviewing')");
    expect(functionSql).toContain("insert into public.audit_logs");
    expect(sql).toContain("grant execute on function public.cancel_own_commission_request(uuid) to authenticated");
    expect(sql).not.toContain("public.cancel_own_commission_request(uuid) to anon");
  });
});
