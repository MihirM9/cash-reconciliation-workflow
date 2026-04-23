import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../db.js";
import { exportAuditLogsCsv, exportCasesCsv } from "../services/exportService.js";

/**
 * CLI wrapper around exportService for producing an examiner-ready bundle:
 *   npm run export -- --from 2026-01-01 --to 2026-01-31 --out ./out
 *
 * Writes `cases.csv` and `audit-logs.csv` into the target directory.
 */
function parseArgs(argv: string[]): { from: string; to: string; out: string } {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a && a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = "true";
      }
    }
  }
  if (!args.from || !args.to) {
    console.error(
      "Usage: npm run export -- --from YYYY-MM-DD --to YYYY-MM-DD [--out ./out]",
    );
    process.exit(1);
  }
  return {
    from: args.from,
    to: args.to,
    out: args.out ?? "./export-out",
  };
}

async function main() {
  const { from, to, out } = parseArgs(process.argv.slice(2));
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    console.error("Invalid --from or --to (use YYYY-MM-DD).");
    process.exit(1);
  }

  const outDir = resolve(process.cwd(), out);
  mkdirSync(outDir, { recursive: true });

  const casesCsv = await exportCasesCsv(fromDate, toDate);
  const auditCsv = await exportAuditLogsCsv(fromDate, toDate);

  const casesPath = resolve(outDir, "cases.csv");
  const auditPath = resolve(outDir, "audit-logs.csv");
  writeFileSync(casesPath, casesCsv, "utf8");
  writeFileSync(auditPath, auditCsv, "utf8");

  console.log(`Wrote ${casesPath}`);
  console.log(`Wrote ${auditPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
