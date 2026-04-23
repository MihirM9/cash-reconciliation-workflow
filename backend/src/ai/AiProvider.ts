import type { AiSuggestion, CaseType } from "@sec-workflow/shared";

export interface AiProviderInput {
  caseType: CaseType;
  inputs: Record<string, unknown>;
}

export interface AiProvider {
  suggest(input: AiProviderInput): Promise<AiSuggestion>;
}
