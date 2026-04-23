import { Router } from "express";
import { AuditLogQuerySchema } from "@sec-workflow/shared";
import { prisma } from "../db.js";
import { serializeAuditLog } from "../services/caseService.js";

export const auditLogsRouter = Router();

auditLogsRouter.get("/", async (req, res, next) => {
  try {
    const q = AuditLogQuerySchema.parse(req.query);
    const rows = await prisma.auditLog.findMany({
      where: {
        ...(q.caseId ? { caseId: q.caseId } : {}),
        ...(q.from || q.to
          ? {
              timestamp: {
                ...(q.from ? { gte: new Date(q.from) } : {}),
                ...(q.to ? { lte: new Date(q.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: "asc" },
    });
    res.json(rows.map(serializeAuditLog));
  } catch (e) {
    next(e);
  }
});
