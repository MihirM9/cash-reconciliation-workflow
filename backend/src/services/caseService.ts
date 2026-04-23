import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { HttpError } from "../middleware/errorHandler.js";
import { writeAudit } from "./auditService.js";
import { computeDueAt, delayMinutes, isSlaBreached } from "./slaService.js";
import {
  RulesConfigSchema,
  SlaConfigSchema,
  type CreateCaseInput,
  type ReviewerDecisionInput,
} from "@sec-workflow/shared";
import type {
  AiSuggestion,
  CaseType as SharedCaseType,
  ReviewerDecision,
  RulesConfig,
  SlaConfig,
} from "@sec-workflow/shared";

function parseCaseType(
  row: {
    id: string;
    name: string;
    description: string;
    rulesConfig: string;
    slaConfig: string;
  },
): SharedCaseType {
  const rulesConfig = RulesConfigSchema.parse(JSON.parse(row.rulesConfig));
  const slaConfig = SlaConfigSchema.parse(JSON.parse(row.slaConfig));
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rulesConfig,
    slaConfig,
  };
}

export async function getCaseType(id: string): Promise<SharedCaseType> {
  const row = await prisma.caseType.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, `CaseType ${id} not found`);
  return parseCaseType(row);
}

export async function listCaseTypes(): Promise<SharedCaseType[]> {
  const rows = await prisma.caseType.findMany({ orderBy: { name: "asc" } });
  return rows.map(parseCaseType);
}

export async function createCaseType(input: {
  name: string;
  description: string;
  rulesConfig: RulesConfig;
  slaConfig: SlaConfig;
}): Promise<SharedCaseType> {
  const row = await prisma.caseType.create({
    data: {
      name: input.name,
      description: input.description,
      rulesConfig: JSON.stringify(input.rulesConfig),
      slaConfig: JSON.stringify(input.slaConfig),
    },
  });
  return parseCaseType(row);
}

function validateInputsAgainstRules(
  inputs: Record<string, unknown>,
  rules: RulesConfig,
): void {
  for (const field of rules.requiredInputs) {
    if (!field.required) continue;
    const val = inputs[field.name];
    if (val === undefined || val === null || val === "") {
      throw new HttpError(
        400,
        `Missing required input "${field.name}" for case type.`,
      );
    }
    if (field.type === "number" && typeof val !== "number") {
      throw new HttpError(400, `Input "${field.name}" must be a number.`);
    }
  }
}

export async function createCase(
  input: CreateCaseInput,
  createdByUserId: string,
) {
  const caseType = await getCaseType(input.caseTypeId);
  validateInputsAgainstRules(input.inputs, caseType.rulesConfig);

  const businessDate = new Date(input.businessDate);
  if (Number.isNaN(businessDate.getTime())) {
    throw new HttpError(400, "Invalid businessDate.");
  }
  const dueAt = computeDueAt(businessDate, caseType.slaConfig);

  return prisma.$transaction(async (tx) => {
    const created = await tx.case.create({
      data: {
        caseTypeId: caseType.id,
        businessDate,
        status: "OPEN",
        createdByUserId,
        inputs: JSON.stringify(input.inputs),
        dueAt,
      },
    });
    await writeAudit(tx, {
      caseId: created.id,
      actorType: "USER",
      actorId: createdByUserId,
      actionType: "CASE_CREATED",
      details: {
        inputs: input.inputs,
        caseTypeName: caseType.name,
        rulesSnapshot: caseType.rulesConfig,
        slaSnapshot: caseType.slaConfig,
        dueAt: dueAt.toISOString(),
      },
    });
    return created;
  });
}

export async function updateCaseInputs(
  caseId: string,
  userId: string,
  newInputs: Record<string, unknown>,
) {
  const existing = await prisma.case.findUnique({
    where: { id: caseId },
    include: { caseType: true },
  });
  if (!existing) throw new HttpError(404, `Case ${caseId} not found`);
  if (existing.status === "APPROVED" || existing.status === "ESCALATED" || existing.status === "CLOSED") {
    throw new HttpError(
      409,
      `Cannot update inputs on a case with status ${existing.status}.`,
    );
  }
  const ct = parseCaseType(existing.caseType);
  validateInputsAgainstRules(newInputs, ct.rulesConfig);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.case.update({
      where: { id: caseId },
      data: { inputs: JSON.stringify(newInputs) },
    });
    await writeAudit(tx, {
      caseId,
      actorType: "USER",
      actorId: userId,
      actionType: "INPUTS_UPDATED",
      details: {
        previousInputs: JSON.parse(existing.inputs),
        newInputs,
      },
    });
    return updated;
  });
}

export async function attachAiSuggestion(
  caseId: string,
  suggestion: AiSuggestion,
  rulesSnapshot: RulesConfig,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.case.findUnique({ where: { id: caseId } });
    if (!existing) throw new HttpError(404, `Case ${caseId} not found`);
    if (existing.status !== "OPEN" && existing.status !== "UNDER_REVIEW") {
      throw new HttpError(
        409,
        `Cannot generate AI suggestion on a case with status ${existing.status}.`,
      );
    }
    const updated = await tx.case.update({
      where: { id: caseId },
      data: {
        aiSuggestion: JSON.stringify(suggestion),
        status: existing.status === "OPEN" ? "UNDER_REVIEW" : existing.status,
      },
    });
    await writeAudit(tx, {
      caseId,
      actorType: "AI",
      actorId: null,
      actionType: "AI_SUGGESTION_GENERATED",
      details: {
        aiSuggestion: suggestion,
        rulesSnapshot,
      },
    });
    return updated;
  });
}

