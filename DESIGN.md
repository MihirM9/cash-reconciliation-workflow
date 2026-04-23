---
version: alpha
name: Ledger
description: >-
  Institutional minimalism for a private fund adviser's compliance surface.
  Understated, high-contrast, archival — the visual register of a regulatory
  document, not a consumer app.
colors:
  primary: "#0E1116"
  secondary: "#5B6472"
  tertiary: "#1F3A5F"
  tertiary-hover: "#17304F"
  neutral: "#F7F5F1"
  surface: "#FFFFFF"
  border: "#E3E6EC"
  border-strong: "#CFD4DC"
  on-tertiary: "#FFFFFF"
  status-approved-fg: "#0A5C2E"
  status-approved-bg: "#E1F1E7"
  status-escalated-fg: "#8A1414"
  status-escalated-bg: "#F8DEDE"
  status-review-fg: "#7A4400"
  status-review-bg: "#FBEBCC"
  status-open-fg: "#133D81"
  status-open-bg: "#DCE6F8"
  status-closed-fg: "#5B6472"
  status-closed-bg: "#EDF0F5"
  sla-ok-fg: "{colors.status-approved-fg}"
  sla-ok-bg: "{colors.status-approved-bg}"
  sla-breach-fg: "{colors.status-escalated-fg}"
  sla-breach-bg: "{colors.status-escalated-bg}"
typography:
  h1:
    fontFamily: Source Serif 4
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  h2:
    fontFamily: Source Serif 4
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.45
  label-caps:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: 600
    letterSpacing: "0.1em"
  mono:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: 400
rounded:
  sm: 4px
  md: 6px
  lg: 10px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  "2xl": 32px
components:
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: 20px
  panel-label:
    typography: "{typography.label-caps}"
    textColor: "{colors.secondary}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    padding: 10px 16px
  button-primary-hover:
    backgroundColor: "{colors.tertiary-hover}"
    textColor: "{colors.on-tertiary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 10px 16px
  badge-status-approved:
    backgroundColor: "{colors.status-approved-bg}"
    textColor: "{colors.status-approved-fg}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  badge-status-escalated:
    backgroundColor: "{colors.status-escalated-bg}"
    textColor: "{colors.status-escalated-fg}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  badge-status-review:
    backgroundColor: "{colors.status-review-bg}"
    textColor: "{colors.status-review-fg}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  badge-status-open:
    backgroundColor: "{colors.status-open-bg}"
    textColor: "{colors.status-open-fg}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  badge-status-closed:
    backgroundColor: "{colors.status-closed-bg}"
    textColor: "{colors.status-closed-fg}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  badge-sla-ok:
    backgroundColor: "{colors.sla-ok-bg}"
    textColor: "{colors.sla-ok-fg}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
  badge-sla-breached:
    backgroundColor: "{colors.sla-breach-bg}"
    textColor: "{colors.sla-breach-fg}"
    rounded: "{rounded.pill}"
    padding: 2px 10px
---

## Overview

Institutional minimalism meets regulatory seriousness. The UI should read like a
well-set financial statement or a filed regulatory document: generous margins,
disciplined typography, a single restrained accent. The feeling to evoke is
**"this system is used by people who file with the SEC,"** not **"this system is
a startup dashboard."**

Principles:

- **Gravitas, not gloss.** Serif headlines, muted accent, no gradients, no glow.
- **Evidence-forward.** Inputs, AI outputs, and audit entries are the content —
  chrome is kept to a minimum so the record is what the eye lands on.
- **Status legibility at a glance.** Status and SLA use distinct hue families
  (green/red/amber/blue/gray) with WCAG AA text contrast so a CCO can scan a
  list in one pass.
- **Accent discipline.** The navy tertiary is the *only* interactive color.
  Selection, primary buttons, and links all use it. Destructive states use the
  escalated red — never as chrome, only as state.

## Colors

- **Primary `#0E1116`** — "archive ink". Headlines, body text, and hard rules.
- **Secondary `#5B6472`** — slate for metadata, captions, table headers.
- **Tertiary `#1F3A5F`** — "institutional navy". The sole interactive color.
  Used for primary buttons, focused inputs, and link states. `tertiary-hover`
  is a single step darker — no lightening, no desaturation.
- **Neutral `#F7F5F1`** — warm parchment app background. Softer than pure white;
  signals archival paper rather than spreadsheet.
