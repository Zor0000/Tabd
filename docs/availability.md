# Production availability

The `Production availability` GitHub Actions workflow checks the production app
and Supabase every 15 minutes (at minutes 7, 22, 37, and 52 UTC). GitHub may delay
or skip scheduled runs, so this is best-effort monitoring, not an uptime SLA.
Standard runners are free for this public repository.

The database probe makes three read-only REST queries, one each against profiles,
collections, and bookmarks. It uses only a publishable key with the anonymous role
and requires empty results, checking both database availability and private-data
isolation. It retries failures twice with bounded delays and 15-second timeouts.
Response bodies and credentials are never logged. No schema changes are required.
The app and database steps run independently so an app failure cannot skip the
database check. Failed checks fail the workflow; enable GitHub Actions failure
notifications in your personal GitHub notification settings.

Configuration in GitHub Settings → Secrets and variables → Actions:

- Variable `NEXT_PUBLIC_SUPABASE_URL`: the production project HTTPS URL.
- Secret `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its `sb_publishable_` key.
- Never supply a service-role or secret key to this probe.

Manual verification: run `Production availability` from the Actions tab, or run
`node --env-file=.env.local scripts/supabase-health.mjs` locally.

## Inactivity and recovery

The October 25, 2026 warning concerned insufficient database activity, not deletion.
The existing page-only checks did not exercise the database. Supabase says a few
database requests each day typically avoid inactivity pauses. This probe provides
that activity, but only a paid Supabase plan guarantees exemption from pausing.

GitHub disables schedules in public repositories after 60 days without repository
activity. A separate daily Codex watchdog checks workflow state and recent runs,
re-enables a disabled inactivity schedule, and dispatches a check if none ran in
24 hours. The watchdog requires the Codex host to be available and authenticated;
it is not an independent always-on cloud service. Do not rely on it while the host
is offline for extended periods. Re-enable the workflow manually in Actions if
needed. No artificial commits or privileged Supabase credentials are used.

If Supabase is paused, resume project `sdzrbpehdgogldydzsde` in the dashboard within
90 days, wait for `ACTIVE_HEALTHY`, then rerun the monitor. Do not create a new
project or change billing as an automatic recovery action.

References:

- https://supabase.com/docs/guides/platform/free-project-pausing
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
