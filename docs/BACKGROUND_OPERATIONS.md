# Background operations setup

This development worker is not deployed or scheduled. It never initiates refunds or vendor transfers. Those require admin review.

## Prerequisites

1. Apply migrations 011–023 to a staging database in order after compatibility review. Migration 017 refuses existing approved legacy deals until their original prices are reconciled.
2. Verify hosted checkout, webhook expiration, orphan-session recovery and email delivery with sandbox fixtures. Confirm public view joins through PostgREST.
3. Set CRON_SECRET to a cryptographically random private token of at least 32 characters in the deployment environment. Never put it in source, URLs, screenshots or a public NEXT_PUBLIC variable.
4. Configure the verified Resend sender, RESEND_API_KEY, FROM_EMAIL and HTTPS NEXT_PUBLIC_APP_URL. A configured value does not prove successful delivery.
5. Set ENABLE_BACKGROUND_OPERATIONS=true only in the verified deployment. Live checkout and financial switches remain separately controlled.

## Schedule

Call GET /api/cron/operations with Authorization: Bearer <CRON_SECRET> every five minutes using an authenticated scheduler supported by the hosting plan. Do not include the token in a query string. Vercel sends this bearer header when CRON_SECRET is configured. Verify current hosting-plan frequency and execution-duration limits before adding a production schedule. No vercel.json schedule is installed by this change.

Official references: https://vercel.com/docs/cron-jobs/manage-cron-jobs and https://vercel.com/docs/cron-jobs/usage-and-pricing . A daily-only schedule does not meet the intended operational frequency. Set the function execution allowance to accommodate the bounded batch; timeouts can be retried safely, but repeated timeouts require smaller batches or a dedicated worker.

## Observe and recover

- 200 with ok=true means this batch completed; it does not prove inbox delivery or an empty backlog.
- 401 means bearer authentication failed; 503 means setup/enablement or at least one job needs attention. Results contain counts only. Monitor scheduler logs for failures and missed runs.
- Worker claims at most three checkouts and five emails. Checkouts younger than five minutes are skipped. Previously claimed reservations wait thirty minutes before another automatic attempt; overlapping workers cannot claim the same batch during that lease. Financial/provider reconciliation remains idempotent if a manual recovery overlaps.
- Admin Launch setup shows reserved orders, pending financial operations and queued/failed notifications. The manual controls remain available. Increase throughput only with load and provider-limit tests.
- Missing checkout sessions never authorize stock release. An unresolved checkout remains held for manual provider reconciliation.
- Notifications stop automatic retries after ten attempts or a 23-hour uncertain-provider window. Inspect provider records before any manual resend. Acceptance is not inbox delivery.
- A partial worker failure does not roll back work already completed. Payment and email processing are isolated. Never manually repeat a money transaction to repair a worker failure.

## Release gate

Observe actual successful scheduled runs, a forced provider failure, retry recovery and backlog drainage before opening checkout. Keep source/deployment notes synchronized. Do not claim background processing is active merely because this endpoint exists.
