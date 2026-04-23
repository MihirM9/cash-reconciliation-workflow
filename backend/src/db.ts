import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["warn", "error"],
});

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
