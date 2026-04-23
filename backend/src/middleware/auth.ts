import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db.js";
import type { Role } from "@sec-workflow/shared";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string; role: Role };
    }
  }
}

/**
 * Demo-grade auth: reads `x-user-id` header and hydrates `req.user` from the DB.
 * In production this would be replaced with a real IdP / session layer, but
 * the shape of `req.user` and the downstream `requireRole` gate stay the same.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const headerVal = req.header("x-user-id");
  if (!headerVal) {
    next();
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: headerVal } });
  if (user) {
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
    };
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthenticated. Provide x-user-id header." });
    return;
  }
  next();
}
