# Cash Reconciliation Workflow

A narrow, production-shaped demo of how an investment adviser can use AI inside
its operations **without** losing the audit trail, the human-in-the-loop, or
the books-and-records posture that the SEC expects under Rule 204-2.

It implements one case type end-to-end — daily cash reconciliation between a
fund's bank balance and its ledger balance — and stops. The point isn't the
reconciliation logic. The point is the *workflow shell around the AI*:

- AI suggests, never decides.
- Humans decide behind a role gate, and say why on the record.
- Every state change and every AI call writes an immutable audit row in the
  same transaction.
- The record is filterable, exportable, and easy to hand to an examiner.

---

## Table of contents

- [Why this exists](#why-this-exists)
- [Architecture at a glance](#architecture-at-a-glance)
- [How the controls are wired in code](#how-the-controls-are-wired-in-code)
- [Quickstart (no API key required)](#quickstart-no-api-key-required)
- [Walkthrough: five-minute demo](#walkthrough-five-minute-demo)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Design system: DESIGN.md](#design-system-designmd)
- [Regulatory framing](#regulatory-framing)
- [What this deliberately is not](#what-this-deliberately-is-not)
- [Where this would go next](#where-this-would-go-next)

---

## Why this exists

A lean private-fund adviser today faces two pressures that point in opposite
directions:

1. **Do more with less.** AI and agents can collapse hours of daily ops work —
   cash recs, subscription/redemption checks, allocation reviews — into
   minutes.
2. **Be exam-ready on day one.** As an RIA, you're on the hook for Rule 204-2
   books and records, written policies and procedures, and a documented AI
   governance story that an SEC examiner or LP due-diligence questionnaire
   will actually probe.

The naive move is to let an LLM "do the rec" and keep the email chain as
evidence. That fails both dimensions: it isn't faster over the long run, and
it produces a compliance artifact nobody wants to defend.

This project is the alternative: **treat every run of a workflow as a Case,
surround the AI with structured controls, and make the audit trail the
product.** It's deliberately small so the controls aren't hidden.

## Architecture at a glance

```text
┌──────────────────────────┐        ┌──────────────────────────┐
│  Vite + React frontend   │        │  Express + Prisma API    │
│  - Case List             │  HTTP  │  - /cases                │
│  - Case Detail           │  ───▶  │  - /cases/:id/ai-*       │
│  - Reviewer decision     │        │  - /cases/:id/reviewer-* │
│  - Audit trail           │        │  - /audit-logs           │
└──────────────────────────┘        │  - /export/*.csv         │
                                    └────────────┬─────────────┘
                                                 │
                                    ┌────────────┴─────────────┐
                                    │  Case / AuditLog tables  │
                                    │  append-only writes in   │
                                    │  a single Prisma tx      │
                                    └──────────────────────────┘

     AI provider (swappable behind one interface)
     ├── OpenAiProvider (real LLM, if OPENAI_API_KEY is set)
     └── RuleBasedProvider (deterministic, no network, no key)
```

**Stack choices, briefly:**

| Layer     | Choice                          | Why                                                                                       |
| --------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| Runtime   | Node 20 + TypeScript (ESM)      | Familiar, easy to read, first-class types across boundaries.                              |
| Backend   | Express + Prisma + SQLite       | Boring, which is the right aesthetic for a compliance demo. SQLite → Postgres is one URL. |
| Frontend  | Vite + React + TanStack Query   | No SSR needs for an internal tool; the Stitch pipeline drops in cleanly.                  |
| Contracts | `shared/` package, Zod schemas  | Request/response types live in one place and are validated at both ends.                  |
| AI        | Typed `AiProvider` interface    | Swap OpenAI ↔ rule-based without touching routes.                                         |
| Design    | `DESIGN.md` (google-labs-code)  | Tokens + rationale live in source control, not a Figma URL.                               |

## How the controls are wired in code

This table is the tour — every row maps a regulatory concern to the file that
implements it.

| Concern                                | Where it lives                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| AI suggests, never decides             | `POST /cases/:id/ai-suggestion` writes **only** to `Case.aiSuggestion` (see `backend/src/routes/cases.ts`, `services/caseService.ts :: attachAiSuggestion`). |
| Human decision is role-gated           | `POST /cases/:id/reviewer-decision` sits behind `requireRole("OPS", "CCO")` (see `backend/src/middleware/requireRole.ts`). |
| State + audit are one transaction      | `caseService.ts` wraps every state change in `prisma.$transaction` and calls `writeAudit` inside it (`services/auditService.ts`). |
| Audit log is append-only               | No update or delete route exists on the `AuditLog` model; `auditService.ts` exposes a write helper only. |
| AI calls are reproducible              | `modelName`, `runId`, and a snapshot of `rulesConfig` land in the `AI_SUGGESTION_GENERATED` audit entry (`services/caseService.ts :: attachAiSuggestion`). |
| Policy as data, not code               | `CaseType.rulesConfig` + `slaConfig` are JSON on the case type and are snapshotted into each audit row. |
| SLA breach is first-class              | `services/slaService.ts` computes `dueAt` at creation; decision time triggers a dedicated `SLA_BREACH_RECORDED` entry. |
| Examiner / LP export                   | `services/exportService.ts` feeds both `GET /export/*.csv` and the `npm run export` CLI — one formatter, two entry points. |

## Quickstart (no API key required)

The app ships with a deterministic rule-based AI provider. You can run the
entire demo without an OpenAI key; set one later to switch to a real LLM.

```bash
# 1. clone and install
git clone https://github.com/MihirM9/cash-reconciliation-workflow.git
cd cash-reconciliation-workflow
npm install

# 2. env (defaults are fine; leave OPENAI_API_KEY blank to use the rule-based provider)
cp backend/.env.example backend/.env

# 3. migrate + seed
npm run prisma:migrate --workspace backend
npm run seed

# 4. run both apps
npm run dev
```

Then open **http://localhost:5173**. The first thing to do is pick a user in
the top-right **Acting as** dropdown — that controls the `x-user-id` header
the frontend sends, and therefore what actions you can take.

To switch to a real LLM later, set `OPENAI_API_KEY` in `backend/.env` and
restart. On startup the backend logs which provider it chose, and every
suggestion's `modelName` records it permanently.

## Walkthrough: five-minute demo

The seed creates five cases that together tell a story an examiner or LP
would recognize. Walk them in order:

1. **`OPEN`, today** — open the newest case. Point out the four panels:
   Inputs, AI Suggestion (empty), Reviewer Decision (empty), Audit Trail
   (one entry: `CASE_CREATED`, with a snapshot of the rules and SLA).
2. **`UNDER_REVIEW`, yesterday** — AI has already suggested `OK`. The audit
   trail contains an `AI_SUGGESTION_GENERATED` row with the model name, run
   ID, and rules snapshot. No finalization yet.
3. **`APPROVED`, 2 days ago** — full lifecycle: create → AI suggestion → OPS
   approved. Reviewer decision note is there, decision timestamp is there,
   status moved from `UNDER_REVIEW` to `APPROVED` in the same transaction
   that wrote the audit entry.
4. **`ESCALATED`, 3 days ago** — variance is $11,600 on a $1,000 tolerance,
   so the AI recommends `ESCALATE`. The CCO confirms and notes an opened
   ticket with the fund administrator. Escalation is treated as a normal
   end state, not an exception path.
5. **`APPROVED` + SLA breached, 4 days ago** — decided at 18:45 local, after
   the 16:00 due time. The audit trail has two rows for the finalization:
   `DECISION_MADE` and a separate `SLA_BREACH_RECORDED`. The SLA filter on
   the Case List surfaces it even though the case is technically approved.

Then:

- **Switch users** to `Ava Analyst` and open the `OPEN` case. Click
  **Generate AI suggestion** — watch an `AI_SUGGESTION_GENERATED` row land in
  the audit trail with a deterministic rule-based explanation (or an LLM one
  if you configured a key).
- **Switch users** to `Omar Ops`. The **Submit decision** button enables.
  Submit with a note; watch `DECISION_MADE` land in the trail in real time.
- **Export.** Run:
  ```bash
  npm run export -- --from 2026-01-01 --to 2026-12-31 --out ./out
  ```
  You now have `out/cases.csv` and `out/audit-logs.csv`. Hand those to the
  imagined examiner and you're done.

## API reference

Auth is demo-grade: send `x-user-id: <userId>` and the middleware hydrates
`req.user` from the DB. Swapping to a real IdP is a single file
(`backend/src/middleware/auth.ts`).

| Method | Path                               | Role             | Purpose                                         |
| ------ | ---------------------------------- | ---------------- | ----------------------------------------------- |
| GET    | `/health`                          | —                | Liveness                                        |
| GET    | `/users`                           | —                | Demo user directory (powers the UI switcher)    |
| GET    | `/case-types`                      | —                | List case types                                 |
| GET    | `/case-types/:id`                  | —                | Full case type with rules + SLA config          |
| POST   | `/case-types`                      | ADMIN / CCO      | Create a case type                              |
| GET    | `/cases`                           | —                | Filter by date / type / status / SLA            |
| GET    | `/cases/:id`                       | —                | Case detail with full audit log                 |
| POST   | `/cases`                           | any authed user  | Create case; writes `CASE_CREATED`              |
| PATCH  | `/cases/:id/inputs`                | any authed user  | Update inputs pre-finalization                  |
| POST   | `/cases/:id/ai-suggestion`         | any authed user  | Run AI provider; **never finalizes**            |
| POST   | `/cases/:id/reviewer-decision`     | OPS / CCO        | Finalize; writes `DECISION_MADE` (+ SLA breach) |
| GET    | `/audit-logs`                      | —                | Compliance pull by date range                   |
| GET    | `/export/cases.csv`                | —                | CSV export of cases                             |
| GET    | `/export/audit-logs.csv`           | —                | CSV export of audit logs                        |

All request and response shapes are defined once in
[`shared/src/schemas.ts`](shared/src/schemas.ts) and [`shared/src/types.ts`](shared/src/types.ts).

## Data model

Four models, no cleverness:

| Model      | Purpose                                                                                 |
| ---------- | --------------------------------------------------------------------------------------- |
| `User`     | `ANALYST` / `OPS` / `CCO` / `ADMIN`. The role gate hangs off this.                      |
| `CaseType` | The workflow definition: `rulesConfig` + `slaConfig` as JSON. Policy as data.           |
| `Case`     | One run of a workflow. Holds `inputs`, optional `aiSuggestion`, optional `reviewerDecision`, `status`, `dueAt`, `slaBreached`. |
| `AuditLog` | Append-only. Every state change writes one of: `CASE_CREATED`, `INPUTS_UPDATED`, `AI_SUGGESTION_GENERATED`, `DECISION_MADE`, `SLA_BREACH_RECORDED`. |

See [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). Enums are
stored as validated strings because SQLite doesn't support native enums; the
Zod schemas in `shared/` enforce them at the app layer.

## Design system: DESIGN.md

Visual identity lives in [`DESIGN.md`](DESIGN.md) at the repo root, in the
[google-labs-code/design.md](https://github.com/google-labs-code/design.md)
format: YAML front-matter tokens + markdown rationale. The design system
("Ledger") is deliberately tuned for a compliance surface — serif headlines,
Inter body, JetBrains Mono for identifiers, one disciplined navy accent, and
a status palette whose foreground/background pairs clear WCAG AA contrast.

[`frontend/src/styles.css`](frontend/src/styles.css) mirrors those tokens 1:1
as CSS custom properties, so the UI is a direct read of the design system.

```bash
npm run design:lint     # validate DESIGN.md structure + WCAG contrast
npm run design:export   # write tokens.json (DTCG format) at the repo root
```

See [`frontend/src/design-system/README.md`](frontend/src/design-system/README.md)
for the token → CSS-variable mapping and the Stitch component drop-in path.

## Regulatory framing

This demo isn't legal advice, but the design choices are grounded in what the
SEC has historically cared about for advisers:

- **Rule 204-2 "true, accurate, current" books and records.** Append-only
  audit log, transactional writes that bind state to its audit entry, and a
  CSV export API + CLI covering the same data for any date range.
- **Policies and procedures evidence.** The workflow definition (rules, SLA,
  required inputs, required evidence, escalation criteria, AI model) lives as
  data on `CaseType` and is snapshotted into each audit row — so a historical
  decision stays explainable even after the policy is updated.
- **AI governance, in the shape exam staff and LPs ask about.** Separate
  endpoints for suggestion vs. decision, a role gate on finalization, and
  `modelName + runId + rulesSnapshot` preserved on every AI invocation so the
  question *"which model, with which rules, produced this output?"* has a
  concrete answer.
- **Exceptions visible, not buried.** `SLA_BREACH_RECORDED` is a first-class
  audit action and the Case List has a dedicated SLA filter. Exceptions are
  what reviewers look at first; the UI reflects that.

## What this deliberately is not

- It is **not a reconciliation engine.** The rec itself is two numbers and a
  variance. The point is the workflow shell, not the math.
- It is **not a production auth system.** The `x-user-id` header exists so the
  role gate can be demonstrated without pulling in an IdP. The replacement is
  a single file.
- It is **not a real immutability guarantee.** Application-level append-only
  is the right shape; a real deployment would add database-level controls
  (row-level triggers, WORM storage, or a tamper-evident log like a
  certificate-transparency-style Merkle log). The app is structured so adding
  that later is local.
- It is **not multi-tenant or multi-fund.** Scoping cases and audit logs to a
  tenant is a straightforward extension; it was left out to keep the code
  readable.

## Where this would go next

Short list of the changes a real v1 would need, roughly in order of leverage:

1. **Real auth** via OIDC / your IdP, and a proper session layer — replaces
   `middleware/auth.ts`.
2. **Postgres** — change `provider` in `schema.prisma` and `DATABASE_URL`.
   Migrations already exist.
3. **File uploads for evidence** to object storage with hash-pinned references
   on the audit entry (not just `recFilePath` strings).
4. **More case types.** The domain model is already parameterized by
   `CaseType`; adding, for example, `SUB_DOC_REVIEW`, `ALLOCATION_REVIEW`,
   `VENDOR_ACCESS_GRANT` is additive. Each gets its own `rulesConfig`.
5. **Scheduled workflows.** Auto-create the daily cash-rec case at
   `businessDate 00:00` and attach bank + ledger feeds as inputs.
6. **Notifications + SLA alerts.** Slack/email when a case is nearing `dueAt`,
   and when a breach is recorded.
7. **Database-level log immutability.** RLS + a trigger that prevents
   `UPDATE`/`DELETE` on `audit_log`, plus a periodic Merkle root signed and
   stored off-box.

---

Built as a demonstration piece. Questions welcome.
