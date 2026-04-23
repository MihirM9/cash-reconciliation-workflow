import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { caseTypesRouter } from "./routes/caseTypes.js";
import { casesRouter } from "./routes/cases.js";
import { auditLogsRouter } from "./routes/auditLogs.js";
import { exportsRouter } from "./routes/exports.js";
import { usersRouter } from "./routes/users.js";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
    allowedHeaders: ["Content-Type", "x-user-id"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(authMiddleware);

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use("/users", usersRouter);
app.use("/case-types", caseTypesRouter);
app.use("/cases", casesRouter);
app.use("/audit-logs", auditLogsRouter);
app.use("/export", exportsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(
    `[sec-workflow] backend listening on http://localhost:${env.PORT}`,
  );
});
