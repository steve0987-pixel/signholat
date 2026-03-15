import { buildFallbackDuplicateResult, buildFallbackPriorityExplanation, buildFallbackTitleSummary } from "./fallbacks.js";
import { requestGroqJson } from "./groq.js";
import { buildDuplicateCheckPrompt, buildPriorityExplanationPrompt, buildTitleSummaryPrompt } from "./prompts.js";
import { normalizeDuplicateResponse, normalizePriorityResponse, normalizeTitleSummaryResponse } from "./types.js";

export async function runDuplicateCheck(input = {}, options = {}) {
  const fallback = buildFallbackDuplicateResult(input);
  const result = await requestGroqJson({
    prompt: buildDuplicateCheckPrompt(input),
    maxTokens: 220,
    timeoutMs: 7000,
    env: options.env
  });

  if (!result.ok) {
    return fallback;
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
    return fallback;
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
    return fallback;
  }

  return normalizePriorityResponse(result.data, fallback);
}
