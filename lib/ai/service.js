import {
  buildFallbackDuplicateResult,
  buildFallbackOnboardingAssistant,
  buildFallbackPriorityExplanation,
  buildFallbackTitleSummary
} from "./fallbacks.js";
import { requestGroqJson } from "./groq.js";
import {
  buildDuplicateCheckPrompt,
  buildOnboardingAssistantPrompt,
  buildPriorityExplanationPrompt,
  buildTitleSummaryPrompt
} from "./prompts.js";
import {
  normalizeDuplicateResponse,
  normalizeOnboardingResponse,
  normalizePriorityResponse,
  normalizeTitleSummaryResponse
} from "./types.js";

export async function runDuplicateCheck(input = {}, options = {}) {
  const fallback = buildFallbackDuplicateResult(input);
  const result = await requestGroqJson({
    prompt: buildDuplicateCheckPrompt(input),
    maxTokens: 220,
    timeoutMs: 7000,
    env: options.env
  });

  if (!result.ok) {
    return {
      ...fallback,
      aiError: result.errorCode || "unknown_error"
    };
  }

  return normalizeDuplicateResponse(result.data, fallback);
}

export async function runTitleSummary(input = {}, options = {}) {
  const fallback = buildFallbackTitleSummary(input);
  const result = await requestGroqJson({
    prompt: buildTitleSummaryPrompt(input),
    maxTokens: 180,
    timeoutMs: 7000,
    env: options.env
  });

  if (!result.ok) {
    return {
      ...fallback,
      aiError: result.errorCode || "unknown_error"
    };
  }

  return normalizeTitleSummaryResponse(result.data, fallback);
}

export async function runPriorityExplanation(input = {}, options = {}) {
  const fallback = buildFallbackPriorityExplanation(input);
  const result = await requestGroqJson({
    prompt: buildPriorityExplanationPrompt(input),
    maxTokens: 140,
    timeoutMs: 7000,
    env: options.env
  });

  if (!result.ok) {
    return {
      ...fallback,
      aiError: result.errorCode || "unknown_error"
    };
  }

  return normalizePriorityResponse(result.data, fallback);
}

export async function runOnboardingAssistant(input = {}, options = {}) {
  const fallback = buildFallbackOnboardingAssistant(input);
  const result = await requestGroqJson({
    prompt: buildOnboardingAssistantPrompt(input),
    maxTokens: 220,
    timeoutMs: 7000,
    env: options.env
  });

  if (!result.ok) {
    return {
      ...fallback,
      aiError: result.errorCode || "unknown_error"
    };
  }

  return normalizeOnboardingResponse(result.data, fallback);
}