export async function recordReviewerDecision(
  caseId: string,
  reviewerUserId: string,
  input: ReviewerDecisionInput,
): Promise<{ slaBreached: boolean; delayMinutes: number }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.case.findUnique({ where: { id: caseId } });
    if (!existing) throw new HttpError(404, `Case ${caseId} not found`);
    if (existing.status === "APPROVED" || existing.status === "ESCALATED" || existing.status === "CLOSED") {
      throw new HttpError(
        409,
        `Case ${caseId} already finalized (status ${existing.status}).`,
      );
    }

    const decidedAt = new Date();
    const breached = isSlaBreached(existing.dueAt, decidedAt);
    const decision: ReviewerDecision = {
      finalStatus: input.finalStatus,
      decisionNote: input.decisionNote,
      decidedAt: decidedAt.toISOString(),
    };

    await tx.case.update({
      where: { id: caseId },
      data: {
        status: input.finalStatus,
        reviewerUserId,
        reviewerDecision: JSON.stringify(decision),
        slaBreached: breached || existing.slaBreached,
      },
    });

    await writeAudit(tx, {
      caseId,
      actorType: "USER",
      actorId: reviewerUserId,
      actionType: "DECISION_MADE",
      details: {
        finalStatus: decision.finalStatus,
        decisionNote: decision.decisionNote,
        decidedAt: decision.decidedAt,
        priorAiSuggestion: existing.aiSuggestion
          ? JSON.parse(existing.aiSuggestion)
          : null,
        dueAt: existing.dueAt.toISOString(),
      },
    });

    if (breached) {
      await writeAudit(tx, {
        caseId,
        actorType: "SYSTEM",
        actorId: null,
        actionType: "SLA_BREACH_RECORDED",
        details: {
          dueAt: existing.dueAt.toISOString(),
          decidedAt: decision.decidedAt,
          delayMinutes: delayMinutes(existing.dueAt, decidedAt),
        },
      });
    }

    return {
      slaBreached: breached,
      delayMinutes: delayMinutes(existing.dueAt, decidedAt),
    };
  });
}

// ---- Query helpers ----

export interface ListCasesFilter {
  from?: Date;
  to?: Date;
  caseTypeId?: string;
  status?: string[];
  slaBreached?: boolean;
}

export async function listCases(filter: ListCasesFilter) {
  const where: Prisma.CaseWhereInput = {};
  if (filter.from || filter.to) {
    where.businessDate = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }
  if (filter.caseTypeId) where.caseTypeId = filter.caseTypeId;
  if (filter.status && filter.status.length > 0) where.status = { in: filter.status };
  if (filter.slaBreached !== undefined) where.slaBreached = filter.slaBreached;

  return prisma.case.findMany({
    where,
    orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
    include: {
      caseType: true,
      createdBy: true,
      reviewer: true,
    },
  });
}

export async function getCaseWithAudit(id: string) {
  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      caseType: true,
      createdBy: true,
      reviewer: true,
      auditLogs: { orderBy: { timestamp: "asc" } },
    },
  });
  if (!c) throw new HttpError(404, `Case ${id} not found`);
  return c;
}

// ---- Presentation helpers (DB row -> API shape) ----

export function serializeCase(row: {
  id: string;
  caseTypeId: string;
  caseType?: {
    id: string;
    name: string;
    description: string;
    rulesConfig: string;
    slaConfig: string;
  } | null;
  businessDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string;
  createdBy?: { id: string; name: string; email: string; role: string } | null;
  reviewerUserId: string | null;
  reviewer?: { id: string; name: string; email: string; role: string } | null;
  inputs: string;
  aiSuggestion: string | null;
  reviewerDecision: string | null;
  dueAt: Date;
  slaBreached: boolean;
}) {
  return {
    id: row.id,
    caseTypeId: row.caseTypeId,
    caseType: row.caseType ? parseCaseType(row.caseType) : undefined,
    businessDate: row.businessDate.toISOString(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUserId: row.createdByUserId,
    createdBy: row.createdBy ?? undefined,
    reviewerUserId: row.reviewerUserId,
    reviewer: row.reviewer ?? null,
    inputs: JSON.parse(row.inputs) as Record<string, unknown>,
    aiSuggestion: row.aiSuggestion ? JSON.parse(row.aiSuggestion) : null,
    reviewerDecision: row.reviewerDecision ? JSON.parse(row.reviewerDecision) : null,
    dueAt: row.dueAt.toISOString(),
    slaBreached: row.slaBreached,
  };
}

export function serializeAuditLog(row: {
  id: string;
  caseId: string;
  timestamp: Date;
  actorType: string;
  actorId: string | null;
  actionType: string;
  details: string;
}) {
  return {
    id: row.id,
    caseId: row.caseId,
    timestamp: row.timestamp.toISOString(),
    actorType: row.actorType,
    actorId: row.actorId,
    actionType: row.actionType,
    details: JSON.parse(row.details) as Record<string, unknown>,
  };
}
