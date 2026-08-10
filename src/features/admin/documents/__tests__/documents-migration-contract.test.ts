import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260810165138_documents_cms.sql"), "utf8");

describe("documents cms migration", () => {
  it("creates durable bilingual documents with bounded public visibility", () => {
    expect(sql).toMatch(/create table public\.public_documents/i);
    expect(sql).toMatch(/slug text not null unique/i);
    expect(sql).toMatch(/category text not null[\s\S]+check[\s\S]+terms[\s\S]+guide[\s\S]+privacy/i);
    expect(sql).toMatch(/content jsonb not null/i);
    expect(sql).toMatch(/cover_media_id uuid references public\.commission_catalog_media/i);
    expect(sql).toMatch(/create index public_documents_public_order_idx/i);
    expect(sql).toMatch(/published = true[\s\S]+archived_at is null/i);
    expect(sql).toMatch(/alter table public\.public_documents enable row level security/i);
  });

  it("guards writes through audited admin-only RPCs", () => {
    expect(sql).toMatch(/function public\.admin_save_public_document/i);
    expect(sql).toMatch(/function public\.admin_set_public_document_archive/i);
    expect(sql).toMatch(/private\.is_admin\(\)/i);
    expect(sql).toMatch(/insert into public\.audit_logs/i);
    expect(sql).toMatch(/security definer set search_path = ''/i);
    expect(sql).toMatch(/revoke all on function public\.admin_save_public_document[\s\S]+from public/i);
    expect(sql).toMatch(/revoke execute on function public\.admin_save_public_document[\s\S]+from anon, service_role/i);
    expect(sql).toMatch(/grant execute on function public\.admin_save_public_document[\s\S]+to authenticated/i);
  });

  it("rejects unsafe or incomplete publish input at the database boundary", () => {
    expect(sql).toMatch(/jsonb_typeof\(p_content\) <> 'object'/i);
    expect(sql).toMatch(/jsonb_typeof\(p_content -> 'th'\) <> 'object'/i);
    expect(sql).toMatch(/jsonb_array_length\(p_content -> 'th' -> 'children'\) = 0/i);
    expect(sql).toMatch(/jsonb_array_length\(p_tags\) > 30/i);
    expect(sql).toMatch(/invalid_document_publish_content/i);
  });
});
