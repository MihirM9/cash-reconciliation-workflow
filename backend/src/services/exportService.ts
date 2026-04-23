import { prisma } from "../db.js";
import { serializeAuditLog, serializeCase } from "./caseService.js";

/**
 * Escapes a single CSV field according to RFC 4180: wrap in double quotes if
 * the value contains a comma, quote, or newline; double any embedded quotes.
 */
function csvField(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s =
    typeof v === "string"
      ? v
      : typeof v === "number" || typeof v === "boolean"
        ? String(v)
        : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const headerLine = headers.join(",");
  const body = rows
    .map((r) => headers.map((h) => csvField(r[h])).join(","))
    .join("\n");
  return `${headerLine}\n${body}\n`;
}

export async function exportCasesCsv(from: Date, to: Date): Promise<string> {
  const cases = await prisma.case.findMany({
    where: { businessDate: { gte: from, lte: to } },
    include: { caseType: true, createdBy: true, reviewer: true },
    orderBy: { businessDate: "asc" },
  });
  const rows = cases.map(serializeCase).map((c) => ({
    caseId: c.id,
    businessDate: c.businessDate,
    caseType: c.caseType?.name ?? "",
    status: c.status,
    slaBreached: c.slaBreached,
    dueAt: c.dueAt,
    createdAt: c.createdAt,
    createdBy: c.createdBy?.name ?? "",
    reviewer: c.reviewer?.name ?? "",
    inputs: c.inputs,
    aiSuggestedStatus: c.aiSuggestion?.suggestedStatus ?? "",
    aiExplanation: c.aiSuggestion?.explanation ?? "",
    aiModel: c.aiSuggestion?.modelName ?? "",
    aiRunId: c.aiSuggestion?.runId ?? "",
    reviewerFinalStatus: c.reviewerDecision?.finalStatus ?? "",
    reviewerDecisionNote: c.reviewerDecision?.decisionNote ?? "",
    reviewerDecidedAt: c.reviewerDecision?.decidedAt ?? "",
  }));
  return toCsv(rows);
}

export async function exportAuditLogsCsv(from: Date, to: Date): Promise<string> {
  const logs = await prisma.auditLog.findMany({
    where: { timestamp: { gte: from, lte: to } },
    orderBy: { timestamp: "asc" },
  });
  const rows = logs.map(serializeAuditLog).map((l) => ({
    auditId: l.id,
    caseId: l.caseId,
    timestamp: l.timestamp,
    actorType: l.actorType,
    actorId: l.actorId ?? "",
    actionType: l.actionType,
    details: l.details,
  }));
  return toCsv(rows);
}
