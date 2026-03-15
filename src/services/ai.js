import {
  buildFallbackDuplicateResult,
  buildFallbackPriorityExplanation,
  buildFallbackTitleSummary
} from "../../lib/ai/fallbacks.js";

async function postAi(pathname, payload, fallbackFactory) {
  try {
    const response = await fetch(pathname, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return fallbackFactory(payload);
    }

    const data = await response.json();
    return data && typeof data === "object" ? data : fallbackFactory(payload);
  } catch {
    return fallbackFactory(payload);
  }
}

export function requestDuplicateCheck(payload) {
  return postAi("/api/ai/duplicate-check", payload, buildFallbackDuplicateResult);
}

export function requestTitleSummary(payload) {
  return postAi("/api/ai/title-summary", payload, buildFallbackTitleSummary);
}

export function requestPriorityExplanation(payload) {
  return postAi("/api/ai/priority-explanation", payload, buildFallbackPriorityExplanation);
}
