# Approval database checks

Run from the repository root:

```sh
npm ci --prefix tests/approval --ignore-scripts
node tests/approval/approval.test.mjs
npx tsc --noEmit --incremental false
```

The 22 checks run migrations 001-007 in disposable PGlite PostgreSQL. The harness
provides minimal Supabase auth functions, authenticated/anonymous roles, and the
core PostgreSQL UUID generator in place of uuid-ossp. No live services or secrets
are used. This verifies database rules and rollback behavior, not real Supabase
HTTP/auth integration, Storage policies, browser interaction, or email delivery.
