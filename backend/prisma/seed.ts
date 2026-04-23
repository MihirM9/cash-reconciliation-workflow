import { PrismaClient } from "@prisma/client";
import type {
  RulesConfig,
  SlaConfig,
  CashReconciliationInputs,
  AiSuggestion,
  ReviewerDecision,
} from "@sec-workflow/shared";

const prisma = new PrismaClient();

function isoDaysAgo(days: number, hours = 9, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function dueAtFor(date: Date, dueTimeOfDay: string): Date {
  const [h, m, s] = dueTimeOfDay.split(":").map((n) => parseInt(n, 10));
  const due = new Date(date);
  due.setHours(h ?? 16, m ?? 0, s ?? 0, 0);
  return due;
}

async function main() {
  console.log("Seeding database...");

  await prisma.auditLog.deleteMany();
  await prisma.case.deleteMany();
  await prisma.caseType.deleteMany();
  await prisma.user.deleteMany();

  const analyst = await prisma.user.create({
    data: {
      name: "Ava Analyst",
      email: "ava.analyst@fund.example",
      role: "ANALYST",
    },
  });
  const ops = await prisma.user.create({
    data: {
      name: "Omar Ops",
      email: "omar.ops@fund.example",
      role: "OPS",
    },
  });
  const cco = await prisma.user.create({
    data: {
      name: "Casey CCO",
      email: "casey.cco@fund.example",
      role: "CCO",
    },
  });
  const admin = await prisma.user.create({
    data: {
      name: "Alex Admin",
      email: "alex.admin@fund.example",
      role: "ADMIN",
    },
  });
  // Mark `admin` as used to keep strict TS linters happy in seed script.
  void admin;

  const rulesConfig: RulesConfig = {
    varianceTolerance: 1000.0,
    requiredInputs: [
      { name: "bankBalance", label: "Bank balance", type: "number", required: true },
      { name: "ledgerBalance", label: "Ledger balance", type: "number", required: true },
      { name: "variance", label: "Variance (bank - ledger)", type: "number", required: true },
      { name: "recFilePath", label: "Reconciliation evidence file", type: "file", required: false },
    ],
    requiredEvidence: ["rec_file"],
    escalationCriteria: [
      "variance_exceeds_tolerance",
      "missing_required_input",
      "missing_required_evidence",
    ],
    aiModel: process.env.AI_MODEL ?? "gpt-4o-mini",
  };

  const slaConfig: SlaConfig = {
    dueTimeOfDay: "16:00:00",
    maxCompletionDelayMinutes: 0,
    defaultReviewerRole: "OPS",
  };

  const caseType = await prisma.caseType.create({
    data: {
      name: "CASH_RECONCILIATION",
      description:
        "Daily cash reconciliation between bank balance and fund ledger balance.",
      rulesConfig: JSON.stringify(rulesConfig),
      slaConfig: JSON.stringify(slaConfig),
    },
  });

  // --- Case 1: OPEN, on-time, no AI suggestion yet ---
  const case1Date = isoDaysAgo(0, 9, 15);
  const case1Inputs: CashReconciliationInputs = {
    bankBalance: 10_250_000.0,
    ledgerBalance: 10_249_850.0,
    variance: 150.0,
    recFilePath: "/storage/evidence/rec-today.pdf",
  };
  const case1 = await prisma.case.create({
    data: {
      caseTypeId: caseType.id,
      businessDate: case1Date,
      status: "OPEN",
      createdByUserId: analyst.id,
      inputs: JSON.stringify(case1Inputs),
      dueAt: dueAtFor(case1Date, slaConfig.dueTimeOfDay),
    },
  });
  await prisma.auditLog.create({
    data: {
      caseId: case1.id,
      actorType: "USER",
      actorId: analyst.id,
      actionType: "CASE_CREATED",
      details: JSON.stringify({
        inputs: case1Inputs,
        caseTypeName: caseType.name,
        dueAt: dueAtFor(case1Date, slaConfig.dueTimeOfDay).toISOString(),
      }),
    },
  });

  // --- Case 2: UNDER_REVIEW, AI suggested OK, awaiting reviewer ---
  const case2Date = isoDaysAgo(1, 9, 10);
  const case2Inputs: CashReconciliationInputs = {
    bankBalance: 10_400_000.0,
    ledgerBalance: 10_399_800.0,
    variance: 200.0,
    recFilePath: "/storage/evidence/rec-yesterday.pdf",
  };
  const case2Ai: AiSuggestion = {
    suggestedStatus: "OK",
    explanation:
      "Variance of $200.00 is within the $1,000.00 tolerance. Required evidence file is present. No escalation criteria met.",
    modelName: rulesConfig.aiModel,
    runId: "seed-run-case-2",
    generatedAt: isoDaysAgo(1, 9, 20).toISOString(),
  };
  const case2 = await prisma.case.create({
    data: {
      caseTypeId: caseType.id,
      businessDate: case2Date,
      status: "UNDER_REVIEW",
      createdByUserId: analyst.id,
      inputs: JSON.stringify(case2Inputs),
      aiSuggestion: JSON.stringify(case2Ai),
      dueAt: dueAtFor(case2Date, slaConfig.dueTimeOfDay),
    },
  });
  await prisma.auditLog.createMany({
    data: [
      {
        caseId: case2.id,
        actorType: "USER",
        actorId: analyst.id,
        actionType: "CASE_CREATED",
        details: JSON.stringify({ inputs: case2Inputs, caseTypeName: caseType.name }),
      },
      {
        caseId: case2.id,
        actorType: "AI",
        actorId: null,
        actionType: "AI_SUGGESTION_GENERATED",
        details: JSON.stringify({
          aiSuggestion: case2Ai,
          rulesSnapshot: rulesConfig,
        }),
      },
    ],
  });

  // --- Case 3: APPROVED, on-time, AI OK + reviewer APPROVED ---
  const case3Date = isoDaysAgo(2, 9, 5);
  const case3Inputs: CashReconciliationInputs = {
    bankBalance: 10_120_000.0,
    ledgerBalance: 10_120_050.0,
    variance: -50.0,
    recFilePath: "/storage/evidence/rec-2d.pdf",
  };
  const case3Ai: AiSuggestion = {
    suggestedStatus: "OK",
    explanation:
      "Variance of -$50.00 is within tolerance. Evidence present. No escalation criteria triggered.",
    modelName: rulesConfig.aiModel,
    runId: "seed-run-case-3",
    generatedAt: isoDaysAgo(2, 9, 30).toISOString(),
  };
  const case3Decision: ReviewerDecision = {
    finalStatus: "APPROVED",
    decisionNote: "Variance nominal; timing difference on one wire. Approved.",
    decidedAt: isoDaysAgo(2, 14, 30).toISOString(),
  };
  const case3 = await prisma.case.create({
    data: {
      caseTypeId: caseType.id,
      businessDate: case3Date,
      status: "APPROVED",
      createdByUserId: analyst.id,
      reviewerUserId: ops.id,
      inputs: JSON.stringify(case3Inputs),
      aiSuggestion: JSON.stringify(case3Ai),
      reviewerDecision: JSON.stringify(case3Decision),
      dueAt: dueAtFor(case3Date, slaConfig.dueTimeOfDay),
    },
  });
  await prisma.auditLog.createMany({
    data: [
      {
        caseId: case3.id,
        actorType: "USER",
        actorId: analyst.id,
        actionType: "CASE_CREATED",
        details: JSON.stringify({ inputs: case3Inputs, caseTypeName: caseType.name }),
      },
      {
        caseId: case3.id,
        actorType: "AI",
        actorId: null,
        actionType: "AI_SUGGESTION_GENERATED",
        details: JSON.stringify({ aiSuggestion: case3Ai, rulesSnapshot: rulesConfig }),
      },
      {
        caseId: case3.id,
        actorType: "USER",
        actorId: ops.id,
        actionType: "DECISION_MADE",
        details: JSON.stringify({
          finalStatus: case3Decision.finalStatus,
          decisionNote: case3Decision.decisionNote,
          decidedAt: case3Decision.decidedAt,
        }),
      },
    ],
  });

  // --- Case 4: ESCALATED, AI recommended ESCALATE, CCO escalated ---
  const case4Date = isoDaysAgo(3, 9, 15);
  const case4Inputs: CashReconciliationInputs = {
    bankBalance: 10_050_000.0,
    ledgerBalance: 10_038_400.0,
    variance: 11_600.0,
    recFilePath: "/storage/evidence/rec-3d.pdf",
  };
  const case4Ai: AiSuggestion = {
    suggestedStatus: "ESCALATE",
    explanation:
      "Variance of $11,600.00 exceeds the $1,000.00 tolerance (escalation criterion: variance_exceeds_tolerance). Recommend escalation and fund admin inquiry.",
    modelName: rulesConfig.aiModel,
    runId: "seed-run-case-4",
    generatedAt: isoDaysAgo(3, 9, 45).toISOString(),
  };
  const case4Decision: ReviewerDecision = {
    finalStatus: "ESCALATED",
    decisionNote:
      "Confirmed unexplained variance > tolerance. Escalated to CFO; opened ticket with fund administrator.",
    decidedAt: isoDaysAgo(3, 13, 10).toISOString(),
  };
  const case4 = await prisma.case.create({
    data: {
      caseTypeId: caseType.id,
      businessDate: case4Date,
      status: "ESCALATED",
      createdByUserId: analyst.id,
      reviewerUserId: cco.id,
      inputs: JSON.stringify(case4Inputs),
      aiSuggestion: JSON.stringify(case4Ai),
      reviewerDecision: JSON.stringify(case4Decision),
      dueAt: dueAtFor(case4Date, slaConfig.dueTimeOfDay),
    },
  });
  await prisma.auditLog.createMany({
    data: [
      {
        caseId: case4.id,
        actorType: "USER",
        actorId: analyst.id,
        actionType: "CASE_CREATED",
        details: JSON.stringify({ inputs: case4Inputs, caseTypeName: caseType.name }),
      },
      {
        caseId: case4.id,
        actorType: "AI",
        actorId: null,
        actionType: "AI_SUGGESTION_GENERATED",
        details: JSON.stringify({ aiSuggestion: case4Ai, rulesSnapshot: rulesConfig }),
      },
      {
        caseId: case4.id,
        actorType: "USER",
        actorId: cco.id,
        actionType: "DECISION_MADE",
        details: JSON.stringify({
          finalStatus: case4Decision.finalStatus,
          decisionNote: case4Decision.decisionNote,
          decidedAt: case4Decision.decidedAt,
        }),
      },
    ],
  });

  // --- Case 5: APPROVED but SLA BREACHED (decision after dueAt) ---
  const case5Date = isoDaysAgo(4, 9, 0);
  const case5Due = dueAtFor(case5Date, slaConfig.dueTimeOfDay);
  const case5Inputs: CashReconciliationInputs = {
    bankBalance: 9_980_000.0,
    ledgerBalance: 9_979_600.0,
    variance: 400.0,
    recFilePath: "/storage/evidence/rec-4d.pdf",
  };
  const case5Ai: AiSuggestion = {
    suggestedStatus: "OK",
    explanation:
      "Variance of $400.00 is within tolerance. No escalation criteria triggered.",
    modelName: rulesConfig.aiModel,
    runId: "seed-run-case-5",
    generatedAt: isoDaysAgo(4, 10, 0).toISOString(),
  };
  // Decided at 18:45 local — after 16:00 due time => SLA breach.
  const case5DecidedAt = (() => {
    const d = new Date(case5Date);
    d.setHours(18, 45, 0, 0);
    return d;
  })();
  const case5Decision: ReviewerDecision = {
    finalStatus: "APPROVED",
    decisionNote:
      "Reviewed late due to delayed custodian statement; variance nominal. SLA breach noted and logged.",
    decidedAt: case5DecidedAt.toISOString(),
  };
  const case5 = await prisma.case.create({
    data: {
      caseTypeId: caseType.id,
      businessDate: case5Date,
      status: "APPROVED",
      createdByUserId: analyst.id,
      reviewerUserId: ops.id,
      inputs: JSON.stringify(case5Inputs),
      aiSuggestion: JSON.stringify(case5Ai),
      reviewerDecision: JSON.stringify(case5Decision),
      dueAt: case5Due,
      slaBreached: true,
    },
  });
  await prisma.auditLog.createMany({
    data: [
      {
        caseId: case5.id,
        actorType: "USER",
        actorId: analyst.id,
        actionType: "CASE_CREATED",
        details: JSON.stringify({ inputs: case5Inputs, caseTypeName: caseType.name }),
      },
      {
        caseId: case5.id,
        actorType: "AI",
        actorId: null,
        actionType: "AI_SUGGESTION_GENERATED",
        details: JSON.stringify({ aiSuggestion: case5Ai, rulesSnapshot: rulesConfig }),
      },
      {
        caseId: case5.id,
        actorType: "USER",
        actorId: ops.id,
        actionType: "DECISION_MADE",
        details: JSON.stringify({
          finalStatus: case5Decision.finalStatus,
          decisionNote: case5Decision.decisionNote,
          decidedAt: case5Decision.decidedAt,
        }),
      },
      {
        caseId: case5.id,
        actorType: "SYSTEM",
        actorId: null,
        actionType: "SLA_BREACH_RECORDED",
        details: JSON.stringify({
          dueAt: case5Due.toISOString(),
          decidedAt: case5DecidedAt.toISOString(),
          delayMinutes: Math.floor(
            (case5DecidedAt.getTime() - case5Due.getTime()) / 60000,
          ),
        }),
      },
    ],
  });

  console.log("Seed complete:");
  console.log(`  Users: 4 (analyst=${analyst.id}, ops=${ops.id}, cco=${cco.id})`);
  console.log(`  CaseType: ${caseType.name} (${caseType.id})`);
  console.log(`  Cases: 5`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
