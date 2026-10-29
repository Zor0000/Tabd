# Production operations

The canonical production origin is `https://www.tab-dd.tech`. Vercel redirects the apex to it. `NEXT_PUBLIC_APP_URL` must match that origin exactly; an apex value rejects legitimate browser writes with 403. Environment changes require a new deployment.

## Shared rate limits

Apply the `api_rate_limits` migration before deploying this code. Every authenticated API request requires `SUPABASE_SECRET_KEY`, including browser requests. Counters are atomic PostgreSQL updates shared by all application instances; the RPC and counter table are accessible only to `service_role`. No in-memory fallback bypasses limits. A missing migration, unavailable database, missing key, or three-second timeout returns 503 with `Retry-After: 30`.

| Budget                                               | Limit | Window  |
| ---------------------------------------------------- | ----: | ------- |
| Browser + extension reads, shared per account        |   300 | minute  |
| Browser + extension writes, shared per account       |    60 | minute  |
| Explicit metadata lookup/retry, per account          |    30 | minute  |
| MCP HTTP requests, shared across an account's tokens |   120 | minute  |
| New screenshots, per account                         |    20 | minute  |
| New screenshots, per account                         |   200 | UTC day |
| New screenshots, all accounts combined               |    60 | minute  |

Limits use fixed UTC windows, so adjacent windows can allow a boundary burst. Rejected calls return 429, private/no-store, and a positive `Retry-After` in seconds. Stored screenshots do not consume capture budgets. A later budget rejecting a request does not refund earlier budgets. These are launch defaults in `lib/rate-limit.ts`; adjust using observed traffic. The global screenshot budget controls starts per minute, not simultaneous browser processes. Large-scale capture still calls for a durable queue and global worker concurrency.

These controls apply after authentication. Vercel's edge protections and Supabase Auth limits remain responsible for unauthenticated floods and sign-in abuse. Browser clients can access their own Supabase rows under RLS directly; these API budgets are not a database access firewall.

## Monitoring

All authenticated API route handlers emit structured `api_request` JSON with normalized route, response status, duration and generated request ID. Responses include `X-Request-Id`. Screenshot outcomes, metadata fetch outcomes, MCP tool outcomes (including errors inside HTTP 200 responses), and unhandled Next.js server errors have separate events. Logs exclude tokens, cookies, request bodies, raw URLs, search queries, user identifiers and raw error messages. Query them in Vercel runtime logs by `service=tabd` and `event`.

The `Production availability` GitHub workflow probes production every 15 minutes, including anonymous access rejection and canonical-origin CSRF behavior. It runs without credentials and uses GitHub Actions' native failed-workflow notifications. Scheduled execution begins after this workflow reaches the default branch; delivery depends on the repository owner's Actions notification preferences. GitHub schedules may be delayed. This is availability monitoring, not a guaranteed paging SLA or full authenticated synthetic monitoring.

Suggested operational thresholds: investigate repeated 5xx, p95 API latency over 2 seconds (excluding capture), rising capture failures, and sustained 429s. Configure Vercel/Supabase spend alerts in their dashboards before broad promotion; this repository does not configure billing thresholds or purchase Observability Plus. Structured logs are available without adding a paid telemetry vendor.

## Acceptance commands

```sh
node scripts/production-smoke.mjs
node --env-file=.env.local scripts/production-acceptance.mjs
```

`TABD_ACCEPTANCE_URL` overrides the application origin. Use the Supabase credentials for that exact environment. The authenticated suite creates two unique, email-confirmed disposable accounts through the admin API, authenticates browser cookies, exercises collection/resource CRUD/search, extension bearer save/revoke, MCP's five tools/revoke, cross-account isolation and hosted Chromium screenshots, then signs out and deletes only its own test accounts and preview objects. It never reads existing libraries or prints credentials. Run it only with reviewed source; it needs the service key. If interrupted before `finally`, remove only accounts named `tabd-acceptance-<uuid>@example.com` created by that run.

