---
name: Tabd
description: A clear personal web library with vivid orange actions and silver account-entry lettering.
colors:
  bg: "#fff"
  rail: "#f8f9fb"
  surface: "#fff"
  subtle: "#f5f6f8"
  text: "#25262c"
  muted: "#747782"
  line: "#e9eaee"
  accent: "#ff5517"
  accent-hover: "#ef4708"
  accent-light: "#fff0e8"
  accent-text: "#b73908"
  accent-on: "#25150d"
  accent-line: "#ffd2bd"
  accent-surface: "#fff8f3"
  accent-muted: "#8a5138"
  reference: "#788699"
  danger: "#bd4444"
  dark-bg: "#18191d"
  dark-rail: "#141519"
  dark-surface: "#202126"
  dark-subtle: "#27282e"
  dark-text: "#eeeef2"
  dark-muted: "#a4a5b1"
  dark-line: "#303139"
  dark-accent: "#ff753e"
  dark-accent-hover: "#ff8959"
  dark-accent-light: "#38261e"
  dark-accent-text: "#ffac83"
  dark-accent-on: "#25150d"
  dark-accent-line: "#68402c"
  dark-accent-surface: "#2b211b"
  dark-accent-muted: "#d3a18a"
  dark-reference: "#9faabd"
  dark-danger: "#f39595"
  auth-bg: "#f8f8f6"
  auth-muted: "#686b70"
  auth-line: "#dededb"
  metal-start: "#e2e3e4"
  metal-mid: "#cdd0d2"
  metal-end: "#dfe0e1"
  engraving: "#b9bcc0"
  engraving-stroke: "#94999f"
  engraving-light: "#f4f3ed"
typography:
  body:
    fontFamily: "Geist, Inter, Arial, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  headline:
    fontFamily: "Geist, Inter, Arial, sans-serif"
    fontSize: "29px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-1px"
  title:
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.35px"
  label:
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.4
  auth-headline:
    fontSize: "clamp(24px, 2.1vw, 34px)"
    fontWeight: 550
    lineHeight: 1.15
    letterSpacing: "-0.035em"
rounded:
  tag: "4px"
  auth-control: "5px"
  nav: "6px"
  control: "7px"
  workspace: "8px"
  card: "10px"
  base: "12px"
spacing:
  small: "8px"
  field: "12px"
  grid: "20px"
  mobile: "24px"
  workspace: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-on}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  navigation-active:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.nav}"
    padding: "9px 11px"
  tag:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.muted}"
    rounded: "{rounded.tag}"
    padding: "1px 6px"
  resource-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
---

# Design System: Tabd

## Overview

**Creative North Star: "The personal web library"**

Linear clarity and Raindrop-style visual resource cards remain the dashboard's foundation: neutral surfaces, graphite type, fine borders and restrained color. Vivid orange now replaces burnt copper throughout the identity and action system, following the user's Ghost core site reference.

The account entry adds a tactile silver engraved Tabd mark. Its large sculptural composition belongs to authentication; it does not replace the dashboard's compact navigation, factual website previews or editable resource records.

**Key Characteristics:**
- Clear, compact library controls.
- Neutral surfaces with vivid orange actions.
- Factual visual previews and explicit preview-library labeling.
- Silver geometric lettering on the account entry surface.

## Colors

The primary palette is vivid orange against neutral white and graphite; dark mode softens orange against charcoal. Frontmatter values are normative, extracted from `app/globals.css`.

### Primary
- **Vivid orange** (`accent`): primary actions, brand accents and focus outlines; `accent-hover` handles hover.
- **Orange text** (`accent-text`): selected navigation and links. `accent-light`, `accent-line` and `accent-surface` provide quiet selection and border treatments.
- **Dark orange family** (`dark-accent` and related tokens): corresponding dark-mode roles. Primary actions use `accent-on` text.

### Neutral
- `bg`, `surface`, `rail` and `subtle` separate the workspace, cards and navigation without heavy elevation.
- `text`, `muted` and `line` define hierarchy and boundaries; `dark-*` tokens preserve the same roles in dark mode.
- The auth surface is explicitly light, using `auth-bg`, `auth-muted` and `auth-line`. Its `metal-*` gradient, `engraving`, stroke and light tokens form the silver material.
- `reference` remains slate; status colors keep distinct semantic roles. `danger` denotes destructive feedback.

## Typography

Geist is the UI face, with Inter, Arial and sans-serif fallbacks. The body is 14px with 1.5 line height; the dashboard heading is 29px/600, title 17px/600, and controls typically 12px. Resource descriptions are 11px and tags 10px in the final cascade. Small uppercase labels belong to navigation groups. The auth title uses its own responsive headline token; geometric SVG lettering is artwork rather than a font substitution.

