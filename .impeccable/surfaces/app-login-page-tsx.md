---
version: 1
slug: "app-login-page-tsx"
primary_target: "app/login/page.tsx"
related_targets: ["components/auth-wordmark.tsx"]
---

# Tabd account entry

Scope: `/login`, `components/auth-wordmark.tsx` and the auth rules in `app/globals.css`. Visitor mode: Operate. Returning and new users need to sign in or create an account, with a clearly labeled preview route available. Supabase is configured; real-account authentication remains untested.

## Direction contract

THESIS: A silver engraved Tabd wordmark gives account entry a distinct identity while the form stays direct and readable.

OWN-WORLD: Geometric silver lettering, subtle grain, inset shadows and rim light accompany the application's orange action language. The account rail stays light.

STORY: Recognize Tabd, choose sign in or sign up, enter credentials and receive clear pending, error or email-confirmation feedback. Preview links lead to the example library.

FIRST VIEWPORT: At wide desktop sizes artwork owns the left 75% and the form the right 25%. The form is centered within its rail. Below 1100px the rail is 340px; at 700px the artwork stacks above the form.

FORM: User-pinned composition, implemented in code. No generated seed key or ranked form selection was supplied; do not invent one. Signature interaction: spring-smoothed cursor-follow radial mask reveals a white specular center with cyan and blue fringes across the engraved lettering, matching the user-provided reflection reference. A bounded soft rim catches the same light; its position is mapped into SVG coordinates for responsive accuracy. Reduced-motion and non-hover devices retain the static artwork.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Validation and open decisions

Finish review: Ship, no material findings, as reported by the coordinating agent. Web build, extension build and lint pass. Documentation reflects the shipped CSS and components. No shipping raster is used for this SVG/CSS artwork. End-to-end authentication is still to be verified with a real account; Google sign-in is conditional on its environment flag.
