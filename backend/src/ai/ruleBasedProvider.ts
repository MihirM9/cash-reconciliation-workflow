import { randomUUID } from "node:crypto";
import type { AiSuggestion } from "@sec-workflow/shared";
import type { AiProvider, AiProviderInput } from "./AiProvider.js";

/**
 * Deterministic, no-network stand-in for an LLM. Evaluates the CaseType's
 * rulesConfig (variance tolerance, required inputs, required evidence) against
 * the case inputs and returns a suggestion in the exact same shape the OpenAI
 * provider would return. Useful for offline demos, deterministic tests, and
 * for running the walkthrough without an API key.
 *
 * `modelName` is prefixed with "rule-based:" so the audit trail is explicit
 * that this suggestion did not come from an LLM.
 */
export class RuleBasedProvider implements AiProvider {
  async suggest(input: AiProviderInput): Promise<AiSuggestion> {
    const { caseType, inputs } = input;
    const rules = caseType.rulesConfig;
    const reasons: string[] = [];

    for (const field of rules.requiredInputs) {
      if (!field.required) continue;
      const v = inputs[field.name];
      if (v === undefined || v === null || v === "") {
        reasons.push(`missing required input "${field.name}"`);
      }
    }

    for (const evidenceKey of rules.requiredEvidence) {
      const maybePath = inputs[
        evidenceKey === "rec_file" ? "recFilePath" : evidenceKey
      ];
      if (!maybePath) {
        reasons.push(`missing required evidence "${evidenceKey}"`);
      }
    }

    const variance = inputs.variance;
    if (typeof variance === "number") {
      if (Math.abs(variance) > rules.varianceTolerance) {
        reasons.push(
          `variance of ${variance.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })} exceeds tolerance of ${rules.varianceTolerance.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}`,
        );
      }
    }

    const suggestedStatus = reasons.length > 0 ? "ESCALATE" : "OK";
    const explanation =
      suggestedStatus === "ESCALATE"
        ? `Escalation recommended: ${reasons.join("; ")}.`
        : typeof variance === "number"
          ? `Variance of ${variance.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })} is within the ${rules.varianceTolerance.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })} tolerance. Required inputs and evidence are present. No escalation criteria triggered.`
          : "No escalation criteria triggered against the configured rule set.";

    return {
      suggestedStatus,
      explanation,
      modelName: `rule-based:${caseType.name}`,
      runId: randomUUID(),
      generatedAt: new Date().toISOString(),
    };
  }
}
