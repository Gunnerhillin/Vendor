# Payment event repair — November 7, 2026

Status: implemented and tested locally; not applied to the live database or deployed.

## What changed

- Webhooks require a verified signature and configured signing secret.
- Migration 009 records event IDs, locks the matching order, and commits payment,
  inventory, earnings and payout records atomically. Repeated events and distinct
  success events for the same payment cannot repeat fulfillment bookkeeping.
- Errors return HTTP 500, leaving no completed-event marker, so delivery can retry.
  Missing orders, missing items, amount/currency mismatches and insufficient stock
  fail explicitly. Stock is updated arithmetically, including variants.
- Payment failures no longer cancel retryable orders or overwrite successful ones.
- Refund events retrieve current Stripe data, paginate refunds and count only
  succeeded refunds. Pending/failed refunds do not count as refunded money.
- Cumulative refunded cents never decrease when an older event arrives. Partial
  refunds preserve order/item fulfillment status. Full refunds mark the order
  and its items refunded. Neither event restocks physical goods.
- Refunds hold related payouts for reconciliation. Charge-level events do not
  identify SKU/tax allocation or transfer reversals, so the app does not invent
  an allocation. Vendor lifetime earnings remain accrued figures until that
  reconciliation is implemented; they must not be treated as withdrawable cash.
- Payouts now have an order/vendor identity and remain pending. Automatic Stripe
  transfers and fire-and-forget order emails were removed from this webhook.
  A reliable payout-release and notification workflow remains launch work.
- The returns endpoint blocks false 'completed/refunded' decisions. It does not
  yet execute a refund. Issue real refunds in Stripe and reconcile them; an
  in-app refund execution/physical-restocking workflow remains unfinished.
- account.updated retrieves current Stripe account eligibility. A return URL no
  longer marks onboarding complete. Database guards prevent client changes to
  account IDs/eligibility; Connect account creation uses a vendor idempotency key.
- Checkout validates integer quantities, aggregate stock and variant ownership;
  variant adjustments come from the database. Priced order inserts are server-only.

## Verification

- 31 database payment/rollback checks pass.
- 29 catalog, approval and access-control checks pass.
- 6 signature cases pass, including rejection before database access.
- 9 webhook routing/error/refund-status checks pass.
- TypeScript and production build pass with dummy local configuration (61 routes).

PGlite supplies disposable PostgreSQL with minimal Supabase auth/storage stubs.
These checks are not a live Supabase/Stripe integration test. PGlite serializes
requests; multi-connection concurrency still needs staging validation.

Run from the project root:

```sh
npm ci
npm ci --prefix tests/approval --ignore-scripts
node tests/approval/approval.test.mjs
node tests/approval/payment.test.mjs
node tests/webhook-signature.cjs
node tests/webhook-processing.cjs
npx tsc --noEmit --incremental false
```

## Required deployment steps

1. Back up and compare the database before changing it. The live audit found
   schema additions from 005/006 already present, sample_images present, three
   vendors, one product, no orders/deals, private asset buckets and no Storage
   policies. Migration history was empty despite the existing schema.
2. Apply new migrations 007, 008 and 009 to staging. 008 changes upload permissions
   and migrates image references while keeping buckets private; review it first.
   Do not reapply existing migrations 001-006 to production.
3. Deploy matching code and database changes together. Old checkout code depends
   on browser insert permissions that 009 removes. Rollback requires a reviewed
   paired database/application plan, not merely reverting the deployed commit.
4. Configure the matching Stripe sandbox keys and endpoint signing secret in the
   staging deployment. This task has not read, copied or changed secrets.
5. Subscribe to payment_intent.succeeded, payment_intent.payment_failed,
   charge.refunded, refund.updated, refund.failed, and account.updated. The last
   two refund events ensure asynchronous refund outcomes are reconciled.
6. Test with real sandbox orders and signature-verified deliveries; repeat a paid
   event, fail then retry a payment, issue partial/full refunds, and verify stock,
   pending payouts and account eligibility. Do not run these against real charges.

Remaining payment launch gaps include stock reservation before capture, recovery
for charged-but-out-of-stock orders, refund allocation/transfer reversals, actual
payout release, production tax calculation (checkout still has its existing 8%
placeholder), and durable customer notifications. Do not enable paid public
launch based solely on these local checks.