## Layout

The dashboard retains a 236px navigation rail and generous desktop workspace inset. The grid uses three columns on wide desktop, two below 1200px, and one below 640px. At 960px navigation becomes a modal drawer with focus containment, scroll locking, an explicit close action and focus restoration. Portrait iPad and Split View use the full workspace width; landscape iPad retains the rail. The compact toolbar stays visible while scrolling. Phone list records stack their actions below the content.

The account surface uses a 3:1 art/form split at wide desktop sizes. At 1100px the form rail becomes 340px; at 700px the artwork stacks above the form. The mobile artwork is at least 260px high and otherwise 32svh. In short landscape viewports below 960px, account entry prioritizes the form and compact brand. The form content caps at 360px. The auth surface brief owns the composition and interaction contract.

### Mobile and tablet interactions

Coarse-pointer devices and compact viewports use at least 44px action heights, with 44px square icon controls. Text inputs and selects use 16px type; selects have an explicit 44px height for WebKit. Resource text and status controls remain legible on touch devices. Phone overview counts use two compact columns, status filters wrap, and list cards preserve every action. Panels and fixed surfaces account for safe-area insets, and touch users see the resource open indicator without hovering.

The Chrome MV3 extension remains a desktop Chrome extension. Its document declares an intrinsic 360px width and caps content at 600px without viewport-dependent sizing, which can collapse Chrome's toolbar popup. Touch previews alone fit narrower and shorter viewports. Details scroll independently and the save action stays accessible. Mobile and iPad users can copy a URL and use Add resource in the web library; the landing page and extension setup panel explain this path. This does not add a native Safari extension.

Responsive validation: 12 browser checks passed across 320px phone, iPhone WebKit, portrait/landscape iPad WebKit, landscape phone and desktop emulation; 24 existing library/search/auth checks passed. Web and extension builds, TypeScript checks and targeted lint passed. The real Chrome extension runtime passed save, duplicate, retry, account-link and narrow/short-window checks, including synthesized touch input. Layouts were visually reviewed; no physical iPhone/iPad or hosted account persistence was tested in this pass.

## Elevation & Depth

Dashboard hierarchy is mostly tonal and bordered. The shared overlay shadow is `0 12px 36px #29221e12` in light mode and `0 12px 36px #0003` in dark mode. Primary actions use `0 2px 3px #59352612`; resource hover uses `0 5px 14px #29221e07`. Authentication uses an inset highlight, subtle grain and an SVG inner-shadow/rim-light treatment to suggest engraved metal.

## Shapes

Controls have 7px corners, navigation 6px, tags 4px and resource cards 10px (12px in the narrowest layout). The base radius token is 12px. Auth inputs and actions use 5px corners. Keep the card's wide preview above its compact record and editable footer.

## Components

### Buttons
Primary buttons use orange with dark ink and an orange hover. Secondary buttons use bordered surface fill; ghost buttons use transparent fill. Controls share 8px 14px padding and a 37px minimum height. Focus uses a 2px accent outline with 3px offset. Auth actions are full width and at least 45px high; pending submission shows a spinner and disables repeat submission.

### Inputs
Fields use a 1px line border and 11px 12px padding. Auth fields are white, at least 45px high and 13px type. Keep explicit labels, email/password autocomplete and visible status feedback.

### Navigation and tags
Active navigation pairs a pale orange fill with orange text; counts remain legible. Tags are compact neutral bordered labels, not primary actions.

### Resource cards
Each saved website has a wide factual preview, compact title and description, tags and a directly editable status footer. Grid/list modes retain the same actions. Hover and keyboard focus reveal the open affordance.

### Engraved wordmark
Custom geometric SVG paths render the silver Tabd mark with inset shadow and rim light. A spring-smoothed cursor mask reveals a brighter copy of the lettering. This decorative effect responds only to mouse movement and is hidden for reduced motion or devices without hover. No task depends on it.

## Do's and Don'ts

### Do:
- **Do** preserve the dashboard's compact library structure and visual resource cards.
- **Do** use orange tokens consistently across light and dark themes.
- **Do** keep account fields usable when decorative motion is disabled.
- **Do** distinguish preview examples from persisted account data.

### Don't:
- **Don't** restore burnt copper or the earlier violet as the primary accent.
- **Don't** turn the auth artwork into a dashboard hero.
- **Don't** imply that configured authentication has been tested end to end.
