---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["components/landing-page.tsx", "components/landing-page.module.css", "components/auth-wordmark.tsx", "public/landing/library.png", "public/landing/collection.png", "public/landing/extension-save.png"]
---

# Tabd public landing page

Scope: the anonymous root route and its landing component. Visitor mode: Persuade. This is an ordinary extension of the established Tabd visual system in DESIGN.md, not a new visual world. PRODUCT.md, DESIGN.md and the existing design sidecar remain unchanged. Authenticated visitors continue to receive the dashboard at `/`; visitors without a configured Supabase environment receive the landing page.

## Direction contract

THESIS: Introduce the personal web library through the existing silver Tabd artwork, then show how saved sites become useful again and invite visitors into a clearly labeled example dashboard.

OWN-WORLD: Reuse the account-entry engraved silver lettering, quiet neutral surfaces, Geist typography and vivid orange action language. The enlarged marketing typography is local to this surface: section headings scale to 58px and the ending CTA headline to 78px. These sizes do not replace the dashboard type scale or authorize a dashboard hero.

STORY: Meet Tabd in the opening artwork, scroll into the benefit of keeping useful finds, inspect the library screenshot, understand collections, tags and resource status, then explore the preview dashboard. The final orange “Explore the dashboard” action leads to `/preview`; sign-in links lead to `/login`.

FIRST VIEWPORT: Center the existing login artwork within a full-viewport silver hero, with compact navigation above, a centered headline below the mark and a scroll cue at the bottom. The hero uses 100svh with bounded minimum and maximum heights. Shared AuthWordmark accepts `showChrome={false}` to omit its account-entry framing while retaining its existing decorative interaction.

FORM: User-pinned composition, implemented in code. Quiet editorial sections and real product screenshots explain benefits without changing the library interface. The introduction and organization sections use desktop columns, then stack at narrower widths; screenshots retain their aspect ratio. No generated seed key or ranked form selection was supplied. Keep the visible example-library captions and descriptive image alt text.

MOTION AND ACCESS: The shared wordmark retains its reduced-motion and non-hover fallback. Content and navigation remain usable without decorative motion. The page provides a keyboard skip link, section labels and visible focus treatments.

FINISH: Independent finish reviewer verdict: Ship, no material blockers, as reported by the coordinating agent. The reviewer inspected the screenshots and implementation and accepted the composition, explicit demo labels, mobile behavior and accessibility.

## Asset evidence

`public/landing/library.png` and `public/landing/collection.png` are actual screenshots captured from `/preview` at 1440 × 1000 with example data. Embedded metadata records their provenance. The first depicts the preview library and the second its Design inspiration collection. These images are product evidence, not evidence of a real account or persisted user records. The silver wordmark remains SVG/CSS artwork.

## Validation and limitations

The coordinating agent reports successful production build, TypeScript check and targeted ESLint. Browser checks passed at desktop width 1440 and mobile width 390, with no overflow or browser errors. Navigation to `/preview` and `/login`, and reduced-motion behavior, were checked. Real-account sign-in remains untested. No deployment was performed.

## Landing refinements

The hero now uses “Save the sites you love. Find them when it matters.” as its sole heading, with soft copper-orange engraved lettering and a pointer-following warm reflection. The reflection is decorative, hidden from assistive technology, and disabled for reduced motion and non-hover devices. The introduction includes `public/landing/tab-clutter.svg`: authored Chrome-style window geometry with embedded site favicons, pinned tabs, tab groups, selected tabs, toolbar controls, realistic URLs and bookmarks. It is an illustrative composite, not an actual browser screenshot. Desktop and mobile renders were inspected with no horizontal overflow.

## Extension showcase

The dedicated `#extension` section follows the tab-clutter introduction and precedes the library. “Keep the find. Close the tab.” introduces the primary saving mechanism in a warm neutral two-column layout that stacks on mobile. Three steps explain opening Tabd with the current page filled in, choosing a collection or Inbox, and saving with optional tags and a note. The top navigation includes “Extension”; the introduction links here and the section links onward to the library.

`public/landing/extension-save.png` is an actual built Chrome MV3 popup capture from `tests/extension-smoke.mjs` (720 × 920, DPR 2), placed within an illustrative browser frame. The account, API responses and `example.com/design` page are test fixtures; Inbox is selected. Embedded provenance records the origin. The caption reads “Tabd Chrome extension · Example save, actual interface.” The reported landing-asset scan found three rasters and no missing provenance.

The coordinating agent reports passing TypeScript, targeted ESLint, production build, extension build and extension smoke checks. Browser checks at widths 1440 and 390 confirmed the anchor and loaded image with no overflow or errors. Independent review disposition: Ship, no material findings; desktop, mobile and detail screenshots are retained in `.impeccable/review/`. This is a static showcase; it adds no extension functionality and does not verify hosted account acceptance.
