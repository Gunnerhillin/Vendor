# CutieValley launch build — resume here

Updated: November 23, 2026 (America/Denver).

## Latest checkpoint — November 23, 2026
Development contains migrations 011–024. None have been deployed. Production main remains 32782f2 (partner guide). Development checkpoints ae7249b and 9506533 are pushed. Production main remains unchanged. Live switches were NOT enabled.

Latest validation: full production build passed (69 generated pages), including financial review and updated admin controls. GitHub independently passed all tests and build for 9506533. Database suite now 112, operations/readiness 25, checkout provider recovery 13, financial provider mocks 19, read-only financial review 19, notifications 15, approval 29, legacy payments 31, products 31, product API 9, webhook signature 6 and routing 15. Run all suites and a final build before release. These are local checks, not Stripe end-to-end tests.

Implemented on development: hosted checkout/reservations/recovery, private data, multi-brand fulfillment, returns/receipt/refunds, admin-reviewed transfers/reversals, confirmed business terms and order policy snapshots, scheduled deals, contact inbox/newsletter capture, verified reviews, notification dispatcher, recovery inbox and configuration-presence checks. Partner guide is independently live at https://www.cutievalley.com/guide/index.html.

Next required: staging migration/PostgREST compatibility; actual two-brand Stripe sandbox checkout/refund/transfer/reversal/email tests; verify tax/webhook/sender configuration; financial failed-operation and external-refund/dispute reconciliation; configure and observe the background schedule; coordinated deployment with checkout closed. Business details and brand agreements remain unconfirmed. Do not treat configuration-present checks as integration success.

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


## Financial operations implementation — November 19 (development only)
- Added 015_financial_operations.sql. Admin-reviewed preparation locks the parent order and payout, snapshots amounts/destination, and serializes outstanding financial operations per order. Customers/vendors cannot prepare transfers or refunds. All active brand items need admin-verified delivery; commercial terms and Stripe readiness must be confirmed; open returns block transfers.
- Full order-item returns (all quantities on that item) now require approval and documented physical receipt before refund preparation. Refund includes allocated item tax. Inventory is NOT automatically restocked. Receipt UI and financial actions are wired into Admin Returns; payout UI explicitly distinguishes Stripe transfers from bank payouts.
- Added /api/admin/finance and financial-operations helper. Server creates/retrieves Stripe objects with persistent operation metadata and idempotency keys. Unknown operations older than 23h stop for reconciliation; recovery searches existing provider objects before considering a new request. After-transfer refunds reverse the brand share before refunding; failures keep the operation pending and block conflicting money movement.
- Managed refund webhooks reconcile item/return/accounting state before the cumulative legacy refund ledger. External/unallocated refunds keep payout reconciliation holds; no guessed allocation. Provider acceptance/pending is not reported as refund success.
- ENABLE_LIVE_FINANCIAL_OPERATIONS must explicitly be true before live execution. It has NOT been set, and no live or sandbox money-moving calls were executed by the agent.
- 19 provider-mock checks pass (duplicates, pending refunds, reversal ordering, aged operation recovery, external refund mismatch, live gate); database checkout suite now 51 checks including 19 new financial permission/state/accounting checks. Webhook signature and routing checks pass.
- Still required: actual Stripe sandbox two-brand checkout/refund/transfer/reversal tests, failed-reversal recovery and external refund/dispute reconciliation tooling, tax reporting verification, UI browser test with fixture orders, production migration compatibility/backup and coordinated deployment. Failed or cancelled Stripe refunds remain pending for explicit reconciliation rather than silently reissuing money. Financial code is not deployed to main.


