# CutieValley approval repair

Prepared November 7, 2026.

## Source reconciliation

The uploaded archive's source and migrations match GitHub commit
`c1c21a70d656d4e56b3379a616bd54888a068e7f` from March 25, 2026.
Repository: https://github.com/Gunnerhillin/Vendor
The public https://www.cutievalley.com/ homepage responded successfully and
displayed the CutieValley storefront. Its deployed commit, branch, environment,
and actual database schema have not been verified. No remote changes were made.

## Existing implementation

Next.js 14 App Router, React 18, TypeScript, Tailwind, Supabase Auth/PostgreSQL/
Storage, Stripe Connect and payments, Resend email integration, EasyPost shipping.
Storefront, vendor applications and portal, admin moderation, orders, returns,
deals, and earnings screens exist. Presence of code is not proof of a working
production integration. Vendor Analytics and Messages navigation targets have no
corresponding pages. Original requirements call for vendor applications with
samples, administrator approval, manual product review, inventory/variants,
vendor earnings and payouts, and a strong mobile experience. The photographed
requirements were visually reviewed; unchecked choices remain ambiguous.

## Confirmed causes in the supplied code

1. Vendor approval performed two browser writes. Vendor update permissions
   allowed the first write, but profile update permissions only allowed users
   to update their own profile. An admin updating another user's role could
   affect zero rows without an error. The UI never verified the second write.
2. Status mutations treated absence of a database error as success without
   requesting the saved row. Reads and failures were mostly hidden.
3. The application inserts `sample_images`, absent from all shipped migrations.
   A database created from this repository alone rejects that application.
4. Owners could change their own role, approve their own vendor record, and
   publish products through direct database/API requests. Listing edits did
   not consistently return to review. These violate administrator moderation.
5. Approved products remained publicly readable when their vendor was frozen.
   Checkout did not explicitly require both product and vendor approval.
6. Vendor notification used a privileged database client without checking the
   caller. Email failures could be reported as success or silently ignored.

These are code/schema findings. Production may have undocumented schema/policy
changes, so the exact live failure still requires checking its database.

## Changes

- Migration 007 adds sample images, an admin-only transactional vendor decision
  function, role protection, vendor/product moderation guards, profile updates
  for administrators, and product/media visibility tied to vendor approval.
- Vendor approval and its profile role update now commit together, preserve
  existing admin roles, and repair approved vendors still marked customer.
- Applicants no longer assign themselves a vendor role before approval.
- Admin vendor decisions use the database function. Product decisions request
  the saved row so missing/blocked writes produce visible errors.
- Product API edits reject owner-supplied approval and send listing changes
  back to pending. Database guards also cover direct writes and media/variants.
- Inventory-only changes retain moderation status. Content changes require
  review. Frozen vendors cannot edit listings. Unfreezing restores visibility
  for previously approved products; pending products still need review.
- Checkout rejects unavailable, unapproved, and frozen-vendor products.
- Notification checks authentication, admin role, saved status, and delivery.
  Admins see a warning when the decision saved but the email failed.
- Upload failures stop silently discarding application/product images.
- Missing user/vendor no longer leaves the product page loading forever.
- TypeScript targets ES2017 to support existing Set iteration. Production
  builds now check types instead of suppressing errors. Stack and dependency
  versions remain unchanged.

## Validation

- 22 PostgreSQL checks passed using disposable PGlite across migrations 001-007:
  admin and nonadmin actions, zero-row unauthorized writes, invalid/missing
  records, rollback when role assignment fails, role promotion, direct approval
  bypass attempts, content/media re-review, inventory-only updates, freeze and
  unfreeze visibility, and blocked frozen-vendor edits.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: passed, including type checks and all 58 generated routes,
  with dummy local Stripe/Supabase values. No real credentials were used.
  Supabase pointed to an unavailable loopback address. This build is a compile
  check, not a production-ready deployment or a test of real data retrieval.
- Existing Browserslist age warnings remain. The existing lint command has no
  separately validated lint configuration; no standalone lint pass is claimed.
- Browser approval flow, Supabase HTTP integration, real emails, Storage,
  payments and shipping require a staging environment. This is a focused
  approval repair, not a complete security audit or launch certification.

## Rollout and reconciliation

1. Confirm hosting provider, production branch and deployed commit. Repository
   source suggests Vercel, but this has not been independently confirmed.
2. Inspect Supabase migration history and actual columns, triggers and RLS
   policies. If migrations 001-006 are present, apply only 007 to staging first.
   Do not rerun 001 over an existing database. The nested duplicate
   `supabase/supabase/migrations/001_initial_schema.sql` is not a second schema
   to apply. Resolve any existing custom approval triggers before applying 007.
3. Back up database/schema and use the packaged patch on a branch based on the
   commit above, or compare/rebase if main has moved. Migration 007 changes
   permissions and enforces re-review, so deploy it together with the app.
4. Confirm the `vendor-assets` public Storage bucket and per-user upload rules
   for `vendor-applications/<user-id>/...` and `products/<user-id>/...`. The
   archive contains no Storage setup migration; this package does not alter
   live bucket policies. Check the launch commission configuration: the schema
   defaults to 15% while the form explicitly supplies 25%; this is unchanged.
5. Configure existing environment variable names through the hosting provider:
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_APP_URL,
   RESEND_API_KEY, FROM_EMAIL, plus existing webhook/shipping settings.
   Use https://www.cutievalley.com for the production app URL. Keep all secret
   values in hosting/Supabase settings; never paste them into chat or GitHub.
6. In staging, submit a new application with samples; approve it as admin;
   confirm the vendor role; add a pending product; approve/reject it from both
   moderation screens; refresh and check persistence as a logged-out shopper.
   Edit content/media and confirm re-review. Freeze/unfreeze and verify
   storefront plus checkout restrictions. Test nonadmin denial and email
   delivery. Check existing approved vendors after role repair.
7. Review the patch and staging results, then merge/deploy and run the same
   smoke checks in production. No push, merge, migration or deployment has
   been performed by this task.

The patched project includes no credentials, dependency folders, generated
build output, uploaded private requirements, or Git history. The patch applies
against the GitHub commit above with `git apply --check` followed by `git apply`.
The source archive is also available for direct review.
