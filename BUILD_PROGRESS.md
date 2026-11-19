# CutieValley launch build — resume here

Updated: November 19, 2026 (America/Denver).

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
- CONFIRMED: shipping included in vendor prices; admin-reviewed payouts after delivery.
- Commission, return window, support email/company details remain unconfirmed. Build configurable settings; keep real checkout gated until confirmed.
- Stripe live/test keys, endpoint signing secret, event subscriptions and tax setup need verified configuration. Do not assume presence means correct value.
- Resend sender/domain configuration and actual delivery need testing. EasyPost is not ready; manual vendor-provided tracking is first-launch path unless user chooses otherwise.

## Known launch defects being addressed
Checkout currently creates a PaymentIntent then reports success without confirming payment. Coupons only affect browser display. Tax is fixed 8%. Stock is not reserved. Vendor orders cannot reliably read parent addresses or update aggregate status. Existing EasyPost endpoints lack appropriate paid-order ownership checks, use placeholder origin/rates. Public vendor rows include private fields/token; public profile rows include email. Several email routes use service-role access without caller authorization. Returns are non-atomic and do not execute refunds. Payout screen records amounts without transfers. Deal approval immediately changes price and expiry does not restore it.

## Resume procedure
Read this file, git status/log, and latest tests. Continue unfinished items; do not repeat deployed migrations. Update this file at each tested milestone with files, commands, outcome, remaining gaps and deployment state. Never describe all launch work as complete until external integration tests and policy decisions are resolved.


## November 19 checkpoint — local implementation, NOT deployed
- Migrations 011–013 added; tested in isolated PGlite only. Do not deploy code without coordinating these migrations and completing the outstanding gates below.
- Hosted Checkout API now reserves authoritative prices/quantities; idempotent per-customer keys, stock release only from verified expired Stripe sessions, server payment verification, tax allocation and notification intents. Checkout UI redirects to Stripe and polls verified status; persistent cart consumes paid quantities once. Shipping included; automatic Stripe tax configured in code but account tax configuration is unverified.
- Private profile/vendor tables now have public safe-field views. Storefront queries switched to views; actual PostgREST view relationship inference needs a staging smoke test.
- Vendor fulfillment uses authenticated locked database functions, full address visibility scoped to own paid items, carrier/tracking validation, all-brand parent status aggregation. Separate admin delivery verification does not transfer money.
- Returns create/decide/receive functions are atomic, enforce owner/vendor/admin permissions and configured window. Receipt neither refunds nor automatically restocks merchandise.
- Disabled unsafe legacy shipping purchase/lookup and anonymous email routes (410). Removed shipping-token settings and automatic-integration promises. Existing vendor approval email route remains admin-only; unconfigured email no longer returns false success.
- Admin-only `/api/admin/operations` can reconcile up to 20 linked reserved sessions. No scheduler or UI control wired yet. Unlinked Stripe sessions after an interrupted creation need explicit recovery design; never blindly release their stock.
- Added a durable notification outbox table and claim function; dispatcher still NOT implemented. Consequently order/fulfillment/return emails are queued but not sent by this branch.

### Validation at this checkpoint
- 29 approval/access checks, 31 legacy payment checks, 31 product workflow checks.
- 29 new checkout/fulfillment/return database checks.
- 6 webhook signature checks, 15 webhook routing/retry checks, 9 product API checks (150 total).
- `npm run build` passed (66 pages generated). Subsequent vendor settings cleanup and webhook test updates passed `npx tsc --noEmit`; rerun final build before deployment.
- No live charges, refunds, transfers, emails, migrations, or production deployment performed for this checkpoint.

### Next implementation work (not optional launch checks)
1. Expand multi-brand/race and API-level Checkout tests; harden request validation and recover orphan reservations without overselling. Add scheduled reconciliation and visible recovery UI.
2. Build durable email dispatcher with immutable recipient/content snapshots, retries, provider idempotency and clear admin errors. Lock down remaining abuse surfaces.
3. Build refund execution/reconciliation and admin-reviewed transfers after verified delivery, with durable operation IDs, refund/transfer interlocks and transfer reversal handling. Current payout records are still accounting only; returns cannot be marked refunded from UI.
4. Wire return receipt UI; enforce publishable return terms/commission settings; remove old conflicting default policy promises. Add real company/support info once provided.
5. Fix or explicitly disable flash deal/coupon execution; add launch config editor and per-brand commercial terms confirmation.
6. Fix vendor dashboard order summaries still using parent-order joins; smoke-test safe public view embedding and private media on staging.
7. Full two-vendor Stripe sandbox checkout, webhook retry/expiry, return/refund, transfer/reversal and email delivery tests; then coordinated database/main/Vercel deployment. Live checkout remains gated by server env and launch_config.


## Partner guide and notifications checkpoint — November 19
- Published independent guide release to main: 32782f2. Only public/guide/index.html and admin navigation were included. Share URL: https://www.cutievalley.com/guide/index.html. No privilege changes; public guide contains no private account data and management links retain existing authorization.
- Guide includes 28 steps across start/customer/vendor/admin, 20 quick links, troubleshooting, glossary, browser-local checkmarks, copy link and print support. Explicitly distinguishes currently live functionality from development-branch work. Link targets checked against source; browser verified progress persists on reload/reset and phone layout has no horizontal overflow.
- Development only: 014_notification_delivery.sql, notification dispatcher and admin-only /api/admin/notifications. Five-job batches; immutable recipient/content snapshot; stable provider idempotency key; retry backoff and 23-hour cutoff for ambiguous delivery. Provider acceptance is not inbox delivery. No real emails sent and no sender verified in this session.
- Launch setup now links walkthrough and offers admin-triggered reserved-payment recovery / queued notification processing. These operational controls are not on main yet.
- 10 notification unit checks and 3 queue claim/cutoff checks added; database suite now 32 checkout/fulfillment/return/queue checks. Type checking passes. Refund execution/transfers remain the next major work item; no money moved.

- Verification: Vercel production 32782f2 is Ready; the public guide loaded successfully on www.cutievalley.com. Screenshot saved to outputs/partner-guide-live.jpg. Full development production build passed (67 generated pages).
