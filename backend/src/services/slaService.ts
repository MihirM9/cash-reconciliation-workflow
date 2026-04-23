import type { SlaConfig } from "@sec-workflow/shared";

/**
 * Compute the due timestamp for a case given its business date and SLA config.
 * `dueTimeOfDay` is interpreted in the server's local timezone; for a real
 * multi-TZ deployment this should become an explicit IANA zone on SlaConfig.
 */
export function computeDueAt(businessDate: Date, slaConfig: SlaConfig): Date {
  const [h, m, s] = slaConfig.dueTimeOfDay.split(":").map((n) => parseInt(n, 10));
  const due = new Date(businessDate);
  due.setHours(h ?? 16, m ?? 0, s ?? 0, 0);
  due.setTime(due.getTime() + slaConfig.maxCompletionDelayMinutes * 60_000);
  return due;
}

export function isSlaBreached(dueAt: Date, decidedAt: Date): boolean {
  return decidedAt.getTime() > dueAt.getTime();
}

export function delayMinutes(dueAt: Date, decidedAt: Date): number {
  return Math.max(0, Math.floor((decidedAt.getTime() - dueAt.getTime()) / 60_000));
}
