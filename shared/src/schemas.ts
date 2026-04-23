import { z } from "zod";

export const RoleSchema = z.enum(["ANALYST", "OPS", "CCO", "ADMIN"]);

export const CaseStatusSchema = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "APPROVED",
  "ESCALATED",
  "CLOSED",
]);

export const ActorTypeSchema = z.enum(["SYSTEM", "AI", "USER"]);

export const AuditActionTypeSchema = z.enum([
  "CASE_CREATED",
  "INPUTS_UPDATED",
  "AI_SUGGESTION_GENERATED",
  "DECISION_MADE",
  "SLA_BREACH_RECORDED",
]);

export const FieldDefinitionSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["number", "string", "date", "file"]),
  required: z.boolean(),
});

export const RulesConfigSchema = z.object({
  varianceTolerance: z.number().nonnegative(),
  requiredInputs: z.array(FieldDefinitionSchema),
  requiredEvidence: z.array(z.string()),
  escalationCriteria: z.array(z.string()),
  aiModel: z.string().min(1),
});

export const SlaConfigSchema = z.object({
  dueTimeOfDay: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  maxCompletionDelayMinutes: z.number().int().nonnegative(),
  defaultReviewerRole: RoleSchema,
});

export const CreateCaseTypeInputSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  rulesConfig: RulesConfigSchema,
  slaConfig: SlaConfigSchema,
});
export type CreateCaseTypeInput = z.infer<typeof CreateCaseTypeInputSchema>;

export const CreateCaseInputSchema = z.object({
  caseTypeId: z.string().min(1),
  businessDate: z.string().min(1), // ISO date string (yyyy-mm-dd or full ISO)
  inputs: z.record(z.unknown()),
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

export const UpdateCaseInputsSchema = z.object({
  inputs: z.record(z.unknown()),
});
export type UpdateCaseInputs = z.infer<typeof UpdateCaseInputsSchema>;

export const ReviewerDecisionInputSchema = z.object({
  finalStatus: z.enum(["APPROVED", "ESCALATED"]),
  decisionNote: z.string().min(1).max(2000),
});
export type ReviewerDecisionInput = z.infer<typeof ReviewerDecisionInputSchema>;

export const AiSuggestionSchema = z.object({
  suggestedStatus: z.enum(["OK", "ESCALATE"]),
  explanation: z.string().min(1),
  modelName: z.string().min(1),
  runId: z.string().min(1),
  generatedAt: z.string().min(1),
});

export const AiResponseSchema = z.object({
  suggestedStatus: z.enum(["OK", "ESCALATE"]),
  explanation: z.string().min(1),
});
export type AiResponse = z.infer<typeof AiResponseSchema>;

export const CaseListQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  caseTypeId: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  slaBreached: z.enum(["true", "false"]).optional(),
});
export type CaseListQuery = z.infer<typeof CaseListQuerySchema>;

export const AuditLogQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  caseId: z.string().optional(),
});
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export const ExportQuerySchema = z.object({
  from: z.string(),
  to: z.string(),
});
export type ExportQuery = z.infer<typeof ExportQuerySchema>;
