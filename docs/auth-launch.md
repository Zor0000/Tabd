# Account access and direct-launch checklist

Target: direct public launch of Tabd, including web, extension, and personal-library MCP.

## Implemented in this branch

- Email/password signup with confirmation, matching passwords, a 12-character minimum, password visibility controls, and password-manager autocomplete.
- Sign-in accepts existing passwords without imposing the new signup length requirement.
- Password recovery, resend confirmation with a 60-second UI cooldown, and account-existence-neutral email responses.
- Confirmation landing page requires a button click before consuming the token. Branded recovery links work across browsers using token hashes.
- Safe destination allowlist preserves library, agent settings, and extension connection destinations. External redirects are discarded.
- Authenticated password-change screen sends the current password to Supabase. Recovery sessions can reset without the old password.
- Successful password changes revoke browser refresh sessions. A failed sign-out can be retried without changing the password again.
- Separate sign-out controls for the current browser and all browsers, with errors shown and a full navigation to discard the local private UI.
- Branded email templates in `supabase/templates/`; subjects in `subjects.json`.

Browser logout does not revoke independently issued extension or MCP tokens. Supabase access JWTs already issued can remain usable until expiry; global logout revokes refresh sessions. Manage extension/MCP tokens separately.

## Hosted state verified on 2026-10-13

Project: `sdzrbpehdgogldydzsde` (Tabd).

- Email confirmation enabled; anonymous sign-in disabled; Google disabled.
- Secure email change already enabled.
- Applied minimum password length 12 and require-current-password on password updates.
- Verified live using a temporary account: incorrect current password rejected, 11-character password rejected, correct change accepted, recovery reset accepted without current password, reused recovery token rejected. Test account removed afterwards.
- Custom SMTP is off. Sender name and email templates are **not active**.
- Created Resend sending-domain entry `auth.tab-dd.tech`. Receiving remains off.
- Registrar shows domain registration in progress. Adding the DKIM record failed; no DNS records were successfully added. Public NS lookup returned no result.

## Finish email setup after domain activation

1. In the registrar, add the exact DKIM TXT and sending CNAME records from Resend's domain page. DNS values are provider-generated: copy from that page, not a generic example. Preserve existing records. Verify the domain in Resend.
2. Configure Resend SMTP for Supabase with a sending-only credential scoped to this domain where supported. Store the credential only in Supabase's SMTP configuration. Sender name: `Tabd`; sender address: `no-reply@auth.tab-dd.tech`.
3. Disable email-link tracking. Ensure sending limits cover the expected launch signup volume.
4. Deploy the new auth routes before activating these custom templates. Confirmation/recovery templates point to `/auth/confirm` and will fail on an older app build.
5. Set Supabase Site URL to the deployed app's canonical HTTPS origin. Add the exact production callback URL and required local callback URLs to the redirect allowlist. Do not switch Site URL to a domain before the app is reachable there.
6. Apply template subjects/bodies, then enable password-changed and email-changed notifications. The templates identify `neerajcwork@gmail.com` as the contact for an unexpected email change.
7. Send real signup and recovery emails to an authorized test inbox. Verify sender display name, SPF/DKIM/DMARC, desktop/mobile layout, confirmation on another device, expired/used links, password reset, and subsequent sign-in. Live API tests do not prove inbox delivery.

## Four release gates

1. **Account access and onboarding:** Finish SMTP/DNS/inbox checks above; a new user can sign up, confirm, recover, and sign out without assistance.
2. **Core product journeys:** Verify save → metadata/preview → search → collections/status → edit/delete on web, extension pairing/save/revoke, and MCP connect/search/read/revoke with a fresh account and a separate account for isolation checks.
3. **Production readiness:** Confirm all merged migrations are applied, screenshot storage and Chromium runtime requirements from PR #6 are met, production URLs/environment variables are correct, and errors/latency are observable. Test rollback and backup recovery.
4. **Public launch readiness:** Publish accurate onboarding/support/privacy information and extension installation instructions; measure signup completion, first save, and returning use. Test the exact release build before announcing it.

These gates support a direct launch; no beta phase is required. Domain activation and email delivery remain release blockers.

## Branch context

Latest merged PRs reviewed: #7 library search, #6 durable website metadata/previews, #5 extension discovery/branding, and dependency updates #1/#2. This branch starts at current main and includes the two existing personal-library MCP commits, which were not yet on main. The original checkout's uncommitted work was preserved.

## Dependency alert observed during PR creation

GitHub Dependabot alert #1 is open for `braces` 3.0.3: stack-exhaustion denial of service from deeply nested patterns. The installed path is development tooling (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`). GitHub reports no patched version. Review exposure and upstream remediation as part of the production-readiness gate; this finding does not establish a reachable web/MCP runtime vulnerability.

Final local validation: 92 unit tests, 36 desktop/mobile browser tests, typecheck, lint, and production build passed. These do not replace the pending real-inbox and deployed-release checks.
