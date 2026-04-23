import { Router } from "express";
import {
  CaseListQuerySchema,
  CreateCaseInputSchema,
  ReviewerDecisionInputSchema,
  UpdateCaseInputsSchema,
} from "@sec-workflow/shared";
import {
  attachAiSuggestion,
  createCase,
  getCaseType,
  getCaseWithAudit,
  listCases,
  recordReviewerDecision,
  serializeAuditLog,
  serializeCase,
  updateCaseInputs,
} from "../services/caseService.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { getAiProvider } from "../ai/index.js";
import { HttpError } from "../middleware/errorHandler.js";

export const casesRouter = Router();

casesRouter.get("/", async (req, res, next) => {
  try {
    const q = CaseListQuerySchema.parse(req.query);
    const statusArr = q.status
      ? Array.isArray(q.status)
        ? q.status
        : [q.status]
      : undefined;
    const rows = await listCases({
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      caseTypeId: q.caseTypeId,
      status: statusArr,
      slaBreached:
        q.slaBreached === undefined ? undefined : q.slaBreached === "true",
    });
    res.json(rows.map(serializeCase));
  } catch (e) {
    next(e);
  }
});

casesRouter.get("/:id", async (req, res, next) => {
  try {
    const c = await getCaseWithAudit(req.params.id);
    res.json({
      ...serializeCase(c),
      auditLogs: c.auditLogs.map(serializeAuditLog),
    });
  } catch (e) {
    next(e);
  }
});

casesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = CreateCaseInputSchema.parse(req.body);
    const created = await createCase(body, req.user!.id);
    const full = await getCaseWithAudit(created.id);
    res.status(201).json({
      ...serializeCase(full),
      auditLogs: full.auditLogs.map(serializeAuditLog),
    });
  } catch (e) {
    next(e);
  }
});

casesRouter.patch("/:id/inputs", requireAuth, async (req, res, next) => {
  try {
    const body = UpdateCaseInputsSchema.parse(req.body);
    await updateCaseInputs(req.params.id, req.user!.id, body.inputs);
    const full = await getCaseWithAudit(req.params.id);
    res.json({
      ...serializeCase(full),
      auditLogs: full.auditLogs.map(serializeAuditLog),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Generate an AI suggestion for a case. This endpoint ONLY writes to
 * `aiSuggestion`; it never changes the final status. Finalization is reserved
 * for the reviewer-decision endpoint which is role-gated.
 */
casesRouter.post("/:id/ai-suggestion", requireAuth, async (req, res, next) => {
  try {
    const existing = await getCaseWithAudit(req.params.id);
    const caseType = await getCaseType(existing.caseTypeId);
    const provider = getAiProvider();
    const suggestion = await provider.suggest({
      caseType,
      inputs: JSON.parse(existing.inputs) as Record<string, unknown>,
    });
    await attachAiSuggestion(req.params.id, suggestion, caseType.rulesConfig);
    const full = await getCaseWithAudit(req.params.id);
    res.json({
      ...serializeCase(full),
      auditLogs: full.auditLogs.map(serializeAuditLog),
    });
  } catch (e) {
    next(e);
  }
});

casesRouter.post(
  "/:id/reviewer-decision",
  requireAuth,
  requireRole("OPS", "CCO"),
  async (req, res, next) => {
    try {
      const body = ReviewerDecisionInputSchema.parse(req.body);
      if (!req.user) throw new HttpError(401, "Unauthenticated.");
      const result = await recordReviewerDecision(req.params.id, req.user.id, body);
      const full = await getCaseWithAudit(req.params.id);
      res.json({
        ...serializeCase(full),
        auditLogs: full.auditLogs.map(serializeAuditLog),
        sla: result,
      });
    } catch (e) {
      next(e);
    }
  },
);
