# Private R2 payment slips

Use a private R2 bucket. Do not enable public access or a custom domain. Member browsers upload only to the same-origin application gateway; they never receive an R2 bearer URL or object key. The gateway validates the declared length, enforces a 5 MiB streaming hard cap, checks image magic bytes, and writes once to keys allocated by the database under `payment-slips/`.

Browser R2 CORS is not required for payment slips. Keep the S3 API endpoint private to the server runtime. Admin previews use short-lived signed GET URLs, and every preview/approval path first compares R2 HEAD content type, size, and normalized ETag with the persisted metadata.

Configure an object lifecycle rule with prefix `payment-slips/` and expiration `Days: 30` as an explicit infrastructure deployment step. Do not apply this document automatically to a Cloudflare account. R2 lifecycle deletion can occur roughly 24 hours after the exact expiry time. The database keeps ledger, verification, and slip metadata after the private object expires.

Set `PROMPTPAY_ID`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PAYMENT_SLIPS_BUCKET`, and `SUPABASE_SECRET_KEY` only in server runtime secrets. The Supabase secret is restricted to service-role-guarded payment gateway wrappers, so member browsers cannot call the RPC that returns a private object key. Never log these values. The application intentionally returns a safe unavailable response when configuration is absent.
