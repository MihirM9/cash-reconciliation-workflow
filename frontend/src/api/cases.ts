import type {
  AuditLogEntry,
  Case,
  CaseStatus,
  CaseType,
  CaseWithAudit,
  ReviewerFinalStatus,
  User,
} from "@sec-workflow/shared";
import { api } from "./client.js";

export interface CaseListFilter {
  from?: string;
  to?: string;
  caseTypeId?: string;
  status?: CaseStatus[];
  slaBreached?: boolean;
}

function buildQuery(filter: CaseListFilter): string {
  const params = new URLSearchParams();
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.caseTypeId) params.set("caseTypeId", filter.caseTypeId);
  if (filter.status && filter.status.length > 0) {
    filter.status.forEach((s) => params.append("status", s));
  }
  if (filter.slaBreached !== undefined) {
    params.set("slaBreached", String(filter.slaBreached));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchUsers(): Promise<User[]> {
  return api.get<User[]>("/users");
}

export async function fetchCaseTypes(): Promise<CaseType[]> {
  return api.get<CaseType[]>("/case-types");
}

export async function fetchCases(filter: CaseListFilter): Promise<Case[]> {
  return api.get<Case[]>(`/cases${buildQuery(filter)}`);
}

export async function fetchCase(id: string): Promise<CaseWithAudit> {
  return api.get<CaseWithAudit>(`/cases/${id}`);
}

export async function generateAiSuggestion(id: string): Promise<CaseWithAudit> {
  return api.post<CaseWithAudit>(`/cases/${id}/ai-suggestion`);
}

export async function submitReviewerDecision(
  id: string,
  body: { finalStatus: ReviewerFinalStatus; decisionNote: string },
): Promise<CaseWithAudit & { sla: { slaBreached: boolean; delayMinutes: number } }> {
  return api.post(`/cases/${id}/reviewer-decision`, body);
}

export async function createCase(body: {
  caseTypeId: string;
  businessDate: string;
  inputs: Record<string, unknown>;
}): Promise<CaseWithAudit> {
  return api.post<CaseWithAudit>("/cases", body);
}

export async function fetchAuditLogs(params: {
  caseId?: string;
  from?: string;
  to?: string;
}): Promise<AuditLogEntry[]> {
  const usp = new URLSearchParams();
  if (params.caseId) usp.set("caseId", params.caseId);
  if (params.from) usp.set("from", params.from);
  if (params.to) usp.set("to", params.to);
  return api.get<AuditLogEntry[]>(
    `/audit-logs${usp.toString() ? `?${usp.toString()}` : ""}`,
  );
}
