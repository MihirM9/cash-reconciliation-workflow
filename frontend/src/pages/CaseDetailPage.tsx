import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import type { ReviewerFinalStatus } from "@sec-workflow/shared";
import {
  fetchCase,
  fetchUsers,
  generateAiSuggestion,
  submitReviewerDecision,
} from "../api/cases.js";
import { getCurrentUserId } from "../api/client.js";
// Swap these to ../design-system/* when Stitch components land.
import { StatusBadge } from "../components/StatusBadge.js";
import { SlaBadge } from "../components/SlaBadge.js";
import { AuditTrail } from "../components/AuditTrail.js";

function formatCurrency(n: unknown): string {
  if (typeof n !== "number") return String(n ?? "");
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [finalStatus, setFinalStatus] = useState<ReviewerFinalStatus>("APPROVED");
  const [decisionNote, setDecisionNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: caseDetail, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => fetchCase(id!),
    enabled: !!id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const currentUserId = getCurrentUserId();
  const currentUser = users.find((u) => u.id === currentUserId) ?? null;
  const canReview =
    currentUser?.role === "OPS" || currentUser?.role === "CCO";

  const aiMutation = useMutation({
    mutationFn: () => generateAiSuggestion(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", id] }),
    onError: (e: Error) => setErrorMessage(e.message),
  });

  const decisionMutation = useMutation({
    mutationFn: () =>
      submitReviewerDecision(id!, { finalStatus, decisionNote }),
    onSuccess: () => {
      setShowDecisionModal(false);
      setDecisionNote("");
      qc.invalidateQueries({ queryKey: ["case", id] });
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
    onError: (e: Error) => setErrorMessage(e.message),
  });

  if (isLoading || !caseDetail) return <div className="empty-state">Loading…</div>;

  const isFinal =
    caseDetail.status === "APPROVED" ||
    caseDetail.status === "ESCALATED" ||
    caseDetail.status === "CLOSED";

  const inputs = caseDetail.inputs as Record<string, unknown>;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link to="/cases">← Back to cases</Link>
      </div>

      {errorMessage && (
        <div className="error-banner">{errorMessage}</div>
      )}

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "var(--fs-body-sm)", color: "var(--color-secondary)" }}>
              Case ID <span className="mono">{caseDetail.id}</span>
            </div>
            <h2 className="panel-title" style={{ margin: "4px 0 0" }}>
              {caseDetail.caseType?.name ?? caseDetail.caseTypeId} ·{" "}
              {new Date(caseDetail.businessDate).toLocaleDateString()}
            </h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <StatusBadge status={caseDetail.status} />
            <SlaBadge breached={caseDetail.slaBreached} />
          </div>
        </div>
        <dl className="kv" style={{ marginTop: 16 }}>
          <dt>Due at</dt>
          <dd>{new Date(caseDetail.dueAt).toLocaleString()}</dd>
          <dt>Created</dt>
          <dd>
            {new Date(caseDetail.createdAt).toLocaleString()} by{" "}
            {caseDetail.createdBy?.name ?? caseDetail.createdByUserId}
          </dd>
          {caseDetail.reviewer && (
            <>
              <dt>Reviewer</dt>
              <dd>
                {caseDetail.reviewer.name}
                <span className="role-chip">{caseDetail.reviewer.role}</span>
              </dd>
            </>
          )}
        </dl>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Inputs</h2>
          <dl className="kv">
            <dt>Bank balance</dt>
            <dd>{formatCurrency(inputs.bankBalance)}</dd>
            <dt>Ledger balance</dt>
            <dd>{formatCurrency(inputs.ledgerBalance)}</dd>
            <dt>Variance</dt>
            <dd>{formatCurrency(inputs.variance)}</dd>
            <dt>Evidence file</dt>
            <dd>
              {typeof inputs.recFilePath === "string" && inputs.recFilePath
                ? inputs.recFilePath
                : "—"}
            </dd>
            {typeof inputs.notes === "string" && inputs.notes && (
              <>
                <dt>Notes</dt>
                <dd>{inputs.notes}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="panel">
          <h2>AI suggestion</h2>
          {caseDetail.aiSuggestion ? (
            <dl className="kv">
              <dt>Suggested</dt>
              <dd>
                <strong>{caseDetail.aiSuggestion.suggestedStatus}</strong>
              </dd>
              <dt>Explanation</dt>
              <dd>{caseDetail.aiSuggestion.explanation}</dd>
              <dt>Model</dt>
              <dd>{caseDetail.aiSuggestion.modelName}</dd>
              <dt>Run ID</dt>
              <dd className="mono">{caseDetail.aiSuggestion.runId}</dd>
              <dt>Generated at</dt>
              <dd>{new Date(caseDetail.aiSuggestion.generatedAt).toLocaleString()}</dd>
            </dl>
          ) : (
            <div className="notice">
              No AI suggestion yet. The AI is advisory only — it never finalizes a case.
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button
              className="primary"
              disabled={aiMutation.isPending || isFinal || !currentUser}
              onClick={() => {
                setErrorMessage(null);
                aiMutation.mutate();
              }}
            >
              {aiMutation.isPending
                ? "Generating…"
                : caseDetail.aiSuggestion
                  ? "Regenerate AI suggestion"
                  : "Generate AI suggestion"}
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Reviewer decision</h2>
        {caseDetail.reviewerDecision ? (
          <dl className="kv">
            <dt>Final status</dt>
            <dd>
              <StatusBadge status={caseDetail.reviewerDecision.finalStatus} />
            </dd>
            <dt>Note</dt>
            <dd style={{ whiteSpace: "pre-wrap" }}>
              {caseDetail.reviewerDecision.decisionNote}
            </dd>
            <dt>Decided at</dt>
            <dd>
              {new Date(caseDetail.reviewerDecision.decidedAt).toLocaleString()}
            </dd>
          </dl>
        ) : (
          <>
            {!currentUser && (
              <div className="notice">
                Select a user in the header to act. Only OPS or CCO roles can finalize.
              </div>
            )}
            {currentUser && !canReview && (
              <div className="notice">
                You are acting as <strong>{currentUser.role}</strong>. Only OPS and CCO may finalize decisions.
              </div>
            )}
            <button
              className="primary"
              disabled={!canReview || isFinal}
              onClick={() => setShowDecisionModal(true)}
            >
              Submit decision
            </button>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Audit trail</h2>
        <AuditTrail entries={caseDetail.auditLogs} users={users} />
      </div>

      {showDecisionModal && (
        <div className="modal-backdrop" onClick={() => setShowDecisionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm reviewer decision</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Your name, role, timestamp, and note will be recorded in the append-only
              audit log.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 13 }}>
                Final status
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <label>
                    <input
                      type="radio"
                      name="finalStatus"
                      value="APPROVED"
                      checked={finalStatus === "APPROVED"}
                      onChange={() => setFinalStatus("APPROVED")}
                    />{" "}
                    Approved
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="finalStatus"
                      value="ESCALATED"
                      checked={finalStatus === "ESCALATED"}
                      onChange={() => setFinalStatus("ESCALATED")}
                    />{" "}
                    Escalated
                  </label>
                </div>
              </label>
              <label style={{ fontSize: 13 }}>
                Decision note (required)
                <textarea
                  rows={4}
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Explain your reasoning. This is a permanent record."
                />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowDecisionModal(false)}>Cancel</button>
              <button
                className="primary"
                disabled={!decisionNote.trim() || decisionMutation.isPending}
                onClick={() => {
                  setErrorMessage(null);
                  decisionMutation.mutate();
                }}
              >
                {decisionMutation.isPending ? "Submitting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
