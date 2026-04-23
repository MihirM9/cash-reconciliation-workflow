# SEC-Aware Cash Reconciliation Workflow (demo)

A narrow, walkthrough-ready demo of an **AI-assisted, SEC-aware** workflow for a
private fund adviser. It focuses on a single case type — daily cash reconciliation —
and demonstrates how AI can suggest, humans can decide, and every step can be
reconstructed from an append-only audit log consistent with the spirit of SEC
Rule 204-2 recordkeeping expectations.

The UI is intentionally minimal and component-based so a **Google Stitch**
design-system drop can replace the styling without touching data flow.

## Why each piece exists

- **AI is advisory, human is authoritative.** `POST /cases/:id/ai-suggestion` writes
  only to `Case.aiSuggestion` — it is structurally incapable of changing `Case.status`.
  `POST /cases/:id/reviewer-decision` is the only path that finalizes, and it is gated
  behind `requireRole("OPS", "CCO")`.
- **Append-only audit log.** The `AuditLog` table has no update or delete routes.
  Every state-changing service call writes state and audit rows in one Prisma
  transaction, so the log can never drift from the records it describes.
- **Reconstructable AI calls.** Every AI suggestion records `modelName` + `runId` +
  a snapshot of `rulesConfig` in the audit details, so an examiner can answer
  *"which model, with which rules, generated this suggestion?"*.
- **SLA is part of the record.** `dueAt` is computed at case creation from
  `CaseType.slaConfig`; a dedicated `SLA_BREACH_RECORDED` audit entry is written
  when a reviewer decides after the due time.
- **Exportable books and records.** `GET /export/cases.csv` and `GET /export/audit-logs.csv`,
  plus a CLI (`npm run export`), both use the same formatter and produce an
  examiner/LP-ready CSV pair for any date range.

## Repository layout

