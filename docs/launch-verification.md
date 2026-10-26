# Launch verification — 19 October 2026

## Production

- Live URL: https://www.tab-dd.tech
- Local `main` and fetched `origin/main`: `7b5f2e7f758acab2e0460a44334a2b569240736b` (PR #15). Working tree was clean at inspection.
- Initially deployed: `3a43b5f34728eadf72d5730b4421d1e641d2bbe4` (PR #14).
- Deployed the exact validated main SHA to project `tabd` / `prj_21lpV1EHrQCZAnbA1ZnFJnSKY00q`, team `zor0000s-projects`.
- New deployment: `dpl_ESRpX1jJdEUs7gJKco5UAemXxJTM`, READY, production target, canonical domain assigned, no alias error. Confirmed again by resolving `www.tab-dd.tech` through Vercel after deployment.
- [Deployment inspection](https://vercel.com/zor0000s-projects/tabd/ESRpX1jJdEUs7gJKco5UAemXxJTM). Direct deployment hostname: `tabd-rh5lo60v1-zor0000s-projects.vercel.app` (may require Vercel authentication).
- The connector could inspect but its deployment request returned a team-access 403. The separately authenticated Vercel CLI succeeded with the same explicit project, team, target, and SHA. No credentials were changed.
- Previous known-good deployment retained for rollback: `dpl_GU7i9ZvK8DtngFr57d4NKVse71WD`.

## Checks

| Evidence                                                                                                    | Result                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Main CI](https://github.com/Zor0000/Tabd/actions/runs/39135850416)                                         | Passed on the exact deployed SHA: lint, types, unit/database tests, dashboard build, isolated screenshot bundle verification, extension build/types, desktop/mobile/responsive browser tests, extension tests |
| Bounded `node scripts/production-smoke.mjs`                                                                 | Passed before and after deployment: login, preview, extension status, anonymous library/preview rejection, MCP method/auth rejection, canonical-origin CSRF behavior                                          |
| Isolated headless Chromium against deployed site                                                            | Home, login, and preview returned 200, rendered content, and emitted no page runtime errors                                                                                                                   |
| Production extension rebuild                                                                                | Version 0.1.1 built in the existing `extension/.output/chrome-mv3` directory with explicit production origin                                                                                                  |
| `node tests/extension-production.mjs`                                                                       | Passed production-origin handshake with a fixture page and real toolbar popup (360 × 298). This is not a repeat of the owner's live Arc save acceptance                                                       |
| ZIP verification                                                                                            | Ten allowlisted runtime files; root manifest; archive CRC and byte-for-byte comparison passed; manifest version, origin, permissions, and both compiled configured origins checked                            |
| [Fresh manually dispatched availability workflow](https://github.com/Zor0000/Tabd/actions/runs/39250922566) | Passed on main; dispatched before deployment completed. Separate local post-deployment smoke passed afterward                                                                                                 |

No application code changed in this launch task. The existing exact-SHA CI was used instead of rerunning the whole suite. New files are release documentation; the ZIP is generated output under ignored `artifacts/`.

The previously confirmed signup/email confirmation/recovery/sign-in, resource preservation, empty new-account library, Arc pairing/save, five MCP tools, account isolation, revocation, and hosted screenshot acceptance remain the acceptance baseline. No new evidence warranted recreating accounts or repeating those flows. Supabase Auth redirects and database migrations were left unchanged. Arc and SpaceO were not used.

## Monitor and capacity limitations

The availability workflow is active and configured at minutes 7, 22, 37, and 52. Recent recorded scheduled successes were hours apart, with the most recent scheduled run at 06:45 UTC (12:15 IST) before this task's fresh manual run at 12:17 UTC (17:47 IST). The configured cadence is not observed 15-minute coverage; GitHub scheduling delays remain an operational limitation. The manual success verifies workflow operation, not scheduling timeliness or notification delivery.

Functional acceptance and configured rate limits are not load tests. No measured concurrent-user or request-throughput capacity is claimed. Spend alerts and Actions notification preferences were not verified or changed.

## Release and publication

See [extension installation/update and distribution](extension-release.md) and [product copy, getting started, and announcement drafts](launch-materials.md). ZIP SHA-256: `79e0bf8dc38b2842b5409dbc1d22778414cb19c6189c2f82c038327707092887`.

The owner subsequently authorized making the repository public and preparing a Chrome Web Store submission, with announcement drafts for X. The repository is now public. The ZIP is distributed as a public GitHub unpacked pilot release; no public announcement or store submission has been made. New unpacked installations still require their IDs to be registered before pairing. The owner’s current unpacked path and verified ID are preserved. The store submission packet and privacy draft are kept locally and excluded from Git. See [X drafts](x-announcement.md).
