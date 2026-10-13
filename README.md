# Tabd

[![CI](https://github.com/Zor0000/Tabd/actions/workflows/ci.yml/badge.svg)](https://github.com/Zor0000/Tabd/actions/workflows/ci.yml)

A developer-first personal web library. Next.js dashboard first, with a WXT Chrome extension using the same authenticated API and Supabase database.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase/PostgreSQL, and WXT. Save useful links, organize them into collections, and find them again from the dashboard or Chrome extension.

## Current status

Implemented: dashboard, protected account routes, email/password authentication, optional Google OAuth, save/edit/delete, duplicate detection and update, three-level collections, favorites, archive, status management, database full-text search, client filtering, grid/list preferences, opening history, revisit suggestions, JSON export, profile name, light/dark themes, metadata retrieval, and Chrome account linking.

Without environment variables the app shows a clearly labeled, read-only preview. A fresh clone needs its own Supabase configuration for account features. Credentials belong in the ignored `.env.local`; they are not included in this repository. Live registration, email delivery, and extension-to-hosted-database acceptance still need to be checked for each configured environment.

## Run the dashboard

Use Node.js 26 (`.nvmrc`). The test tooling also supports Node.js 22.12+ within the 22.x release line and Node.js 24.x. Use npm and the committed lockfiles for reproducible installs.

```sh
git clone https://github.com/Zor0000/Tabd.git
cd Tabd
nvm use
npm ci
npx playwright install chromium
cp .env.example .env.local
npm run dev
```

This is a private repository; cloning requires access to `Zor0000/Tabd`. If you do not use nvm, install Node.js 26 before running the npm commands.

Open http://localhost:3000. If that port is occupied, use `npm run dev -- --port 3210` and use that origin in the setup below. `/preview` always opens the sample library; real signed-in accounts start empty.

## Connect Supabase

1. Create a new project in the Supabase dashboard. Do not use an unrelated project's credentials.
2. Apply every SQL file in `supabase/migrations/` in filename order, or use the CLI commands below. This includes the initial library schema and the collection parent index.
3. From the project's Connect/API Keys settings copy its project URL and publishable key to `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SECRET_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
NEXT_PUBLIC_EXTENSION_IDS=
```

The initial migration is **`supabase/migrations/20261011091851_initial_library.sql`**; **`supabase/migrations/20261011140406_index_collection_parent.sql`** adds the collection parent index. Use `npx supabase login`, `npx supabase link --project-ref YOUR_PROJECT_REF`, and `npx supabase db push` to apply all migrations using the CLI. Inspect the linked project before pushing.

The publishable key is safe in the browser because tables enforce RLS. The secret key (or legacy service-role key) is **server-only**, used exclusively to validate extension tokens and operate on the validated owner's rows. Never add it to the extension, `NEXT_PUBLIC_*`, or source control. Web dashboard operations use the user's session and RLS, not the secret key.

4. In Authentication → URL Configuration, set the Site URL to your application origin and add `http://localhost:3000/auth/callback` to allowed redirects (substitute your actual port). Add your production callback before deployment.
5. Email authentication is enabled in Supabase by default. Decide whether email confirmation is required; for production configure SMTP. The app clearly asks unconfirmed users to check email.
6. Optional Google OAuth: configure Google credentials in Supabase, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. Google must allow the Supabase provider callback URL shown in its dashboard.
7. Restart Next.js, visit `/login`, and create an account.

## Install the Chrome extension locally

```sh
cd extension
npm ci
cp .env.example .env
npm run build
```

Set `WXT_APP_URL` in `extension/.env` to your dashboard origin. The default is `http://localhost:3000`. For local development, the extension discovers Tabd on `localhost` or `127.0.0.1`, verifies `/api/extension/status`, and remembers the address used for a successful link. If you start Tabd on another port, open its dashboard in the same browser; no extension rebuild is needed for that port change. Hosted builds allow only the configured origin and must be rebuilt after changing its domain.

1. Open `chrome://extensions` and enable Developer mode.
2. Click **Load unpacked** and choose `extension/.output/chrome-mv3`.
3. Copy its extension ID. Add it to `NEXT_PUBLIC_EXTENSION_IDS` in the web app's `.env.local`, then restart the web app. Multiple trusted development IDs can be comma-separated.
4. Sign in to the web app. Open the extension and choose **Connect to Tabd**.
5. Review and click **Connect this extension** on the web page.
6. Open a normal HTTP/HTTPS website. Click the extension, select a collection if wanted, and save. Status, tags, and notes are optional.
7. Switch back to the dashboard; it refreshes on window focus. The new resource appears in the same account.

The extension needs only `activeTab`, `storage`, and host access to the configured dashboard origin. Local development builds allow HTTP on `localhost` and `127.0.0.1` across ports; hosted builds stay on the configured origin. It does not request browsing history or access to every website. Chrome internal pages cannot be saved. It reads the active tab's URL, title and favicon. The web save form additionally extracts description and Open Graph preview metadata.

The popup follows your system's light or dark appearance. It remembers the last saved collection and shows nested collections with their full path. Title, status, tags, and notes stay behind **Add details**, with the save action always visible. Saving an existing page loads its current details; **Save changes** updates only fields you edit, preserving existing notes and tags. Connection failures can be retried, and expired access prompts you to reconnect.

After rebuilding, click **Reload** on Tabd in `chrome://extensions` to use the updated popup.

If connecting reports that the extension cannot be reached, reload the installed extension and refresh the connection page. The app and extension must be in the same browser profile. A missing messaging API can indicate a stale page, disabled extension, a different profile, or an unsupported browser; it does not mean you need to reinstall. The app pings the extension before issuing an account token and reports connection failures with recovery steps. If the extension cannot find Tabd, start the server and open its dashboard before trying again; unrelated apps on familiar ports are ignored.

### Linking security

A signed-in web session creates a 256-bit random, account-scoped token, with a 30-day lifetime. Only its SHA-256 hash is stored in PostgreSQL. The web app sends the token directly to an explicitly allowed extension ID using Chrome external messaging. The extension checks the sender's origin, verifies the token against the API, then stores it in extension-local storage. Credentials never travel through a URL or accessible browser cookie. Every extension request resolves the token owner server-side, verifies collection ownership, and scopes all reads/writes to that owner. Revocation is available in Settings. Disconnecting in the popup removes the local token; use **Revoke extension access** to invalidate all issued tokens. Web sign-out alone does not revoke extension links.

## Architecture

```text
app/                 Next.js pages, auth callback and Route Handlers
components/          Dashboard, resource cards, save/collection panels
components/ui/       Reusable Radix/shadcn-style button and dialog primitives
lib/                 Types, Zod validation, URL normalization, API auth, metadata
lib/supabase/        Browser and server session clients
supabase/migrations/ PostgreSQL schema, indexes, triggers and ownership policies
extension/           WXT Manifest V3 React popup and account-link background worker
tests/               Validation, SSRF, PostgreSQL/RLS and Playwright browser tests
```

- Browser → Route Handler → Supabase with verified auth session. Extension → same Route Handlers → verified token owner.
- `bookmarks`, `collections`, `profiles`, `extension_tokens` all enable RLS. Composite foreign keys prevent cross-user collection assignments. Hierarchy writes reject cycles and depth beyond three levels.
- Deleting a collection moves its direct resources to Inbox and promotes its children to top-level collections; it never deletes resources.
- Tags are a validated `text[]` on each bookmark, with GIN indexing. This simpler MVP structure avoids an unnecessary join table and makes tags atomic with saves.
- Full-text search spans title, description, hostname, notes and tags with a PostgreSQL `tsvector` and GIN index. The dashboard gives immediate local feedback, then loads database results after a short debounce. Library requests paginate in batches of 500.
- URL normalization drops fragments and common tracking parameters, preserves meaningful query parameters and sorts them for stable duplicate detection. HTTP/HTTPS remain distinct.
- Open tracking is atomic and records only opens through Tabd. Archive is independent from status.
- Metadata requests allow HTTP/HTTPS on standard ports, reject private and special-use IPs, pin validated DNS results into the connection, validate each redirect, cap redirects, limit page responses to 512 KiB, and time out DNS and network activity. HTML is parsed without executing scripts. Metadata failure never prevents saving the URL.
- Saved websites receive lazy landing-page captures through `/api/resources/[id]/preview`. The route verifies account ownership before reading the saved URL. Chromium runs in a fresh context; all page and asset requests pass through the same DNS-pinned public-address checks. Downloads, service workers, WebSockets, and non-GET requests are blocked. Captures have bounded time, request, byte, queue, and concurrency limits and a one-hour, 32-image server cache. If capture fails, cards fall back to the site's Open Graph image, then their text preview. Captures are stored permanently in the private `website-previews` Storage bucket under the account owner and bookmark ID, with a URL hash to prevent reuse after a URL edit. Stored captures are reused across server restarts. Apply the durable metadata migration before deployment; existing bookmarks then recover without re-saving.
- Metadata enrichment runs after an actual save request using Next.js `after`, and incomplete bookmarks resume when visible in the library or when the browser reconnects. Attempts, leases, cooldowns, and last-good metadata live in the owner’s bookmark row. Transient failures retry after 1 minute, 5 minutes, 30 minutes, 6 hours, then daily during app use; `Retry-After` is honored. Successful metadata has no expiry or automatic refresh schedule. There are no cron jobs, external schedulers, or long-running chat tasks. User edits survive enrichment, and URL changes invalidate stale results.
- Preferences (theme, default view, default collection) are per-browser. Account resources live in Supabase. No sample data is inserted into real accounts.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run build --prefix extension
npm run typecheck --prefix extension
npm run test:extension
```

The browser tests start their own preview server on port 3210 with backend credentials disabled. They refuse to reuse an existing server. If the port is occupied, run `TABD_TEST_PORT=3211 npm run test:e2e`. `npm test` includes PGlite schema tests that create two users and verify RLS isolation, ownership integrity, hierarchy constraints, deletion semantics, duplicate constraints, full-text search and atomic open tracking.

`npm run test:extension` loads a local-development build in Chromium and exercises saving, duplicate preservation, retries, expired access, restricted pages, keyboard disclosure, and validation with controlled API responses. A second suite uses real webpage-to-extension messaging and isolated HTTP servers to verify ping/link replies, token verification, port changes without rebuilding, saving to the discovered server, and rejection of unrelated sites. To capture popup states, run `TABD_EXTENSION_SCREENSHOTS=artifacts/extension npm run test:extension`. These checks do not replace the hosted account acceptance below.

GitHub Actions runs linting, both typechecks, unit/database tests, both production builds, desktop/mobile browser tests, and the extension smoke test on pushes to `main` and pull requests. CI needs no production credentials. Dependabot checks dashboard, extension, and GitHub Actions dependencies monthly.

### Hosted acceptance checklist (requires your new project)

1. Register users A and B. Confirm emails if enabled.
2. As A, create UI Components and a nested React collection.
3. Connect the unpacked extension, visit https://ui.shadcn.com/, select UI Components, save with a note.
4. Refocus dashboard, search the resource, open it, set In Use, favorite it, edit its note and move it to React.
5. Save the same URL again and confirm the existing-resource update flow.
6. Log out and back in; confirm persistence. Sign in as B and confirm A's resources are inaccessible.
7. Delete React and confirm its resources are in Inbox. Archive and restore a resource.
8. Revoke extension access and confirm the extension requires reconnection.

## Deploy

Deploy the root directory to any Node-compatible Next.js host. Run `npm ci` and `npm run build`; serve with `npm start` or the host's Next.js adapter. Configure the same environment variables in the hosting provider's secret settings before building. Use HTTPS, update Supabase's Site URL and allowed callback, and set `NEXT_PUBLIC_APP_URL` to the production origin. Keep private routes and API responses uncached.

Apply `supabase/migrations/20261013124710_durable_website_metadata.sql` to the intended Tabd project before deploying this update. It adds recovery state, an atomic completion function, and a private screenshot bucket with ownership policies. It preserves existing bookmarks; the initial backfill happens through normal authenticated app usage. No separate scheduler, credentials, or external capture service is required.

Landing-page previews use bundled `@sparticuz/chromium` on Linux, with its binaries included in the preview route's Next.js file trace. Allow at least 1 GB of memory and 60 seconds for that route. On macOS/Windows, run `npx playwright install chromium` on the runtime host. A Linux host with its own Chromium can set `TABD_CHROMIUM_PATH` to the executable's absolute path instead. Captures are of public pages without your browsing session; login walls or sites that refuse automation can fall back to metadata imagery. Preview failures never block saving.

Rebuild the extension with `WXT_APP_URL=https://YOUR_APP_ORIGIN`, load it in Chrome, and allow its resulting ID in the deployed `NEXT_PUBLIC_EXTENSION_IDS` setting. Local unpacked installation is supported; Chrome Web Store publication is not part of this deliverable.

## Remaining limitations

- Live hosted auth, SMTP/OAuth and extension/account acceptance remain unverified until a Supabase project is connected.
- Browser bookmark HTML import is deferred (lower priority in the brief). JSON export is implemented.
- Profile display-name editing is implemented; avatar upload is not.
- The extension reads the current tab title/favicon without injecting content scripts. Both web and extension saves receive server-side metadata enrichment after saving.
- The dashboard refetches on window focus; it does not subscribe to realtime events while continuously focused.
- Large libraries are paginated over the API but rendered locally without list virtualization.
- An npm audit finding in the ESLint-only development dependency chain (`braces` via Next's lint plugin) currently has no compatible patched version; production dependencies are audited separately. Do not downgrade Next's ESLint configuration across major versions to suppress it.

## Repository workflow

The default branch is `main`. Create a focused feature or fix branch and open a pull request using the included template. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

Git tracks source code, database migrations, environment templates, and both npm lockfiles. Local secrets, dependency directories, build output, test reports, and review screenshots are ignored. Editor and line-ending conventions are defined in `.editorconfig` and `.gitattributes`.

This is a private project. No open-source license is included.
