import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { AiResponseSchema } from "@sec-workflow/shared";
import type { AiSuggestion } from "@sec-workflow/shared";
import type { AiProvider, AiProviderInput } from "./AiProvider.js";
import { env } from "../env.js";
import { HttpError } from "../middleware/errorHandler.js";

const SYSTEM_PROMPT = `You are a compliance-aware reconciliation assistant for a SEC-registered investment adviser.

You receive:
- A CaseType describing rules (variance tolerance, required inputs, required evidence, escalation criteria).
- Inputs for a specific case (e.g., bank balance, ledger balance, variance, evidence path).

You must produce a STRICT JSON response with exactly this shape:
{"suggestedStatus": "OK" | "ESCALATE", "explanation": "<short plain-English rationale>"}

Rules:
- You are ADVISORY ONLY. You never make the final decision.
- Escalate if any escalationCriteria condition is met (e.g., variance exceeds tolerance, missing required input, missing required evidence).
- Keep explanations concise (1-3 sentences). Cite specific numbers and which rule was applied.
- Do NOT include markdown, code fences, or any keys other than suggestedStatus and explanation.`;

export class OpenAiProvider implements AiProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async suggest(input: AiProviderInput): Promise<AiSuggestion> {
    const userPayload = {
      caseType: {
        name: input.caseType.name,
        description: input.caseType.description,
        rulesConfig: input.caseType.rulesConfig,
      },
      inputs: input.inputs,
    };

    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new HttpError(
        502,
        `AI provider returned non-JSON content: ${content.slice(0, 200)}`,
      );
    }
    const validated = AiResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new HttpError(
        502,
        `AI response failed schema validation: ${validated.error.message}`,
      );
    }

    return {
      suggestedStatus: validated.data.suggestedStatus,
      explanation: validated.data.explanation,
      modelName: this.model,
      runId: completion.id ?? randomUUID(),
      generatedAt: new Date().toISOString(),
    };
  }
}

export function makeOpenAiProvider(): OpenAiProvider {
  if (!env.OPENAI_API_KEY) {
    throw new HttpError(
      503,
      "OPENAI_API_KEY is not configured. Set it in backend/.env to enable AI suggestions.",
    );
  }
  return new OpenAiProvider(env.OPENAI_API_KEY, env.AI_MODEL);
}
