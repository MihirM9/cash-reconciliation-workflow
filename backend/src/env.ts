import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL", "file:./dev.db"),
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  AI_MODEL: process.env.AI_MODEL ?? "gpt-4o-mini",
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
};
