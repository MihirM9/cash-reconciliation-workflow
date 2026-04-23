import { Router } from "express";
import { CreateCaseTypeInputSchema } from "@sec-workflow/shared";
import { createCaseType, getCaseType, listCaseTypes } from "../services/caseService.js";
import { requireRole } from "../middleware/requireRole.js";
import { requireAuth } from "../middleware/auth.js";

export const caseTypesRouter = Router();

caseTypesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listCaseTypes());
  } catch (e) {
    next(e);
  }
});

caseTypesRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getCaseType(req.params.id));
  } catch (e) {
    next(e);
  }
});

caseTypesRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "CCO"),
  async (req, res, next) => {
    try {
      const body = CreateCaseTypeInputSchema.parse(req.body);
      const created = await createCaseType(body);
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  },
);
