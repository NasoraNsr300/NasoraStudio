# Private R2 payment slips

Use a private R2 bucket. Do not enable public access or a custom domain. The application signs short-lived S3 API URLs for keys under `payment-slips/`.

Configure browser upload CORS for each deployed application origin:

```json
[
  {
    "AllowedOrigins": ["https://your-production-origin.example"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Configure an object lifecycle rule with prefix `payment-slips/` and expiration `Days: 30`. R2 lifecycle deletion can occur after the exact expiry time. The database keeps ledger, verification, and slip metadata after the private object expires.

Set `PROMPTPAY_ID`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_PAYMENT_SLIPS_BUCKET` only in server runtime secrets. Never log these values. The application intentionally returns a safe unavailable response when configuration is absent.
