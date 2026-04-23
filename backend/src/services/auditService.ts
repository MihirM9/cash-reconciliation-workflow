import type { Prisma } from "@prisma/client";
import type { ActorType, AuditActionType } from "@sec-workflow/shared";

/**
 * Append-only audit writer. Must be called with a transaction client so the
 * audit entry is committed atomically with the state change it describes.
 * There is intentionally no update/delete helper — once written, entries are
 * immutable from the application's perspective.
 */
export async function writeAudit(
  tx: Prisma.TransactionClient,
  params: {
    caseId: string;
    actorType: ActorType;
    actorId: string | null;
    actionType: AuditActionType;
    details: Record<string, unknown>;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      caseId: params.caseId,
      actorType: params.actorType,
      actorId: params.actorId,
      actionType: params.actionType,
      details: JSON.stringify(params.details),
    },
  });
}