## Continued launch build — November 23 (development only)
- 017 scheduled deals: vendor requests and admin approval are atomic, enforce approved ownership, 5–80% discount, future start and 3–6 day duration, prevent overlap, and calculate sale price on the server. Base product price is never overwritten. catalog_products and checkout use effective prices at current time; edits invalidate deals. First implementation supports products without variants; UI explains this restriction. Coupons explicitly unavailable instead of showing unapplied discounts. Migration deliberately stops if legacy approved deals exist until base prices are reconciled; pending legacy requests are retired with explanatory notes.
- 018 checkout recovery: locked, validated Stripe session linking (reference, subtotal, currency and test/live mode). Verified webhooks repair interrupted session saves. Admin recovery can target a particular order or search a bounded Stripe creation window for an orphan. Unverified absence never releases stock; genuinely uncreated sessions still require manual reconciliation.
- 019 contact/lead capture: contact messages are durably stored in an admin-only inbox; public forms have bounded inputs and transactional per-email/global limits. Newsletter inserts are idempotent and direct anonymous inserts are blocked. No confirmation emails are sent to arbitrary unverified addresses. Admin sidebar now has Customer Messages. Capturing a lead is not a tested marketing-email system.
- 020 verified reviews: service-only atomic review creation/removal requires a delivered paid purchase from another brand; duplicate and direct-client writes blocked, rating aggregate updated transactionally.
- 021 order policy snapshots: checkout saves the confirmed return terms; changing launch settings does not rewrite existing orders' return windows. Customer order page displays saved terms and immutable product title.
- Admin launch recovery inbox lists reserved sessions, unresolved financial operations and queued/failed notifications. Financial retries still route through the amount-review screens; no unsafe force-success or release controls.
- New checks: database suite 99 (was 65), plus 13 Checkout interrupted-save/provider recovery checks. Existing financial 19, notification 10, webhook routing 15 and product API 9 pass. All new work remains off production pending coordinated migration/API integration tests.
- Required staging smoke test: PostgREST relationship inference for catalog_products joins to images, variants and vendor_directory. Local SQL tests verify catalog visibility and prices, but do not run PostgREST itself.

## Background recovery and security checkpoint — November 23
- Added protected /api/cron/operations, disabled unless ENABLE_BACKGROUND_OPERATIONS=true and a non-placeholder CRON_SECRET of at least 32 characters is configured. Constant-time hashed bearer comparison; no financial transfers/refunds initiated by the worker. No schedule or credentials have been installed.
- 022 claims small reserved-checkout batches with row locks and a 30-minute lease, skips new checkouts for five minutes, rotates previously attempted records behind untouched records. Missing provider evidence never releases inventory. Email queue claims remain independently fenced/idempotent. Provider failures return a failed health response without exposing underlying secrets/errors.
- Admin Service setup checks configuration presence only, exposes booleans/payment mode, never credentials. It explicitly requires real integration tests. 25 authorization/redaction/failure-isolation checks pass.
- 023 restricts public profile discovery to visible-review authors or authorized own/admin/return workflows. Commission confirmation now rejects more than two percentage decimal places, avoiding rounding 99.999% to a full 100% commission. Database suite passes 109 checks.
- About/local/brand pages now match shipping-included launch flow; unsupported checkout pickup badges/promises removed. No unconfirmed business identity details were invented.
- Read docs/BACKGROUND_OPERATIONS.md before scheduling. Scheduler configuration is intentionally not activated before staging validation; daily-only schedules are insufficient for prompt order notification and recovery.

## Financial review and continuous validation — November 23
- Admin Launch setup has a read-only Stripe comparison by full order ID. It reports disputes, failed refunds, external/unmatched refunds and transfers, refund-ledger differences, reversed transfers and incomplete provider listings. It never moves money or clears holds. Full order IDs can be copied from Admin Orders and are shown in pending-finance records. 19 authorization/mismatch/redaction checks pass.
- 024 queues customer refund and brand-transfer confirmations only when a financial operation changes to succeeded; stable operation-based deduplication prevents duplicate callbacks from producing duplicate mail. Transfer messages explicitly do not claim bank payout. SQL suite now 112; notification suite 15.
- All twelve local suites pass (324 checks total); production build passes with 69 generated pages. Provider calls are mocked, database tests use isolated PGlite. No real Stripe account access, money movement, outbound email, production schema change or checkout enablement occurred.
- Added npm test runner with per-suite timeout and immediate failure; GitHub workflow validates pull requests and main/development pushes using pinned Actions commits, Node 24, locked dependencies, read-only token and dummy service credentials. GitHub run 45319616770 passed on commit 9506533: https://github.com/Gunnerhillin/Vendor/actions/runs/45319616770 . Environment files excluded broadly from Git.
- Remaining hard gates: staging PostgREST joins/migration compatibility, actual provider integration tests, business/brand terms, scheduler configuration/monitoring, external refund allocation and failed-operation resolution. Read-only payment review assists investigation; it does not implement arbitrary manual accounting overrides.

## Saved handoff
- GitHub independent validation succeeded for development commit 9506533 (all suites and production build).
- Source partner guide extended to 32 steps with development-only customer messages, flash deals, service checks and financial review; unique checkmarks/section links validated. Public production guide remains its previously deployed 28-step version until the next coordinated release.
- UTF-8 encoding normalized for progress notes, operational documentation and contact migration. A narrow source scan found no private Stripe/signing-key or private-key-block patterns; this is not a comprehensive security certification.
- No main deployment in this continuation. Do not merge 011–024 code into production without schema compatibility and real-provider testing. Development work is pushed and local output archive/progress notes refreshed.
