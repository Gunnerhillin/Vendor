# Product workflow and vendor recruitment release

November 7, 2026. Requires migration 010_product_workflow.sql after 007–009.

Vendors can save drafts, submit completed listings, read rejection feedback, and update stock without restarting approval. Product URLs stay stable on edits; new slugs include a UUID to avoid collisions. The product and image rows save in one transaction, so image failures roll back the product edit. Uploaded files remain immutable; unused uploads are not automatically deleted.

Admins can search by product or brand, inspect the full description and stock, and approve or reject submitted listings. Rejections require feedback. Both saving and moderation check the last update time to prevent overwriting a newer change. Draft deletion reports failure honestly and respects existing order references. Existing variants are preserved; a variant editor is not part of this release.

The vendor portal has mobile navigation and no links to unimplemented analytics or messages pages. The recruitment page uses CutieValley branding and the storefront pink/plum palette. Unconfirmed traffic, commission, review-time, and payout promises were removed. Application links go directly to /vendor/apply.

Validation: 31 new database workflow/rollback/access checks and 9 API cases, plus 75 existing approval/payment/webhook checks. Production build and TypeScript pass. The marketing page was visually reviewed at desktop and mobile sizes. Live Stripe payments/refunds and real vendor onboarding are separate outstanding launch checks.

Run:
```
node tests/approval/product.test.mjs
node tests/product-api.cjs
node tests/approval/approval.test.mjs
node tests/approval/payment.test.mjs
node tests/webhook-signature.cjs
node tests/webhook-processing.cjs
npm run build
```
