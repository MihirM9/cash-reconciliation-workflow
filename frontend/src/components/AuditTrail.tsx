import type { AuditLogEntry, User } from "@sec-workflow/shared";

const ACTION_LABEL: Record<string, string> = {
  CASE_CREATED: "Case created",
  INPUTS_UPDATED: "Inputs updated",
  AI_SUGGESTION_GENERATED: "AI suggestion generated",
  DECISION_MADE: "Reviewer decision",
  SLA_BREACH_RECORDED: "SLA breach recorded",
};

function actorLabel(entry: AuditLogEntry, users: Map<string, User>): string {
  if (entry.actorType === "AI") return "AI";
  if (entry.actorType === "SYSTEM") return "System";
  if (entry.actorId) {
    const u = users.get(entry.actorId);
    return u ? `${u.name} (${u.role})` : `User ${entry.actorId}`;
  }
  return entry.actorType;
}

function shortDescription(entry: AuditLogEntry): string {
  switch (entry.actionType) {
    case "CASE_CREATED":
      return `Created with case type ${String(entry.details.caseTypeName ?? "")}.`;
    case "INPUTS_UPDATED":
      return "Inputs modified before finalization.";
    case "AI_SUGGESTION_GENERATED": {
      const s = entry.details.aiSuggestion as
        | { suggestedStatus: string; modelName: string }
        | undefined;
      return s
        ? `Suggested ${s.suggestedStatus} via model ${s.modelName}.`
        : "AI suggestion recorded.";
    }
    case "DECISION_MADE":
      return `Reviewer decided: ${String(entry.details.finalStatus ?? "")}.`;
    case "SLA_BREACH_RECORDED":
      return `SLA breached by ${String(entry.details.delayMinutes ?? "?")} minutes.`;
    default:
      return entry.actionType;
  }
}

export function AuditTrail({
  entries,
  users,
}: {
  entries: AuditLogEntry[];
  users: User[];
}) {
  const userMap = new Map(users.map((u) => [u.id, u]));
  const sorted = [...entries].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );

  if (sorted.length === 0) {
    return <div className="empty-state">No audit entries yet.</div>;
  }

  return (
    <ol className="audit-list">
      {sorted.map((e) => (
        <li key={e.id}>
          <div className="audit-meta">
            {new Date(e.timestamp).toLocaleString()} ·{" "}
            <strong>{ACTION_LABEL[e.actionType] ?? e.actionType}</strong> ·{" "}
            {actorLabel(e, userMap)}
          </div>
          <div>{shortDescription(e)}</div>
          <details className="audit-details">
            <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}>
              Details
            </summary>
            <pre>{JSON.stringify(e.details, null, 2)}</pre>
          </details>
        </li>
      ))}
    </ol>
  );
}
