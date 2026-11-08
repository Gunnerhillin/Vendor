# CutieValley launch build — resume here

Updated: November 7, 2026 (America/Denver).

## Authorization and boundaries
User requested implementation of all launch-flow steps and durable progress notes. Earlier main deployment is c7ce10e. Preserve Next.js 14 / React 18 / Supabase / Stripe. Do not expose or commit credentials. No real charges, refunds, transfers, or merchant policy promises during development. Stripe browser access was blocked; do not bypass that restriction. User can complete account configuration when needed.

## Workspaces
- Source with installed dependencies: `work/project/Vendor-main`.
- Git checkout: `work/github-vendor`, branch `complete-launch-flow`.
- Main is deployed on Vercel project vendor-uiu3; production domain www.cutievalley.com.
- Supabase project boaancwwxwcvfuammuly; migrations 007–010 installed. Restricted snapshots in launch_backup_20261107. Existing 001–006 schema was present without reliable migration history; do not replay them on production.
- Run `python work/package_current.py` from the workspace root to sync source to Git checkout and refresh deliverables. Review diff before commits. That script excludes dependencies, build artifacts and .env files.

## Completed before this build
- Atomic vendor approvals and product review security; private media access.
- Product drafts, submission, rejection feedback, stock-only edits, stable URLs, transactional image saves.
- Payment webhook duplicate protection and refund accounting holds (legacy PaymentIntent path).
- CutieValley recruitment-page branding; unconfirmed marketing promises removed.
- 115 targeted tests plus build passed. This did NOT constitute complete payment/fulfillment integration testing.

## Current task sequence
1. IN PROGRESS: hosted Stripe Checkout, stock reservations, server totals, truthful success state, safe cancellation/expiry.
2. TODO: private vendor/profile data separation; shipping/email access restrictions and abuse controls.
3. TODO: vendor fulfillment API, complete shipping addresses, tracking, multi-vendor order status aggregation.
4. TODO: transactional return requests/decisions, admin refund execution with idempotency and reconciliation, physical receipt handling.
5. TODO: delivery-gated admin-reviewed vendor transfers; prevent refund/payout races; distinguish transfers from bank payouts.
6. TODO: durable notification outbox, retries, configuration errors, admin recovery controls.
7. TODO: coupons/deals either fully correct server pricing or explicitly disabled; launch settings and policy configuration.
8. TODO: two-vendor end-to-end sandbox order, failure/retry/expiry, partial/full refund, payout and notification tests; coordinated deployment.

## Unresolved business/configuration inputs
- Asked user: shipping included in vendor prices versus separate per-vendor shipping charges; admin-reviewed payouts versus scheduled cycle. Await response.
- Commission, return window, support email/company details remain unconfirmed. Build configurable settings; keep real checkout gated until confirmed.
- Stripe live/test keys, endpoint signing secret, event subscriptions and tax setup need verified configuration. Do not assume presence means correct value.
- Resend sender/domain configuration and actual delivery need testing. EasyPost is not ready; manual vendor-provided tracking is first-launch path unless user chooses otherwise.

## Known launch defects being addressed
Checkout currently creates a PaymentIntent then reports success without confirming payment. Coupons only affect browser display. Tax is fixed 8%. Stock is not reserved. Vendor orders cannot reliably read parent addresses or update aggregate status. Existing EasyPost endpoints lack appropriate paid-order ownership checks, use placeholder origin/rates. Public vendor rows include private fields/token; public profile rows include email. Several email routes use service-role access without caller authorization. Returns are non-atomic and do not execute refunds. Payout screen records amounts without transfers. Deal approval immediately changes price and expiry does not restore it.

## Resume procedure
Read this file, git status/log, and latest tests. Continue unfinished items; do not repeat deployed migrations. Update this file at each tested milestone with files, commands, outcome, remaining gaps and deployment state. Never describe all launch work as complete until external integration tests and policy decisions are resolved.
