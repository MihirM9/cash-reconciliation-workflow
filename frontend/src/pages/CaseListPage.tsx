import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { CaseStatus } from "@sec-workflow/shared";
import { fetchCases, fetchCaseTypes } from "../api/cases.js";
// Swap the two imports below to ../design-system/* once Stitch components land.
import { StatusBadge } from "../components/StatusBadge.js";
import { SlaBadge } from "../components/SlaBadge.js";

const ALL_STATUSES: CaseStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "APPROVED",
  "ESCALATED",
  "CLOSED",
];

export function CaseListPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [caseTypeId, setCaseTypeId] = useState("");
  const [statuses, setStatuses] = useState<CaseStatus[]>([]);
  const [slaBreached, setSlaBreached] = useState<"" | "true" | "false">("");

  const { data: caseTypes = [] } = useQuery({
    queryKey: ["case-types"],
    queryFn: fetchCaseTypes,
  });

  const filter = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      caseTypeId: caseTypeId || undefined,
      status: statuses.length ? statuses : undefined,
      slaBreached: slaBreached === "" ? undefined : slaBreached === "true",
    }),
    [from, to, caseTypeId, statuses, slaBreached],
  );

  const {
    data: cases = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cases", filter],
    queryFn: () => fetchCases(filter),
  });

  function toggleStatus(s: CaseStatus) {
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  return (
    <div>
      <div className="panel">
        <h2>Filters</h2>
        <div className="filters">
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Case type
            <select
              value={caseTypeId}
              onChange={(e) => setCaseTypeId(e.target.value)}
            >
              <option value="">All</option>
              {caseTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            SLA
            <select
              value={slaBreached}
              onChange={(e) => setSlaBreached(e.target.value as "" | "true" | "false")}
            >
              <option value="">Any</option>
              <option value="false">On time</option>
              <option value="true">Breached</option>
            </select>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Status</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ALL_STATUSES.map((s) => (
                <label
                  key={s}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={statuses.includes(s)}
                    onChange={() => toggleStatus(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Cases</h2>
        {error && <div className="error-banner">{(error as Error).message}</div>}
        {isLoading ? (
          <div className="empty-state">Loading…</div>
        ) : cases.length === 0 ? (
          <div className="empty-state">No cases match the current filters.</div>
        ) : (
          <table className="cases">
            <thead>
              <tr>
                <th>Business date</th>
                <th>Case type</th>
                <th>Status</th>
                <th>SLA</th>
                <th>Reviewer</th>
                <th>Last updated</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => (window.location.href = `/cases/${c.id}`)}
                >
                  <td>
                    <Link to={`/cases/${c.id}`}>
                      {new Date(c.businessDate).toLocaleDateString()}
                    </Link>
                  </td>
                  <td>{c.caseType?.name ?? c.caseTypeId}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    <SlaBadge breached={c.slaBreached} />
                  </td>
                  <td>{c.reviewer?.name ?? "—"}</td>
                  <td>{new Date(c.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
