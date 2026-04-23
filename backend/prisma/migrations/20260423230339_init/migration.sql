-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CaseType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rulesConfig" TEXT NOT NULL,
    "slaConfig" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseTypeId" TEXT NOT NULL,
    "businessDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "inputs" TEXT NOT NULL,
    "aiSuggestion" TEXT,
    "reviewerDecision" TEXT,
    "dueAt" DATETIME NOT NULL,
    "slaBreached" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Case_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actionType" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    CONSTRAINT "AuditLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CaseType_name_key" ON "CaseType"("name");

-- CreateIndex
CREATE INDEX "Case_businessDate_idx" ON "Case"("businessDate");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_caseTypeId_idx" ON "Case"("caseTypeId");

-- CreateIndex
CREATE INDEX "AuditLog_caseId_timestamp_idx" ON "AuditLog"("caseId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
