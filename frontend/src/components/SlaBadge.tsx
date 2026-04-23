export function SlaBadge({ breached }: { breached: boolean }) {
  return (
    <span className={breached ? "badge badge-sla-breached" : "badge badge-sla-ok"}>
      {breached ? "SLA breached" : "On time"}
    </span>
  );
}
