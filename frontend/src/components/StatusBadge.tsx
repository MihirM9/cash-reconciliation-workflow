import type { CaseStatus } from "@sec-workflow/shared";

const CLASS_MAP: Record<CaseStatus, string> = {
  OPEN: "badge badge-open",
  UNDER_REVIEW: "badge badge-review",
  APPROVED: "badge badge-approved",
  ESCALATED: "badge badge-escalated",
  CLOSED: "badge badge-closed",
};

const LABEL_MAP: Record<CaseStatus, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  ESCALATED: "Escalated",
  CLOSED: "Closed",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={CLASS_MAP[status]}>{LABEL_MAP[status]}</span>;
}
