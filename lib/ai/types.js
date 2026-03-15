/**
 * @typedef {"confirm_existing" | "create_new"} DuplicateSuggestedAction
 */

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clipText(value, maxLength) {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function normalizeConfidence(value, fallback = 0.18) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

export function normalizeDuplicateResponse(payload, fallback) {
  const suggestedAction = payload?.suggestedAction === "confirm_existing" ? "confirm_existing" : "create_new";

  return {
    isDuplicate: Boolean(payload?.isDuplicate),
    matchedIssueId: payload?.matchedIssueId ? String(payload.matchedIssueId) : null,
    confidence: normalizeConfidence(payload?.confidence, fallback.confidence),
    reason: clipText(payload?.reason || fallback.reason, 140) || fallback.reason,
    suggestedAction,
    fallbackUsed: false
  };
}

export function normalizeTitleSummaryResponse(payload, fallback) {
  return {
    aiTitle: clipText(payload?.aiTitle || fallback.aiTitle, 64) || fallback.aiTitle,
    summary: clipText(payload?.summary || fallback.summary, 140) || fallback.summary,
    fallbackUsed: false
  };
}

export function normalizePriorityResponse(payload, fallback) {
  return {
    priorityExplanation:
      clipText(payload?.priorityExplanation || fallback.priorityExplanation, 140) || fallback.priorityExplanation,
    fallbackUsed: false
  };
}
