import { Router } from "express";
import { prisma } from "../db.js";

export const usersRouter = Router();

/** Lists users for the demo user switcher on the frontend. */
usersRouter.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    );
  } catch (e) {
    next(e);
  }
});

usersRouter.get("/me", async (req, res) => {
  res.json(req.user ?? null);
});
