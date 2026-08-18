# Admin email deployment

Recipient is fixed to `nasora.nsr300@gmail.com`. No customer contact data is copied into the email outbox.

Required server environment variables:

- `RESEND_API_KEY`
- `ADMIN_EMAIL_SENDER`
- `SUPABASE_SECRET_KEY`
- `CRON_SECRET`

Deployment:

1. Apply `supabase/migrations/20260809230000_admin_email_outbox.sql` after the collaboration migration.
2. During development, use Resend's test sender only for the account owner's address. Before sending to customers, verify a dedicated sending subdomain in Resend with SPF and DKIM.
3. Add the environment variables above to the deployed Worker.
4. Deploy `wrangler.maintenance.jsonc`; it calls the protected dispatch route every five minutes. Configure the same `CRON_SECRET` on both Workers.
5. Trigger one estimate, one slip, and one member message. Confirm each sends one deduplicated email.
