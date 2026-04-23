import { Router } from "express";
import { ExportQuerySchema } from "@sec-workflow/shared";
import { exportAuditLogsCsv, exportCasesCsv } from "../services/exportService.js";

export const exportsRouter = Router();

exportsRouter.get("/cases.csv", async (req, res, next) => {
  try {
    const q = ExportQuerySchema.parse(req.query);
    const csv = await exportCasesCsv(new Date(q.from), new Date(q.to));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cases-${q.from}-to-${q.to}.csv"`,
    );
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

exportsRouter.get("/audit-logs.csv", async (req, res, next) => {
  try {
    const q = ExportQuerySchema.parse(req.query);
    const csv = await exportAuditLogsCsv(new Date(q.from), new Date(q.to));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-logs-${q.from}-to-${q.to}.csv"`,
    );
    res.send(csv);
  } catch (e) {
    next(e);
  }
});