- **Surface `#FFFFFF`** — panels, tables, and modals sit *on top of* the neutral
  so information reads as a filed document on a desk.
- **Border `#E3E6EC`** / **border-strong `#CFD4DC`** — hairlines. Never draw a
  panel with a shadow when a 1px border will do.

### Status palette

Each status has a foreground/background pair whose text color clears WCAG AA
(4.5:1) on the paired background:

| Status      | bg          | fg          |
| ----------- | ----------- | ----------- |
| Approved    | `#E1F1E7`   | `#0A5C2E`   |
| Escalated   | `#F8DEDE`   | `#8A1414`   |
| Under review| `#FBEBCC`   | `#7A4400`   |
| Open        | `#DCE6F8`   | `#133D81`   |
| Closed      | `#EDF0F5`   | `#5B6472`   |

SLA badges reuse `status-approved-*` for "on time" and `status-escalated-*` for
"breached" — the mapping is intentional: a breached SLA is the same weight of
signal as an escalated case.

## Typography

- **Headlines — `Source Serif 4`**, 600. Serifs carry the "filed document"
  register. Used for page titles and panel titles (`h2`).
- **Body — `Inter`**, 400. Sober, unremarkable, maximum legibility at 13–15px.
- **Monospace — `JetBrains Mono`**, 400. Exclusively for identifiers that belong
  in an audit: case IDs, AI `runId`s, model names, evidence paths.
- **Labels — `Inter` 600 uppercase with `0.1em` tracking.** Reserved for panel
  labels ("INPUTS", "AI SUGGESTION", "REVIEWER DECISION", "AUDIT TRAIL"). Use
  sparingly — the uppercase label is how a compliance surface signals "this is
  a record section," not a visual flourish.

Number-heavy content (balances, variances, timestamps) uses `font-variant-numeric: tabular-nums` so rows align across the table.

## Layout

- Page max-width `1200px`, centered, with `24px` outer gutter.
- Panels stack with `16px` vertical rhythm.
- Two-column layouts (Inputs / AI Suggestion) collapse to one column below
  `720px`. Compliance is read on laptops, not phones — but the breakpoint is
  defensive.
- Tables use `12px 16px` cell padding and a single `1px` hairline per row; no
  zebra striping, no inner vertical rules.

## Elevation & Depth

No shadows on panels or buttons. Elevation is conveyed exclusively via borders
and background contrast:

- Resting surface: `surface` on `neutral`, `1px` border.
- Modal / overlay: `surface` with a subtle `rgba(14,17,22,0.45)` backdrop scrim
  and a soft shadow (`0 12px 40px rgba(0,0,0,0.18)`) — reserved for confirmation
  dialogs only, never for everyday panels.

## Shapes

- `rounded.sm` (4px) — buttons, inputs, select boxes.
- `rounded.md` (6px) — panels, tables, modal.
- `rounded.lg` (10px) — large overlay surfaces.
- `rounded.pill` (999px) — status and SLA badges only.

## Components

- `panel` — the fundamental container. Label (`panel-label`) at top-left in
  uppercase, content below. Labels are never bolded in place of being capsed.
- `button-primary` — only for the *single* primary action per view. On Case
  Detail that is either "Generate AI suggestion" or "Submit decision"; the
  visual hierarchy should make clear that there is exactly one next step.
- `button-secondary` — cancel, close, and "back" actions.
- `badge-status-*` — one per case status. Always accompanied by text; never
  rely on color alone (WCAG 1.4.1).
- `badge-sla-*` — "On time" / "SLA breached". Always shown next to the status
  badge so the two first-class signals are adjacent.

## Do's and Don'ts

**Do**

- Treat every audit entry as typographically equal to the state it describes.
  Audit is the product, not a footnote.
- Use `mono` for every identifier that an examiner might paste into a ticket or
  search box (case ID, run ID, evidence path).
- Keep variance and balance numbers tabular and right-hinted.

**Don't**

- Don't introduce a second accent color for "delight." The accent is reserved.
- Don't use red for informational states. Red is strictly "escalated" or "SLA
  breach" — it has a meaning here.
- Don't use icons in place of text labels on status or SLA badges; an examiner
  exporting a screenshot must be able to read state without a legend.
- Don't layer shadows to signal hierarchy; let the hairline borders and the
  paper-on-desk metaphor do the work.
