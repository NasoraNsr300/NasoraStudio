# Collaboration and delivery deployment

Scope: member/admin messages, progress updates, private delivery files, Google Drive delivery links, and 30-day cleanup. Admin email is intentionally deferred.

Required server environment variables:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PRIVATE_ASSETS_BUCKET`
- `SUPABASE_SECRET_KEY`
- `CRON_SECRET`

Deployment steps:

1. Apply `supabase/migrations/20260809220000_job_collaboration_delivery.sql` after earlier migrations.
2. Create a private R2 bucket. Do not expose a public bucket URL.
3. Configure the server environment variables above.
4. Schedule `POST /api/internal/cleanup/dispatch` with `Authorization: Bearer <CRON_SECRET>` at least daily.
5. Verify RLS using a member account, another member account, the sole Admin account, and an anonymous request.
6. Verify private R2 upload/download/delete and Google Drive link expiry against production services.

The cleanup worker deletes R2 objects and hides Google Drive links after 30 days. Deleting the source file from Google Drive remains a manual Admin action.
