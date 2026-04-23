import type { AiProvider } from "./AiProvider.js";
import { makeOpenAiProvider } from "./openaiProvider.js";
import { RuleBasedProvider } from "./ruleBasedProvider.js";
import { env } from "../env.js";

let cached: AiProvider | null = null;

/**
 * Returns the configured AI provider. If `OPENAI_API_KEY` is set we use the
 * OpenAI provider; otherwise we fall back to a deterministic rule-based
 * stand-in so the demo works offline. The audit trail records which provider
 * was used (via `modelName`), so examiners can tell them apart after the fact.
 */
export function getAiProvider(): AiProvider {
  if (cached) return cached;
  if (env.OPENAI_API_KEY) {
    cached = makeOpenAiProvider();
    console.log(`[ai] using OpenAI provider (model=${env.AI_MODEL})`);
  } else {
    cached = new RuleBasedProvider();
    console.log("[ai] OPENAI_API_KEY not set — using deterministic rule-based provider");
  }
  return cached;
}

export type { AiProvider } from "./AiProvider.js";
