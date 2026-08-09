-- Customer quote reads must be limited by the database rather than by client filters.
alter policy quotes_select_own
on public.quotes
using (
  (select private.is_admin()) or (
    status in ('sent', 'accepted', 'declined', 'expired', 'closed')
    and exists (
      select 1
      from public.commission_requests request
      where request.id = request_id
        and request.user_id = (select auth.uid())
    )
  )
);

alter policy quote_items_select_own
on public.quote_items
using (
  (select private.is_admin()) or exists (
    select 1
    from public.quotes quote
    join public.commission_requests request on request.id = quote.request_id
    where quote.id = quote_id
      and quote.status in ('sent', 'accepted', 'declined', 'expired', 'closed')
      and request.user_id = (select auth.uid())
  )
);

-- A table-level grant overrides a column grant. Revoke it first, then expose only the
-- immutable customer quote snapshot required by the member and admin summary readers.
revoke select on public.quotes from authenticated;
grant select (
  id,
  request_id,
  version,
  status,
  scope_summary,
  total_satang,
  deposit_percent,
  deposit_satang,
  free_revision_count,
  estimated_duration_days,
  estimated_duration_min_days,
  estimated_duration_max_days,
  proposed_deadline,
  terms_document_slug,
  terms_document_version,
  expires_at
) on public.quotes to authenticated;

revoke select on public.quote_items from authenticated;
grant select (
  id,
  quote_id,
  item_type,
  label_snapshot,
  description_snapshot,
  quantity,
  unit_amount_satang,
  line_total_satang,
  display_order
) on public.quote_items to authenticated;

-- Runtime RLS role simulation is verified in deployed Supabase environments; this repository's
-- unit contract tests assert the policy and privilege definitions above.