Admin-confirmed fixture accounts do **not** verify real email delivery, signup confirmation links, password recovery, or the installed extension's external-message pairing. Complete those flows in a real inbox/browser separately. `npm run build --prefix extension` creates the production extension in `extension/.output/chrome-mv3`, targeting `https://www.tab-dd.tech` regardless of local `.env` files. Its installed extension ID must be in production `NEXT_PUBLIC_EXTENSION_IDS`. After rebuilding, reload the unpacked extension in the browser's Extensions page and refresh the connection tab in that same browser profile. Version 0.1.1 restores the native 360px popup width. Local test builds use `.output-test` and never overwrite the installed release; `npm run dev --prefix extension` remains the localhost workflow.

## Rollback

Roll back to the previous known-good Vercel deployment if the new APIs fail. The rate-limit migration is additive and can remain in place during rollback. Preserve the corrected canonical origin when rebuilding older code. Inspect request errors and repeat both acceptance commands after a release.

## Release verification (18 October 2026)

Acceptance found and repaired two production configuration issues: the app origin must include `www`, and Supabase Auth's Site URL was still `http://localhost:3000` with no allowed redirects. The live Auth Site URL is now `https://www.tab-dd.tech`; the allowlist contains that origin's `/auth/callback` and `/auth/confirm`, including query-string variants. Old reset emails retain the old redirect; request a fresh email after this change.

Acceptance also reproduced a screenshot route startup crash: Next's serverless trace omitted `playwright-core/browsers.json`. The explicit tracing include and `scripts/check-preview-bundle.mjs` guard against that packaging regression. CI imports Playwright from an isolated directory containing only traced dependencies.

For a controlled account-limit check, run `TABD_VERIFY_LIMITS=1 node --env-file=.env.local scripts/production-acceptance.mjs`. This adds a bounded burst of invalid writes using only the disposable test account and checks 429, Retry-After, and X-Request-Id.

## Privacy and support requests

Public entry points: `/privacy` and `/support`. Operator: Neeraj Chormale; private inbox: `neerajcwork@gmail.com`. Never request passwords, recovery links, or connection tokens. Do not put personal data in public issues.

### Verified account deletion

1. Receive a deletion request through the support inbox. Verify control of the account email through a reply and explicit confirmation. An email header or knowledge of an address alone is not proof. If the person cannot access that mailbox, resolve ownership privately before making changes.
2. Offer a library export before deletion. Confirm the correct production project and the exact Auth user UUID. Record only the minimum request details in the private support record.
3. In Supabase Auth, suspend the user's ability to sign in and revoke sessions. Delete that user's extension and MCP tokens. Do not delete the Auth user yet: Storage objects must be removed first.
4. In Supabase Storage, open the private `website-previews` bucket. Remove every object under the exact `<user UUID>/` prefix, including old or orphaned previews. Use the Storage UI or API, never direct SQL deletion of `storage.objects`. Check all pages and nested folders. Verify that this prefix is empty before continuing.
5. Permanently delete only the verified Auth user through Supabase Auth. Foreign keys cascade to `profiles`, `collections`, `bookmarks`, `extension_tokens`, `mcp_tokens`, and `taste_profiles`. Verify that no rows for that UUID remain in those tables. Check the preview prefix again for files written by requests already in flight; remove any remaining objects.
6. If any removal fails, keep the request open and retry. Do not tell the user that deletion is complete until active-system checks pass. Never restore access or recreate data as a workaround.
7. Confirm completion privately. Explain that provider backups and operational logs follow their own retention processes. Do not promise an unverified erasure period. Keep only the support record needed to document handling; remove unnecessary attachments and copies of library data.
8. If a backup is restored later, reapply completed deletion requests before reopening access. Check provider log and backup settings when reviewing this procedure or responding to a specific retention question.

This is a manual procedure, not an automated deletion job. No customer account should be deleted to test these instructions. Validate it with a disposable account before the first customer request.
