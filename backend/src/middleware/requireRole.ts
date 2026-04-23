import type { Request, Response, NextFunction } from "express";
import type { Role } from "@sec-workflow/shared";

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated." });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden. Required role(s): ${allowed.join(", ")}. Current: ${req.user.role}.`,
      });
      return;
    }
    next();
  };
}
