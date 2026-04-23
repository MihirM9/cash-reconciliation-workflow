# `design-system/` — DESIGN.md + Stitch drop zone

This directory is the hand-off point between the **canonical visual identity**
and the React code.

The source of truth is [`/DESIGN.md`](../../../DESIGN.md) at the repo root — a
[google-labs-code/design.md](https://github.com/google-labs-code/design.md) file
that specifies the "Ledger" design system. Tokens live in its YAML front matter;
the rationale and the Do's/Don'ts live in the markdown body. Every surface in
this app is meant to be a straight read of that file.

## How DESIGN.md flows into the app today

```text
DESIGN.md (tokens + prose)
        │
        ├── frontend/src/styles.css    ← CSS variables mirror the YAML 1:1
        │                                (hand-synced; see header comment)
        │
        └── frontend/src/components/   ← StatusBadge / SlaBadge / AuditTrail
                                         consume the CSS tokens by class
```

When Stitch generates a fuller component set, drop it into this directory and
swap the imports in [`../pages/CaseListPage.tsx`](../pages/CaseListPage.tsx) and
[`../pages/CaseDetailPage.tsx`](../pages/CaseDetailPage.tsx).

## Required component surface

To plug into the pages without rewiring data flow, the generated components
should export at least these symbols with these props:

```tsx
export function StatusBadge(props: { status: "OPEN" | "UNDER_REVIEW" | "APPROVED" | "ESCALATED" | "CLOSED" }): JSX.Element;
export function SlaBadge(props: { breached: boolean }): JSX.Element;
export function AuditTrail(props: {
  entries: Array<import("@sec-workflow/shared").AuditLogEntry>;
  users: Array<import("@sec-workflow/shared").User>;
}): JSX.Element;
```

## Swap points

- [`../pages/CaseListPage.tsx`](../pages/CaseListPage.tsx):
  ```ts
  // Before
  import { StatusBadge } from "../components/StatusBadge.js";
  import { SlaBadge } from "../components/SlaBadge.js";
  // After
  import { StatusBadge } from "../design-system/StatusBadge.js";
  import { SlaBadge } from "../design-system/SlaBadge.js";
  ```

- [`../pages/CaseDetailPage.tsx`](../pages/CaseDetailPage.tsx):
  ```ts
  // Before
  import { StatusBadge } from "../components/StatusBadge.js";
  import { SlaBadge } from "../components/SlaBadge.js";
  import { AuditTrail } from "../components/AuditTrail.js";
  // After
  import { StatusBadge } from "../design-system/StatusBadge.js";
  import { SlaBadge } from "../design-system/SlaBadge.js";
  import { AuditTrail } from "../design-system/AuditTrail.js";
  ```

## Working with DESIGN.md

The design.md CLI gives you lint, diff, and export:

```bash
# validate DESIGN.md against the spec, check WCAG contrast on component tokens
npx @google/design.md lint DESIGN.md

# export tokens to Tailwind theme or DTCG tokens.json
npx @google/design.md export --format tailwind DESIGN.md > tailwind.theme.json
npx @google/design.md export --format dtcg     DESIGN.md > tokens.json

# diff the current DESIGN.md against a previous version
npx @google/design.md diff DESIGN.md DESIGN-v2.md
```

Root-level npm scripts are wired for the two you'll use most:

```bash
npm run design:lint     # lint DESIGN.md
npm run design:export   # emit tokens.json (DTCG) at the repo root
```

### Mapping DESIGN.md → CSS variables

[`../styles.css`](../styles.css) mirrors the YAML 1:1 via CSS custom
properties. The naming convention is:

| DESIGN.md token                      | CSS variable                     |
| ------------------------------------ | -------------------------------- |
| `colors.primary`                     | `--color-primary`                |
| `colors.tertiary`                    | `--color-tertiary`               |
| `colors.status-approved-bg`          | `--color-status-approved-bg`     |
| `typography.body-md.fontFamily`      | `--font-sans`                    |
| `typography.body-md.fontSize`        | `--fs-body-md`                   |
| `rounded.sm`                         | `--rounded-sm`                   |
| `spacing.md`                         | `--space-md`                     |

If you change a token in DESIGN.md, mirror it in `styles.css` until the Stitch
exporter is wired to regenerate the stylesheet automatically.

## Design tokens outside of CSS

If you need the tokens in TS (for example to drive `StatusBadge` mappings),
run the export command above and import the generated `tokens.json`. The
current hand-written components read tokens by CSS class, which is enough for
this demo.