```text
sec-workflow-demo/
  backend/        # Express + Prisma + SQLite + OpenAI
  frontend/       # Vite + React + TS + React Query
  shared/         # types + Zod schemas shared between backend and frontend
```

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# then edit backend/.env and set OPENAI_API_KEY
```

`AI_MODEL` defaults to `gpt-4o-mini`. The value is stored on the `CaseType.rulesConfig`
at seed time so it's part of the compliance record.

### 3. Initialize the database and seed demo data

```bash
npm run prisma:migrate --workspace backend
npm run seed
```

Seed creates:

- 4 users: `Ava Analyst` (ANALYST), `Omar Ops` (OPS), `Casey CCO` (CCO), `Alex Admin` (ADMIN)
- 1 case type: `CASH_RECONCILIATION` with a $1,000 variance tolerance and 16:00 due time
- 5 cases spanning `OPEN`, `UNDER_REVIEW`, `APPROVED`, `ESCALATED`, and a SLA-breached `APPROVED`

### 4. Run both apps

```bash
npm run dev
```

- Backend: [http://localhost:4000](http://localhost:4000)
- Frontend: [http://localhost:5173](http://localhost:5173) (proxies `/api` -> backend)

Pick a user from the "Acting as" dropdown in the top-right. The user's role gates what
actions are allowed — for example, only OPS and CCO can finalize a reviewer decision.

### 5. Export books and records

```bash
npm run export -- --from 2026-01-01 --to 2026-12-31 --out ./out
```

Or hit the HTTP endpoints directly:

```bash
curl "http://localhost:4000/export/cases.csv?from=2026-01-01&to=2026-12-31" -o cases.csv
curl "http://localhost:4000/export/audit-logs.csv?from=2026-01-01&to=2026-12-31" -o audit.csv
```

## Walkthrough script (for a COO / CCO demo)

1. **Open the Case List.** Point out the SLA filter — breached cases are first-class
   citizens, not afterthoughts. This is what a CCO wants to see first.
2. **Open an `OPEN` case.** Walk through the four panels: Inputs, AI Suggestion,
   Reviewer Decision, Audit Trail. Emphasize that the AI Suggestion panel has its own
   endpoint and never changes status.
3. **Click "Generate AI suggestion"** as the analyst. Show the AI response — model
   name, run ID, generated timestamp, and rationale tied back to the rule set.
4. **Switch users** to `Omar Ops` in the header. Now the "Submit decision" button
   enables. Submitting requires a note — confirm in the modal that the note is a
   permanent record.
5. **Expand the Audit Trail.** Every entry has actor, action, timestamp, and a raw
   `details` payload. Show the rules snapshot inside `AI_SUGGESTION_GENERATED` and
   the `SLA_BREACH_RECORDED` entry on the breached case.
6. **Run the export CLI.** Hand the resulting `cases.csv` and `audit-logs.csv` to
   the examiner persona.

## API surface

| Method | Path                               | Role             | Purpose                                         |
| ------ | ---------------------------------- | ---------------- | ----------------------------------------------- |
| GET    | `/health`                          | —                | Liveness                                        |
| GET    | `/users`                           | —                | Demo user directory (for the UI switcher)       |
| GET    | `/case-types`                      | —                | List case types                                 |
| GET    | `/case-types/:id`                  | —                | Show a case type with full rules + SLA config   |
| POST   | `/case-types`                      | ADMIN / CCO      | Create a case type                              |
| GET    | `/cases`                           | —                | Filter cases by date / type / status / SLA      |
| GET    | `/cases/:id`                       | —                | Case detail + full audit log                    |
| POST   | `/cases`                           | any authed user  | Create case (writes `CASE_CREATED`)             |
| PATCH  | `/cases/:id/inputs`                | any authed user  | Update inputs pre-finalization                  |
| POST   | `/cases/:id/ai-suggestion`         | any authed user  | Run AI provider; never finalizes                |
| POST   | `/cases/:id/reviewer-decision`     | OPS / CCO        | Finalize; writes `DECISION_MADE` (+ SLA breach) |
| GET    | `/audit-logs`                      | —                | Compliance pull by date range                   |
| GET    | `/export/cases.csv`                | —                | CSV export of cases over a date range           |
| GET    | `/export/audit-logs.csv`           | —                | CSV export of audit logs over a date range      |

Auth is demo-grade: send `x-user-id: <userId>` and the middleware hydrates
`req.user` from the DB. Swapping to a real IdP is one file (`backend/src/middleware/auth.ts`).

## Design system

The canonical visual identity lives in [`DESIGN.md`](DESIGN.md) at the repo root
— a [google-labs-code/design.md](https://github.com/google-labs-code/design.md)
spec file. Tokens (colors, typography, rounded, spacing, components) are the
YAML front matter; the rationale and Do's/Don'ts are the markdown body.

`frontend/src/styles.css` mirrors those tokens 1:1 as CSS custom properties so
the UI is a direct read of the design system. When you change a token in
DESIGN.md, update the matching CSS variable until the Stitch exporter is wired
to regenerate the stylesheet automatically.

Handy commands:

```bash
npm run design:lint     # validate DESIGN.md (structure + WCAG contrast)
npm run design:export   # write tokens.json (DTCG) at the repo root
```

See [`frontend/src/design-system/README.md`](frontend/src/design-system/README.md)
for the DESIGN.md → CSS token mapping and the Stitch component drop-in swap.

## Compliance narrative (short form)

- **Rule 204-2 "true, accurate, current":** append-only logs + transactional writes.
- **AI governance:** separate endpoints for suggestion vs. decision, strict role gating,
  persisted model + run ID + rules snapshot on every AI invocation.
- **Policy as data:** rules and SLA live on the `CaseType` and are snapshotted into each
  audit entry, so historic decisions remain explainable even if policy later changes.
- **Exceptions are recorded, not hidden:** `SLA_BREACH_RECORDED` is a first-class
  audit action.
- **Retrievable and exportable:** filtered list endpoints + CSV export API + CLI.

## Development notes

- SQLite is used for zero-setup demo. Swap to Postgres by changing `provider` in
  `backend/prisma/schema.prisma` and `DATABASE_URL` in `backend/.env`.
- SQLite does not support enums, so status-like columns are stored as strings and
  validated via Zod schemas in `shared/`.
- Dates use the server's local timezone; for multi-TZ deployments extend `SlaConfig`
  with an explicit IANA zone and adjust `computeDueAt` accordingly.
