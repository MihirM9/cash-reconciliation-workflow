export type Role = "ANALYST" | "OPS" | "CCO" | "ADMIN";

export type CaseStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "ESCALATED"
  | "CLOSED";

export type ActorType = "SYSTEM" | "AI" | "USER";

export type AuditActionType =
  | "CASE_CREATED"
  | "INPUTS_UPDATED"
  | "AI_SUGGESTION_GENERATED"
  | "DECISION_MADE"
  | "SLA_BREACH_RECORDED";

export type AiSuggestedStatus = "OK" | "ESCALATE";
export type ReviewerFinalStatus = "APPROVED" | "ESCALATED";

export interface FieldDefinition {
  name: string;
  label: string;
  type: "number" | "string" | "date" | "file";
  required: boolean;
}

export interface RulesConfig {
  varianceTolerance: number;
  requiredInputs: FieldDefinition[];
  requiredEvidence: string[];
  escalationCriteria: string[];
  aiModel: string;
}

export interface SlaConfig {
  dueTimeOfDay: string; // "16:00:00"
  maxCompletionDelayMinutes: number;
  defaultReviewerRole: Role;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface CaseType {
  id: string;
  name: string;
  description: string;
  rulesConfig: RulesConfig;
  slaConfig: SlaConfig;
}

export interface CashReconciliationInputs {
  bankBalance: number;
  ledgerBalance: number;
  variance: number;
  recFilePath?: string;
  notes?: string;
}

export interface AiSuggestion {
  suggestedStatus: AiSuggestedStatus;
  explanation: string;
  modelName: string;
  runId: string;
  generatedAt: string;
}

export interface ReviewerDecision {
  finalStatus: ReviewerFinalStatus;
  decisionNote: string;
  decidedAt: string;
}

export interface Case {
  id: string;
  caseTypeId: string;
  caseType?: CaseType;
  businessDate: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  createdBy?: User;
  reviewerUserId: string | null;
  reviewer?: User | null;
  inputs: Record<string, unknown>;
  aiSuggestion: AiSuggestion | null;
  reviewerDecision: ReviewerDecision | null;
  dueAt: string;
  slaBreached: boolean;
}

export interface AuditLogEntry {
  id: string;
  caseId: string;
  timestamp: string;
  actorType: ActorType;
  actorId: string | null;
  actionType: AuditActionType;
  details: Record<string, unknown>;
}

export interface CaseWithAudit extends Case {
  auditLogs: AuditLogEntry[];
}
