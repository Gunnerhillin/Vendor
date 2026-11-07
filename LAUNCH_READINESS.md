# CutieValley launch readiness — November 7, 2026

The application has substantial storefront and vendor/admin infrastructure. It is
ready for staging validation and catalog preparation, not yet verified for paid
public launch. Production configuration and applied migrations remain unknown.

| Checklist item | Current finding | Next action |
|---|---|---|
| Stripe webhook | Endpoint exists; unsigned-event fallback fixed locally | Configure secret and test signed events, retries and failures |
| First brands and products | Application, uploads and moderation exist; approval repair tested locally | Deploy to staging, approve two pilot brands and upload 5–10 products each |
| Homepage demo products | Still used when real product arrays are empty | Replace demo fallback with honest empty states before public launch |
| Spotlight | Homepage passes undefined once real products exist; no real featured-vendor selection | Implement admin-controlled featured brand selection |
| Shipping/trust claims | Tracked Shipping and Hassle-Free Returns text exists | Confirm operational promises and vendor fulfillment expectations |
| Flash deals | Vendor/admin screens, route and migration 006 exist | Fix scheduling, expiry restoration, repeat approvals, conflicting deals, database permissions and server-calculated prices |
| Returns | Customer/vendor/admin workflow exists | Add actual refund execution, enforce transitions/eligibility, atomic updates and duplicate protection |
| Migrations | Files 005, 006 and local repair 007 exist | Compare live history/schema, back up, apply missing migrations in staging first |
| Newsletter | Footer calls API and database subscriber insert | Stop claiming success after failed insert; add validation and abuse controls |
| Contact | Form calls existing email route | Configure mail delivery, handle failures, escape all user input and add abuse controls |
| Social image | Existing image has not been visually assessed in this pass | Review brand asset and replace if needed |
| Analytics | Vercel Analytics and Speed Insights are imported/rendered | Verify deployed collection and implement useful conversion events |
| About/Contact content | Pages exist | Supply accurate company identity, support contact, brand story and service commitments |

## Payment blockers found in source

- Webhook previously accepted unsigned payloads. This pass removes the fallback
  and rejects missing configuration, missing headers and invalid signatures.
  Six automated signature cases pass; rejected requests do not access the database.
- Repeated successful-payment events can decrement inventory, create payouts and
  issue transfers repeatedly. Add durable event/payment deduplication, atomic
  inventory/order changes and idempotent transfer calls with recovery handling.
- Checkout accepts variant price adjustment from the request. Derive all prices,
  variant ownership and inventory from database records; validate quantities.
- Completed returns mark order items refunded without issuing a Stripe refund.
  Refund accounting must correctly distinguish partial and full refunds.
- Payout timing currently initiates transfers on payment success; reconcile this
  with the original requested payout timing after fulfillment before launch.

## Pilot acceptance gate

Use staging and test payments. Two brands each provide their business details,
logo, description, support/return information, product photos, SKU/variant data,
prices, available stock and fulfillment expectations. Run application → approval
→ product upload → review → storefront visibility for each brand. Verify that
one vendor cannot view or change another vendor's private records. Confirm a
rejected/pending listing stays hidden and freezing blocks new purchases.

Then run a mixed-vendor test order, failed payment, duplicate webhook delivery,
stock conflict, shipment, partial return/refund and payout reconciliation.
No paid public launch until those scenarios pass against connected staging.

## Additional launch safeguards

Review all privileged API routes and row-level policies; minimize publicly
readable profile information; use admin MFA; restrict uploads by owner/type/size;
add form throttling and bot protection; record moderation/refund/payout actions;
configure error alerts, database backups and a tested restore procedure.

## Information needed next

Confirm hosting provider, production branch and Supabase project access. Inspect
configuration through authenticated dashboards without sharing secrets in chat.
Choose the first two brands and agree on shipping, return window, commission and
payout rules. These business decisions are needed to finalize product behavior.

The earlier 22 database checks and build validation apply to the approval repair.
This pass additionally passed six webhook signature cases and a fresh TypeScript
check. No live credentials, database migrations, deployments or charges were used.
