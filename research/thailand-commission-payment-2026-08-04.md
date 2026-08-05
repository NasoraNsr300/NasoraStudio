# Payment Recommendation for a Solo Commission Artist

Date: 2026-08-04

## Context

The planned website serves one artist. Customers submit commission requests, the artist quotes a price, and the customer confirms and pays through the website.

## Recommendation

Use Stripe Checkout with PromptPay for the first release.

- Stripe supports Thailand accounts registered as an individual, as well as sole proprietorships and companies.
- PromptPay payments are confirmed automatically, so the website can update payment and commission status without manual slip review.
- Stripe currently lists a 1.65% fee per successful PromptPay transaction and a THB 10 fee per refund.
- PromptPay through Stripe is limited to THB, which is suitable for Thai customers but not sufficient on its own for overseas customers.
- Card payments can be added later through the same provider if international demand justifies the higher processing cost.

## Alternative

A generated PromptPay QR with customer-uploaded payment slips has lower gateway cost, but requires manual verification and introduces more operational and fraud-review work. It is best kept as a fallback, not the primary flow.

## Sources

- [Stripe Thailand pricing](https://stripe.com/th/pricing)
- [Stripe PromptPay enablement and automatic confirmation](https://support.stripe.com/questions/how-to-enable-promptpay)
- [Stripe account requirements in Thailand](https://support.stripe.com/questions/what-information-is-required-to-open-a-stripe-account-in-thailand)
- [Bank of Thailand PromptPay overview](https://www.bot.or.th/en/financial-innovation/digital-finance/digital-payment/promptpay.html)

## Confidence and limitations

Confidence: High for provider support and published fees, based on official sources. Merchant approval remains subject to Stripe verification and its current prohibited/restricted-business policies. Pricing and eligibility should be rechecked immediately before implementation.
