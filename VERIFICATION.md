# Verification — 11 October 2026

## Confirmed locally

- Next.js production build and TypeScript validation pass.
- ESLint passes.
- 16 Vitest tests pass, including PostgreSQL migration execution in PGlite, two-user RLS checks, collection ownership, nesting/cycle checks, Inbox preservation, duplicate constraints, full-text indexing, atomic opens, token row isolation, URL validation and private-IP rejection.
- Eight desktop/mobile Playwright scenarios pass (six in the full run, the two save scenarios after their fix). These cover search, status filters, persistent list preference, light/dark theme, layout overflow, save/error behavior, keyboard dismissal and honest unconfigured API responses.
- Desktop and 390px mobile screenshots were visually inspected in a bounded review. No horizontal overflow.
- The WXT Manifest V3 extension builds and typechecks. Chromium smoke test verifies minimal permissions, service worker startup, popup rendering and account-link entry point.
- `npm audit --omit=dev`: zero vulnerabilities. Full audit reports five related high findings in the lint-only `braces` dependency chain; README documents this unresolved tooling issue.

## Not yet verified

The user has not created a Supabase project. No hosted database was modified. Real registration/confirmation emails, OAuth, hosted PostgREST calls, and extension-token linking against a live database require configuration and the README's acceptance checklist. PGlite tests do not substitute for that hosted integration check.

## Defects found and corrected

- Zod partial schemas originally applied default fields during updates; explicit optional fields now preserve omitted data. Regression test included.
- Metadata lookup originally moved/disabled the save button during a click; its feedback now occupies a stable area and saving does not wait for metadata.
- Collection indentation was overridden by navigation padding; a dedicated CSS variable now preserves nesting.
- The browser suite initially reached an unrelated service on port 3000. It now uses port 3210.
